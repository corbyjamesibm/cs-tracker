"""
Adaptive Learning Service

Handles feedback collection, effectiveness calculation, and weight adjustment
for the recommendation system. Learns from advisor actions to improve
recommendation quality over time.
"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.learning import (
    RecommendationFeedback, MappingEffectiveness, WeightAdjustmentHistory,
    LearningConfig, LEARNING_CONFIG_DEFAULTS
)
from app.models.mapping import DimensionUseCaseMapping, RoadmapRecommendation


class AdaptiveLearningService:
    """
    Service for adaptive learning based on advisor feedback.

    Key responsibilities:
    - Record feedback from advisor actions
    - Calculate mapping effectiveness scores
    - Adjust weights based on feedback patterns
    - Maintain audit trail of all changes
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._config_cache: Dict[str, any] = {}

    # ============================================================
    # CONFIGURATION MANAGEMENT
    # ============================================================

    async def get_config(self, key: str) -> any:
        """Get a configuration value, with caching."""
        if key in self._config_cache:
            return self._config_cache[key]

        result = await self.db.execute(
            select(LearningConfig).where(LearningConfig.key == key)
        )
        config = result.scalar_one_or_none()

        if config:
            value = self._parse_config_value(config.value, config.value_type)
        elif key in LEARNING_CONFIG_DEFAULTS:
            default = LEARNING_CONFIG_DEFAULTS[key]
            value = self._parse_config_value(default["value"], default["type"])
        else:
            value = None

        self._config_cache[key] = value
        return value

    def _parse_config_value(self, value: str, value_type: str) -> any:
        """Parse config value based on type."""
        if value_type == "int":
            return int(value)
        elif value_type == "float":
            return float(value)
        elif value_type == "bool":
            return value.lower() in ("true", "1", "yes")
        elif value_type == "json":
            import json
            return json.loads(value)
        return value

    async def initialize_config(self) -> None:
        """Initialize default configuration values if not present."""
        for key, default in LEARNING_CONFIG_DEFAULTS.items():
            existing = await self.db.execute(
                select(LearningConfig).where(LearningConfig.key == key)
            )
            if not existing.scalar_one_or_none():
                config = LearningConfig(
                    key=key,
                    value=default["value"],
                    value_type=default["type"],
                    description=default["description"]
                )
                self.db.add(config)
        await self.db.flush()

    # ============================================================
    # FEEDBACK RECORDING
    # ============================================================

    async def record_feedback(
        self,
        recommendation_id: int,
        action: str,
        advisor_id: int,
        quality_rating: Optional[int] = None,
        thumbs_feedback: Optional[bool] = None,
        dismiss_reason_category: Optional[str] = None,
        feedback_reason: Optional[str] = None
    ) -> RecommendationFeedback:
        """
        Record feedback for a recommendation.

        Args:
            recommendation_id: The recommendation being rated
            action: 'accept', 'dismiss', or 'rating'
            advisor_id: User who provided feedback
            quality_rating: 1-5 star rating (optional)
            thumbs_feedback: True=up, False=down (optional)
            dismiss_reason_category: Reason for dismiss (if action='dismiss')
            feedback_reason: Free text reason (optional)

        Returns:
            The created feedback record
        """
        # Get recommendation for context
        recommendation = await self.db.get(RoadmapRecommendation, recommendation_id)
        if not recommendation:
            raise ValueError(f"Recommendation {recommendation_id} not found")

        # Create feedback record
        feedback = RecommendationFeedback(
            recommendation_id=recommendation_id,
            action=action,
            quality_rating=quality_rating,
            thumbs_feedback=thumbs_feedback,
            dismiss_reason_category=dismiss_reason_category,
            feedback_reason=feedback_reason,
            advisor_id=advisor_id,
            priority_score_at_feedback=recommendation.priority_score,
            dimension_score_at_feedback=recommendation.dimension_score
        )
        self.db.add(feedback)

        # Update recommendation with feedback info
        if quality_rating:
            recommendation.quality_rating = quality_rating
            recommendation.rated_at = datetime.utcnow()
            recommendation.rated_by_id = advisor_id

        if action == 'dismiss':
            recommendation.dismissed_at = datetime.utcnow()
            recommendation.dismissed_by_id = advisor_id
            recommendation.dismiss_reason = dismiss_reason_category

        await self.db.flush()
        await self.db.refresh(feedback)

        # Update effectiveness metrics for the mapping
        await self._update_effectiveness_on_feedback(recommendation, feedback)

        return feedback

    async def _update_effectiveness_on_feedback(
        self,
        recommendation: RoadmapRecommendation,
        feedback: RecommendationFeedback
    ) -> None:
        """Update MappingEffectiveness when new feedback is recorded."""
        # Find the mapping for this recommendation
        mapping_query = select(DimensionUseCaseMapping).where(
            DimensionUseCaseMapping.use_case_id == recommendation.use_case_id
        )
        result = await self.db.execute(mapping_query)
        mappings = result.scalars().all()

        for mapping in mappings:
            # Get or create effectiveness record
            eff_result = await self.db.execute(
                select(MappingEffectiveness).where(
                    MappingEffectiveness.mapping_id == mapping.id
                )
            )
            effectiveness = eff_result.scalar_one_or_none()

            if not effectiveness:
                effectiveness = MappingEffectiveness(
                    mapping_id=mapping.id,
                    total_recommendations=0,
                    accept_count=0,
                    dismiss_count=0,
                    rating_count=0,
                    thumbs_up_count=0,
                    thumbs_down_count=0,
                    total_rating_sum=0.0,
                    weighted_rating_sum=0.0
                )
                self.db.add(effectiveness)

            # Update counts
            effectiveness.total_recommendations += 1

            if feedback.action == 'accept':
                effectiveness.accept_count += 1
            elif feedback.action == 'dismiss':
                effectiveness.dismiss_count += 1

            if feedback.quality_rating:
                effectiveness.rating_count += 1
                effectiveness.total_rating_sum += feedback.quality_rating

            if feedback.thumbs_feedback is True:
                effectiveness.thumbs_up_count += 1
            elif feedback.thumbs_feedback is False:
                effectiveness.thumbs_down_count += 1

            # Recalculate derived metrics
            await self._recalculate_effectiveness_metrics(effectiveness)

        await self.db.flush()

    async def _recalculate_effectiveness_metrics(
        self,
        effectiveness: MappingEffectiveness
    ) -> None:
        """Recalculate derived metrics for a MappingEffectiveness record."""
        # Accept rate
        total_actions = effectiveness.accept_count + effectiveness.dismiss_count
        if total_actions > 0:
            effectiveness.accept_rate = effectiveness.accept_count / total_actions
        else:
            effectiveness.accept_rate = 0.5  # Default

        # Average rating
        if effectiveness.rating_count > 0:
            effectiveness.average_rating = effectiveness.total_rating_sum / effectiveness.rating_count
        else:
            effectiveness.average_rating = 3.0  # Default

        # Thumbs ratio
        total_thumbs = effectiveness.thumbs_up_count + effectiveness.thumbs_down_count
        if total_thumbs > 0:
            thumbs_ratio = effectiveness.thumbs_up_count / total_thumbs
        else:
            thumbs_ratio = 0.5  # Default

        # Calculate effectiveness score
        # 40% accept rate + 50% normalized rating + 10% thumbs ratio
        normalized_rating = (effectiveness.average_rating - 1) / 4  # Maps 1-5 to 0-1
        effectiveness.effectiveness_score = (
            0.4 * effectiveness.accept_rate +
            0.5 * normalized_rating +
            0.1 * thumbs_ratio
        )

        # Calculate confidence level
        total_feedback = effectiveness.accept_count + effectiveness.dismiss_count + effectiveness.rating_count
        if total_feedback > 0:
            # Logarithmic scaling - reaches 1.0 at ~100 feedback events
            sample_confidence = min(1.0, math.log10(total_feedback + 1) / math.log10(100))

            # Apply recency factor (simplified - full implementation would weight individual feedbacks)
            recency_factor = await self._calculate_recency_factor(effectiveness.mapping_id)
            effectiveness.confidence_level = sample_confidence * recency_factor
        else:
            effectiveness.confidence_level = 0.0

        effectiveness.last_calculated_at = datetime.utcnow()

    async def _calculate_recency_factor(self, mapping_id: int) -> float:
        """Calculate recency factor based on feedback ages."""
        half_life_days = await self.get_config("recency_decay_half_life_days")

        # Get recent feedback for this mapping's use cases
        feedback_query = select(RecommendationFeedback).join(
            RoadmapRecommendation,
            RecommendationFeedback.recommendation_id == RoadmapRecommendation.id
        ).join(
            DimensionUseCaseMapping,
            and_(
                DimensionUseCaseMapping.use_case_id == RoadmapRecommendation.use_case_id,
                DimensionUseCaseMapping.id == mapping_id
            )
        ).order_by(RecommendationFeedback.created_at.desc()).limit(50)

        result = await self.db.execute(feedback_query)
        feedbacks = result.scalars().all()

        if not feedbacks:
            return 1.0

        # Calculate weighted average recency
        now = datetime.utcnow()
        total_weight = 0.0
        count = 0

        for fb in feedbacks:
            age_days = (now - fb.created_at).days
            weight = 0.5 ** (age_days / half_life_days)
            total_weight += weight
            count += 1

        if count > 0:
            return total_weight / count
        return 1.0

    # ============================================================
    # WEIGHT CALCULATION
    # ============================================================

    async def calculate_effectiveness_score(
        self,
        mapping_id: int
    ) -> Tuple[float, float]:
        """
        Calculate effectiveness score for a mapping.

        Returns:
            Tuple of (effectiveness_score, confidence_level)
        """
        result = await self.db.execute(
            select(MappingEffectiveness).where(
                MappingEffectiveness.mapping_id == mapping_id
            )
        )
        effectiveness = result.scalar_one_or_none()

        if not effectiveness:
            cold_start_weight = await self.get_config("cold_start_weight")
            return (cold_start_weight, 0.0)

        return (effectiveness.effectiveness_score, effectiveness.confidence_level)

    async def calculate_new_weight(
        self,
        mapping_id: int,
        current_weight: float
    ) -> Tuple[float, str, bool]:
        """
        Calculate new weight based on effectiveness.

        Args:
            mapping_id: The mapping to calculate for
            current_weight: Current impact_weight value

        Returns:
            Tuple of (new_weight, explanation, should_apply)
        """
        effectiveness_score, confidence = await self.calculate_effectiveness_score(mapping_id)

        min_feedback = await self.get_config("min_feedback_for_adjustment")
        confidence_threshold = await self.get_config("confidence_threshold")
        max_change = await self.get_config("max_weight_change_per_cycle")

        # Get effectiveness record for feedback count
        result = await self.db.execute(
            select(MappingEffectiveness).where(
                MappingEffectiveness.mapping_id == mapping_id
            )
        )
        effectiveness = result.scalar_one_or_none()
        feedback_count = 0
        if effectiveness:
            feedback_count = effectiveness.accept_count + effectiveness.dismiss_count + effectiveness.rating_count

        # Check minimum feedback threshold
        if feedback_count < min_feedback:
            return (
                current_weight,
                f"Insufficient feedback ({feedback_count} < {min_feedback} required)",
                False
            )

        # Check confidence threshold
        if confidence < confidence_threshold:
            return (
                current_weight,
                f"Confidence too low ({confidence:.2f} < {confidence_threshold} required)",
                False
            )

        # Calculate target weight
        # Map effectiveness [0, 1] to weight range [0.2, 1.0]
        target_weight = 0.2 + (effectiveness_score * 0.8)

        # Calculate and cap delta
        delta = target_weight - current_weight
        capped_delta = max(-max_change, min(max_change, delta))

        new_weight = current_weight + capped_delta
        new_weight = max(0.1, min(1.0, new_weight))  # Clamp to valid range

        explanation = (
            f"Effectiveness: {effectiveness_score:.2f}, "
            f"Confidence: {confidence:.2f}, "
            f"Target: {target_weight:.2f}, "
            f"Delta: {capped_delta:+.3f}"
        )

        return (new_weight, explanation, True)

    # ============================================================
    # LEARNING CYCLE
    # ============================================================

    async def run_learning_cycle(
        self,
        mapping_ids: Optional[List[int]] = None,
        dry_run: bool = False,
        triggered_by_id: Optional[int] = None
    ) -> Dict:
        """
        Run learning cycle to adjust weights based on feedback.

        Args:
            mapping_ids: Specific mappings to process (None = all)
            dry_run: If True, preview changes without applying
            triggered_by_id: User who triggered the run (None = automatic)

        Returns:
            Summary of adjustments made/previewed
        """
        learning_enabled = await self.get_config("learning_enabled")
        if not learning_enabled and not dry_run:
            return {
                "adjustments": [],
                "total_evaluated": 0,
                "total_adjusted": 0,
                "skipped_low_confidence": 0,
                "skipped_insufficient_data": 0,
                "message": "Learning is disabled"
            }

        # Get mappings to evaluate
        query = select(DimensionUseCaseMapping).options(
            selectinload(DimensionUseCaseMapping.dimension),
            selectinload(DimensionUseCaseMapping.use_case)
        )
        if mapping_ids:
            query = query.where(DimensionUseCaseMapping.id.in_(mapping_ids))

        query = query.where(DimensionUseCaseMapping.is_learning_enabled == True)

        result = await self.db.execute(query)
        mappings = result.scalars().all()

        adjustments = []
        total_evaluated = 0
        total_adjusted = 0
        skipped_low_confidence = 0
        skipped_insufficient_data = 0

        for mapping in mappings:
            total_evaluated += 1

            new_weight, explanation, should_apply = await self.calculate_new_weight(
                mapping.id,
                mapping.impact_weight
            )

            # Track why we're skipping
            if not should_apply:
                if "Insufficient feedback" in explanation:
                    skipped_insufficient_data += 1
                elif "Confidence too low" in explanation:
                    skipped_low_confidence += 1

            # Only create adjustment if weight would actually change
            if abs(new_weight - mapping.impact_weight) > 0.001:
                adjustment = {
                    "mapping_id": mapping.id,
                    "dimension_name": mapping.dimension.name if mapping.dimension else "Unknown",
                    "use_case_name": mapping.use_case.name if mapping.use_case else "Unknown",
                    "field": "impact_weight",
                    "old_value": mapping.impact_weight,
                    "new_value": new_weight,
                    "delta": new_weight - mapping.impact_weight,
                    "explanation": explanation,
                    "would_apply": should_apply
                }
                adjustments.append(adjustment)

                if should_apply and not dry_run:
                    # Apply the adjustment
                    await self._apply_weight_adjustment(
                        mapping=mapping,
                        field="impact_weight",
                        old_value=mapping.impact_weight,
                        new_value=new_weight,
                        explanation=explanation,
                        triggered_by_id=triggered_by_id
                    )
                    total_adjusted += 1

        if not dry_run:
            await self.db.flush()

        return {
            "adjustments": adjustments,
            "total_evaluated": total_evaluated,
            "total_adjusted": total_adjusted,
            "skipped_low_confidence": skipped_low_confidence,
            "skipped_insufficient_data": skipped_insufficient_data,
            "dry_run": dry_run
        }

    async def _apply_weight_adjustment(
        self,
        mapping: DimensionUseCaseMapping,
        field: str,
        old_value: float,
        new_value: float,
        explanation: str,
        triggered_by_id: Optional[int] = None
    ) -> WeightAdjustmentHistory:
        """Apply a weight adjustment and record it in history."""
        # Get current effectiveness for context
        eff_result = await self.db.execute(
            select(MappingEffectiveness).where(
                MappingEffectiveness.mapping_id == mapping.id
            )
        )
        effectiveness = eff_result.scalar_one_or_none()

        # Create history record
        history = WeightAdjustmentHistory(
            mapping_id=mapping.id,
            field_changed=field,
            old_value=old_value,
            new_value=new_value,
            adjustment_type="automatic" if triggered_by_id is None else "manual",
            trigger_event="scheduled" if triggered_by_id is None else "admin_override",
            feedback_count_at_adjustment=effectiveness.accept_count + effectiveness.dismiss_count + effectiveness.rating_count if effectiveness else 0,
            accept_rate_at_adjustment=effectiveness.accept_rate if effectiveness else 0.5,
            average_rating_at_adjustment=effectiveness.average_rating if effectiveness else 3.0,
            confidence_level_at_adjustment=effectiveness.confidence_level if effectiveness else 0.0,
            explanation=explanation,
            triggered_by_id=triggered_by_id
        )
        self.db.add(history)

        # Update the mapping
        if field == "impact_weight":
            mapping.impact_weight = new_value
        elif field == "priority":
            mapping.priority = int(new_value)
        elif field == "threshold_score":
            mapping.threshold_score = new_value

        mapping.last_weight_update = datetime.utcnow()

        return history

    # ============================================================
    # STATISTICS & REPORTING
    # ============================================================

    async def get_learning_summary(self) -> Dict:
        """Get summary statistics for the learning system."""
        # Total feedback counts
        feedback_stats = await self.db.execute(
            select(
                func.count(RecommendationFeedback.id).label("total"),
                func.sum(func.cast(RecommendationFeedback.action == 'accept', Integer)).label("accepts"),
                func.sum(func.cast(RecommendationFeedback.action == 'dismiss', Integer)).label("dismisses"),
                func.count(RecommendationFeedback.quality_rating).label("ratings"),
                func.avg(RecommendationFeedback.quality_rating).label("avg_rating")
            )
        )
        stats = feedback_stats.first()

        # Mappings with feedback
        mappings_with_feedback = await self.db.execute(
            select(func.count(MappingEffectiveness.id)).where(
                MappingEffectiveness.total_recommendations > 0
            )
        )

        confidence_threshold = await self.get_config("confidence_threshold")
        mappings_above_threshold = await self.db.execute(
            select(func.count(MappingEffectiveness.id)).where(
                MappingEffectiveness.confidence_level >= confidence_threshold
            )
        )

        learning_enabled = await self.get_config("learning_enabled")

        return {
            "total_feedback_count": stats.total or 0,
            "total_accepts": stats.accepts or 0,
            "total_dismisses": stats.dismisses or 0,
            "total_ratings": stats.ratings or 0,
            "average_rating": float(stats.avg_rating) if stats.avg_rating else 3.0,
            "average_accept_rate": (stats.accepts or 0) / max((stats.accepts or 0) + (stats.dismisses or 0), 1),
            "mappings_with_feedback": mappings_with_feedback.scalar() or 0,
            "mappings_above_confidence_threshold": mappings_above_threshold.scalar() or 0,
            "learning_enabled": learning_enabled
        }


# Helper for SQL casting
from sqlalchemy import Integer
