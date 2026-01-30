"""
Recommendation Engine Service

Generates prioritized roadmap recommendations based on customer assessment scores.
Identifies weak areas and recommends use cases and TP features to improve them.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Dict, Tuple, Optional
from datetime import datetime

from app.models.assessment import CustomerAssessment, AssessmentStatus
from app.models.use_case import CustomerUseCase, UseCaseStatus
from app.models.mapping import DimensionUseCaseMapping, UseCaseTPFeatureMapping, RoadmapRecommendation


class RecommendationEngine:
    """Engine for generating roadmap recommendations from assessment data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_completed_assessment(
        self, customer_id: int
    ) -> Optional[CustomerAssessment]:
        """Get the most recent completed assessment for a customer."""
        query = select(CustomerAssessment).where(
            CustomerAssessment.customer_id == customer_id,
            CustomerAssessment.status == AssessmentStatus.COMPLETED
        ).order_by(CustomerAssessment.completed_at.desc()).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_weak_dimensions(
        self,
        dimension_scores: Dict[str, float],
        threshold: float
    ) -> List[Tuple[str, float, float]]:
        """
        Identify dimensions scoring below threshold.
        Returns list of (dimension_name, score, gap) tuples sorted by gap (worst first).
        """
        weak = []
        for dim_name, score in dimension_scores.items():
            if score < threshold:
                gap = threshold - score
                weak.append((dim_name, score, gap))

        # Sort by gap descending (biggest gaps first)
        weak.sort(key=lambda x: x[2], reverse=True)
        return weak

    async def get_use_cases_for_dimensions(
        self,
        dimension_names: List[str]
    ) -> List[DimensionUseCaseMapping]:
        """Get all use case mappings for the given dimension names."""
        # First, get dimension IDs from names
        from app.models.assessment import AssessmentDimension

        dim_query = select(AssessmentDimension).where(
            AssessmentDimension.name.in_(dimension_names)
        )
        result = await self.db.execute(dim_query)
        dimensions = result.scalars().all()
        dim_ids = [d.id for d in dimensions]

        if not dim_ids:
            return []

        # Get mappings for these dimensions
        mapping_query = select(DimensionUseCaseMapping).where(
            DimensionUseCaseMapping.dimension_id.in_(dim_ids)
        ).options(
            selectinload(DimensionUseCaseMapping.dimension),
            selectinload(DimensionUseCaseMapping.use_case)
        ).order_by(DimensionUseCaseMapping.priority)

        result = await self.db.execute(mapping_query)
        return result.scalars().all()

    async def get_implemented_use_cases(self, customer_id: int) -> set:
        """Get IDs of use cases already implemented or being implemented."""
        query = select(CustomerUseCase.use_case_id).where(
            CustomerUseCase.customer_id == customer_id,
            CustomerUseCase.status.in_([
                UseCaseStatus.IMPLEMENTED,
                UseCaseStatus.OPTIMIZED,
                UseCaseStatus.IN_PROGRESS
            ])
        )
        result = await self.db.execute(query)
        return set(result.scalars().all())

    async def get_tp_features_for_use_cases(
        self,
        use_case_ids: List[int]
    ) -> Dict[int, List[UseCaseTPFeatureMapping]]:
        """Get TP feature mappings for the given use cases."""
        if not use_case_ids:
            return {}

        query = select(UseCaseTPFeatureMapping).where(
            UseCaseTPFeatureMapping.use_case_id.in_(use_case_ids)
        ).options(
            selectinload(UseCaseTPFeatureMapping.use_case)
        )

        result = await self.db.execute(query)
        mappings = result.scalars().all()

        # Group by use case
        by_use_case: Dict[int, List[UseCaseTPFeatureMapping]] = {}
        for m in mappings:
            if m.use_case_id not in by_use_case:
                by_use_case[m.use_case_id] = []
            by_use_case[m.use_case_id].append(m)

        return by_use_case

    def calculate_priority_score(
        self,
        dimension_gap: float,
        impact_weight: float,
        mapping_priority: int,
        has_tp_features: bool
    ) -> float:
        """
        Calculate priority score for a recommendation.

        Factors:
        - dimension_gap: How far below threshold (higher = more urgent)
        - impact_weight: How much the use case improves the dimension (0-1)
        - mapping_priority: Admin-defined priority (lower = higher priority)
        - has_tp_features: Bonus if TP features are mapped
        """
        # Base score from gap (0-2 range typically, scale to 0-50)
        gap_score = min(dimension_gap * 25, 50)

        # Impact contribution (0-30 range)
        impact_score = impact_weight * 30

        # Priority contribution (0-15 range, inverted so lower priority value = higher score)
        priority_score = max(0, 15 - mapping_priority)

        # TP feature bonus (0-5)
        tp_bonus = 5 if has_tp_features else 0

        return gap_score + impact_score + priority_score + tp_bonus

    def calculate_improvement_potential(
        self,
        dimension_gap: float,
        impact_weight: float
    ) -> float:
        """Estimate potential score improvement from implementing this use case."""
        # Assume implementing a use case can improve score by up to impact_weight * gap
        return min(dimension_gap * impact_weight, dimension_gap)

    async def clear_existing_recommendations(
        self,
        customer_id: int,
        assessment_id: Optional[int] = None
    ) -> int:
        """Clear existing non-accepted recommendations for a customer."""
        from sqlalchemy import delete

        conditions = [
            RoadmapRecommendation.customer_id == customer_id,
            RoadmapRecommendation.is_accepted == False
        ]
        if assessment_id:
            conditions.append(RoadmapRecommendation.customer_assessment_id == assessment_id)

        query = delete(RoadmapRecommendation).where(and_(*conditions))
        result = await self.db.execute(query)
        return result.rowcount

    async def generate_recommendations(
        self,
        customer_id: int,
        threshold: float = 3.5,
        limit: int = 20,
        regenerate: bool = False
    ) -> List[RoadmapRecommendation]:
        """
        Generate roadmap recommendations for a customer based on their assessment.

        Args:
            customer_id: Customer to generate recommendations for
            threshold: Score threshold - dimensions below this are considered weak
            limit: Maximum number of recommendations to generate
            regenerate: If True, clear existing recommendations first

        Returns:
            List of RoadmapRecommendation objects
        """
        # 1. Get customer's latest completed assessment
        assessment = await self.get_latest_completed_assessment(customer_id)
        if not assessment:
            return []

        if not assessment.dimension_scores:
            return []

        # 2. Clear existing recommendations if regenerating
        if regenerate:
            await self.clear_existing_recommendations(customer_id, assessment.id)

        # 3. Identify weak dimensions
        weak_dimensions = await self.get_weak_dimensions(
            assessment.dimension_scores,
            threshold
        )
        if not weak_dimensions:
            return []

        weak_dim_names = [wd[0] for wd in weak_dimensions]
        weak_dim_lookup = {wd[0]: (wd[1], wd[2]) for wd in weak_dimensions}  # name -> (score, gap)

        # 4. Get use cases mapped to weak dimensions
        dim_use_case_mappings = await self.get_use_cases_for_dimensions(weak_dim_names)
        if not dim_use_case_mappings:
            return []

        # 5. Filter out already implemented use cases
        implemented = await self.get_implemented_use_cases(customer_id)
        candidate_mappings = [
            m for m in dim_use_case_mappings
            if m.use_case_id not in implemented
        ]
        if not candidate_mappings:
            return []

        # 6. Get TP features for candidate use cases
        use_case_ids = list(set(m.use_case_id for m in candidate_mappings))
        tp_features = await self.get_tp_features_for_use_cases(use_case_ids)

        # 7. Score and create recommendations
        recommendations = []
        seen_use_cases = set()  # Avoid duplicates

        for mapping in candidate_mappings:
            # Skip if we already have a recommendation for this use case
            if mapping.use_case_id in seen_use_cases:
                continue
            seen_use_cases.add(mapping.use_case_id)

            dim_name = mapping.dimension.name if mapping.dimension else "Unknown"
            dim_score, dim_gap = weak_dim_lookup.get(dim_name, (0, 0))

            use_case = mapping.use_case
            if not use_case:
                continue

            # Get TP features for this use case
            uc_tp_features = tp_features.get(mapping.use_case_id, [])
            has_tp = len(uc_tp_features) > 0

            # Calculate scores
            priority_score = self.calculate_priority_score(
                dim_gap,
                mapping.impact_weight,
                mapping.priority,
                has_tp
            )
            improvement_potential = self.calculate_improvement_potential(
                dim_gap,
                mapping.impact_weight
            )

            # Create recommendation title
            title = f"{use_case.name}"
            if uc_tp_features:
                # Add first TP feature name if available
                title = f"{use_case.name} ({uc_tp_features[0].tp_feature_name})"

            # Get first TP feature mapping ID if available
            tp_mapping_id = uc_tp_features[0].id if uc_tp_features else None

            # Create recommendation
            recommendation = RoadmapRecommendation(
                customer_id=customer_id,
                customer_assessment_id=assessment.id,
                use_case_id=mapping.use_case_id,
                tp_feature_mapping_id=tp_mapping_id,
                title=title,
                description=f"Improves {dim_name} dimension (current score: {dim_score:.1f})",
                dimension_name=dim_name,
                dimension_score=dim_score,
                priority_score=priority_score,
                improvement_potential=improvement_potential,
            )
            recommendations.append(recommendation)

        # 8. Sort by priority score descending and limit
        recommendations.sort(key=lambda r: r.priority_score, reverse=True)
        recommendations = recommendations[:limit]

        # 9. Save recommendations
        for rec in recommendations:
            self.db.add(rec)

        await self.db.flush()

        # Refresh to get IDs
        for rec in recommendations:
            await self.db.refresh(rec)

        return recommendations

    async def get_customer_recommendations(
        self,
        customer_id: int,
        include_dismissed: bool = False,
        include_accepted: bool = True
    ) -> List[RoadmapRecommendation]:
        """Get existing recommendations for a customer."""
        conditions = [RoadmapRecommendation.customer_id == customer_id]

        if not include_dismissed:
            conditions.append(RoadmapRecommendation.is_dismissed == False)
        if not include_accepted:
            conditions.append(RoadmapRecommendation.is_accepted == False)

        query = select(RoadmapRecommendation).where(
            and_(*conditions)
        ).options(
            selectinload(RoadmapRecommendation.use_case),
            selectinload(RoadmapRecommendation.tp_feature_mapping),
        ).order_by(RoadmapRecommendation.priority_score.desc())

        result = await self.db.execute(query)
        return result.scalars().all()
