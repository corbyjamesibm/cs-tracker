"""
Assessment Aggregation Service

Aggregates assessment data across multiple types (SPM, TBM, FinOps) and provides
cross-type analysis, unified recommendations, and composite reporting.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from collections import defaultdict

from app.models.assessment import (
    CustomerAssessment, AssessmentStatus, AssessmentTemplate,
    CustomerAssessmentSummary
)
from app.models.assessment_type import AssessmentType, AssessmentTypeCode
from app.models.mapping import RoadmapRecommendation, AggregatedRecommendation
from app.models.use_case import UseCase


class AssessmentAggregationService:
    """Service for aggregating assessment data across multiple types."""

    # Synergy boost factor per additional assessment type
    SYNERGY_BOOST_PER_TYPE = 0.15

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_assessment_types(self, active_only: bool = True) -> List[AssessmentType]:
        """Get all assessment types."""
        query = select(AssessmentType).order_by(AssessmentType.display_order)
        if active_only:
            query = query.where(AssessmentType.is_active == True)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_assessment_type_by_code(self, code: str) -> Optional[AssessmentType]:
        """Get assessment type by code (spm, tbm, finops)."""
        query = select(AssessmentType).where(AssessmentType.code == code)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_latest_assessment_by_type(
        self, customer_id: int, assessment_type_id: int
    ) -> Optional[CustomerAssessment]:
        """Get the most recent completed assessment for a customer of a specific type."""
        query = (
            select(CustomerAssessment)
            .where(
                CustomerAssessment.customer_id == customer_id,
                CustomerAssessment.assessment_type_id == assessment_type_id,
                CustomerAssessment.status == AssessmentStatus.COMPLETED
            )
            .order_by(CustomerAssessment.completed_at.desc())
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_latest_assessments_all_types(
        self, customer_id: int
    ) -> Dict[str, Optional[CustomerAssessment]]:
        """Get the latest assessment for each type for a customer."""
        types = await self.get_assessment_types()
        result = {}

        for atype in types:
            assessment = await self.get_latest_assessment_by_type(
                customer_id, atype.id
            )
            result[atype.code] = assessment

        return result

    async def calculate_overall_maturity_score(
        self, scores_by_type: Dict[str, float]
    ) -> Optional[float]:
        """
        Calculate overall maturity score as average of type scores.
        Only counts types that have assessments.
        """
        if not scores_by_type:
            return None

        valid_scores = [s for s in scores_by_type.values() if s is not None]
        if not valid_scores:
            return None

        return sum(valid_scores) / len(valid_scores)

    async def update_customer_assessment_summary(
        self, customer_id: int
    ) -> CustomerAssessmentSummary:
        """Update or create the assessment summary for a customer."""
        # Get latest assessments for each type
        types = await self.get_assessment_types()
        type_code_to_id = {t.code: t.id for t in types}

        assessments = await self.get_latest_assessments_all_types(customer_id)

        # Build scores by type
        scores_by_type = {}
        for type_code, assessment in assessments.items():
            if assessment and assessment.overall_score is not None:
                scores_by_type[type_code] = {
                    "overall": assessment.overall_score,
                    "dimensions": assessment.dimension_scores or {},
                    "assessment_id": assessment.id,
                    "assessment_date": assessment.completed_at.isoformat() if assessment.completed_at else None
                }

        # Calculate overall maturity score
        type_overalls = {k: v["overall"] for k, v in scores_by_type.items()}
        overall_score = await self.calculate_overall_maturity_score(type_overalls)

        # Get or create summary
        query = select(CustomerAssessmentSummary).where(
            CustomerAssessmentSummary.customer_id == customer_id
        )
        result = await self.db.execute(query)
        summary = result.scalar_one_or_none()

        if not summary:
            summary = CustomerAssessmentSummary(customer_id=customer_id)
            self.db.add(summary)

        # Update summary fields
        spm_assessment = assessments.get("spm")
        tbm_assessment = assessments.get("tbm")
        finops_assessment = assessments.get("finops")

        summary.latest_spm_assessment_id = spm_assessment.id if spm_assessment else None
        summary.latest_tbm_assessment_id = tbm_assessment.id if tbm_assessment else None
        summary.latest_finops_assessment_id = finops_assessment.id if finops_assessment else None
        summary.scores_by_type = scores_by_type
        summary.overall_maturity_score = overall_score
        summary.last_updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(summary)

        return summary

    async def get_customer_assessment_summary(
        self, customer_id: int
    ) -> Optional[CustomerAssessmentSummary]:
        """Get the assessment summary for a customer."""
        query = select(CustomerAssessmentSummary).where(
            CustomerAssessmentSummary.customer_id == customer_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_recommendations_by_type(
        self,
        customer_id: int,
        assessment_type_id: Optional[int] = None,
        include_dismissed: bool = False
    ) -> List[RoadmapRecommendation]:
        """Get recommendations optionally filtered by assessment type."""
        conditions = [
            RoadmapRecommendation.customer_id == customer_id,
            RoadmapRecommendation.is_accepted == False
        ]

        if not include_dismissed:
            conditions.append(RoadmapRecommendation.is_dismissed == False)

        if assessment_type_id is not None:
            conditions.append(RoadmapRecommendation.assessment_type_id == assessment_type_id)

        query = (
            select(RoadmapRecommendation)
            .where(and_(*conditions))
            .options(
                selectinload(RoadmapRecommendation.use_case),
                selectinload(RoadmapRecommendation.assessment_type)
            )
            .order_by(RoadmapRecommendation.priority_score.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def calculate_synergy_boost(self, type_count: int) -> float:
        """
        Calculate synergy boost multiplier.
        Formula: 1.0 + (SYNERGY_BOOST_PER_TYPE * (type_count - 1))

        Examples:
        - 1 type: 1.0 (no boost)
        - 2 types: 1.15
        - 3 types: 1.30
        """
        if type_count <= 1:
            return 1.0
        return 1.0 + (self.SYNERGY_BOOST_PER_TYPE * (type_count - 1))

    async def aggregate_recommendations(
        self,
        customer_id: int,
        include_dismissed: bool = False,
        limit: int = 20
    ) -> List[AggregatedRecommendation]:
        """
        Aggregate recommendations across all assessment types.

        Algorithm:
        1. Collect RoadmapRecommendations from each assessment type
        2. Group by use_case_id (same use case = same recommendation)
        3. Calculate aggregate score with synergy boost
        4. Mark as synergistic if recommended by multiple types
        5. Sort by combined score descending
        """
        # Get all recommendations
        recommendations = await self.get_recommendations_by_type(
            customer_id, include_dismissed=include_dismissed
        )

        if not recommendations:
            return []

        # Group by use case
        by_use_case: Dict[int, List[RoadmapRecommendation]] = defaultdict(list)
        for rec in recommendations:
            by_use_case[rec.use_case_id].append(rec)

        # Clear existing aggregated recommendations for this customer
        await self.clear_aggregated_recommendations(customer_id)

        # Create aggregated recommendations
        aggregated = []
        for use_case_id, recs in by_use_case.items():
            # Collect source assessment types
            source_types = list(set(
                rec.assessment_type.code for rec in recs if rec.assessment_type
            ))
            source_rec_ids = [rec.id for rec in recs]

            # Calculate base priority (average of individual priorities)
            base_priority = sum(r.priority_score for r in recs) / len(recs)

            # Apply synergy boost
            type_count = len(source_types)
            synergy_boost = self.calculate_synergy_boost(type_count)
            combined_priority = base_priority * synergy_boost

            # Use the first recommendation's details as the base
            first_rec = recs[0]
            use_case = first_rec.use_case

            # Build description mentioning all affected dimensions
            dimension_mentions = list(set(
                f"{r.dimension_name} ({r.dimension_score:.1f})" for r in recs
            ))
            description = f"Improves: {', '.join(dimension_mentions)}"
            if type_count > 1:
                description += f"\nRecommended by {type_count} assessment types: {', '.join(source_types).upper()}"

            aggregated_rec = AggregatedRecommendation(
                customer_id=customer_id,
                use_case_id=use_case_id,
                title=use_case.name if use_case else first_rec.title,
                description=description,
                source_assessment_types=source_types,
                source_recommendation_ids=source_rec_ids,
                combined_priority_score=combined_priority,
                base_priority_score=base_priority,
                is_synergistic=(type_count > 1)
            )
            aggregated.append(aggregated_rec)

        # Sort by combined priority score
        aggregated.sort(key=lambda x: x.combined_priority_score, reverse=True)

        # Limit results
        aggregated = aggregated[:limit]

        # Save to database
        for rec in aggregated:
            self.db.add(rec)

        await self.db.flush()

        # Refresh to get IDs
        for rec in aggregated:
            await self.db.refresh(rec)

        return aggregated

    async def clear_aggregated_recommendations(self, customer_id: int) -> int:
        """Clear existing non-accepted aggregated recommendations for a customer."""
        query = delete(AggregatedRecommendation).where(
            and_(
                AggregatedRecommendation.customer_id == customer_id,
                AggregatedRecommendation.is_accepted == False
            )
        )
        result = await self.db.execute(query)
        return result.rowcount

    async def get_aggregated_recommendations(
        self,
        customer_id: int,
        include_dismissed: bool = False,
        include_accepted: bool = True
    ) -> List[AggregatedRecommendation]:
        """Get existing aggregated recommendations for a customer."""
        conditions = [AggregatedRecommendation.customer_id == customer_id]

        if not include_dismissed:
            conditions.append(AggregatedRecommendation.is_dismissed == False)
        if not include_accepted:
            conditions.append(AggregatedRecommendation.is_accepted == False)

        query = (
            select(AggregatedRecommendation)
            .where(and_(*conditions))
            .options(selectinload(AggregatedRecommendation.use_case))
            .order_by(AggregatedRecommendation.combined_priority_score.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_cross_type_analysis(
        self, customer_id: int
    ) -> Dict:
        """
        Analyze patterns across assessment types.

        Returns:
        - common_weak_dimensions: Dimensions weak in multiple types
        - common_strong_dimensions: Dimensions strong in multiple types
        - type_coverage: Which types have assessments
        - insights: Generated insights
        - synergy_opportunities: Count of multi-type recommendations
        """
        summary = await self.get_customer_assessment_summary(customer_id)
        if not summary or not summary.scores_by_type:
            return {
                "common_weak_dimensions": [],
                "common_strong_dimensions": [],
                "type_coverage": {},
                "insights": [],
                "synergy_opportunities": 0
            }

        WEAK_THRESHOLD = 3.5
        STRONG_THRESHOLD = 4.0

        # Collect dimension scores by dimension name
        dimension_scores_by_name: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        type_coverage = {}

        for type_code, type_data in summary.scores_by_type.items():
            type_coverage[type_code] = True
            dimensions = type_data.get("dimensions", {})
            for dim_name, score in dimensions.items():
                dimension_scores_by_name[dim_name].append((type_code, score))

        # Find common weak and strong dimensions
        common_weak = []
        common_strong = []

        for dim_name, scores in dimension_scores_by_name.items():
            weak_count = sum(1 for _, score in scores if score < WEAK_THRESHOLD)
            strong_count = sum(1 for _, score in scores if score >= STRONG_THRESHOLD)

            if weak_count > 1:
                common_weak.append(dim_name)
            if strong_count > 1:
                common_strong.append(dim_name)

        # Get synergy opportunities from aggregated recommendations
        aggregated = await self.get_aggregated_recommendations(customer_id)
        synergy_count = sum(1 for r in aggregated if r.is_synergistic)

        # Generate insights
        insights = []

        if common_weak:
            insights.append({
                "insight_type": "gap",
                "title": "Cross-Cutting Gaps",
                "description": f"The following dimensions are weak across multiple assessment types: {', '.join(common_weak)}. Consider prioritizing improvements in these areas for maximum impact.",
                "affected_types": list(type_coverage.keys()),
                "severity": "warning"
            })

        if common_strong:
            insights.append({
                "insight_type": "strength",
                "title": "Cross-Cutting Strengths",
                "description": f"The following dimensions are strong across multiple assessment types: {', '.join(common_strong)}. These represent organizational strengths.",
                "affected_types": list(type_coverage.keys()),
                "severity": "success"
            })

        if synergy_count > 0:
            insights.append({
                "insight_type": "synergy",
                "title": "Synergistic Opportunities",
                "description": f"Found {synergy_count} recommendations that benefit multiple assessment areas. Implementing these provides compounded value.",
                "affected_types": list(type_coverage.keys()),
                "severity": "info"
            })

        return {
            "common_weak_dimensions": common_weak,
            "common_strong_dimensions": common_strong,
            "type_coverage": type_coverage,
            "insights": insights,
            "synergy_opportunities": synergy_count
        }

    async def build_unified_roadmap(
        self,
        customer_id: int,
        include_accepted: bool = True
    ) -> Dict:
        """
        Build a unified roadmap from aggregated recommendations.
        Groups items by target quarter/year.
        """
        recommendations = await self.get_aggregated_recommendations(
            customer_id, include_accepted=include_accepted
        )

        # Group by quarter
        quarters: Dict[str, List] = defaultdict(list)
        items_by_type: Dict[str, int] = defaultdict(int)
        synergistic_count = 0

        for rec in recommendations:
            # Build quarter key
            quarter_key = "Unscheduled"
            if rec.target_quarter and rec.target_year:
                quarter_key = f"{rec.target_quarter} {rec.target_year}"

            item = {
                "id": rec.id,
                "title": rec.title,
                "description": rec.description,
                "source_assessment_types": rec.source_assessment_types,
                "is_synergistic": rec.is_synergistic,
                "priority_score": rec.combined_priority_score,
                "estimated_effort": rec.estimated_effort,
                "target_quarter": rec.target_quarter,
                "target_year": rec.target_year,
                "status": "in_progress" if rec.is_accepted else "planned",
                "roadmap_item_id": rec.roadmap_item_id
            }

            quarters[quarter_key].append(item)

            # Count by type
            for type_code in rec.source_assessment_types:
                items_by_type[type_code] += 1

            if rec.is_synergistic:
                synergistic_count += 1

        # Build quarter list
        quarter_list = []
        for quarter_key, items in sorted(quarters.items()):
            quarter_list.append({
                "quarter": quarter_key,
                "items": items,
                "item_count": len(items)
            })

        return {
            "customer_id": customer_id,
            "quarters": quarter_list,
            "total_items": len(recommendations),
            "synergistic_items": synergistic_count,
            "items_by_type": dict(items_by_type)
        }
