"""
AI-powered features for CS Tracker.

This module provides AI-enhanced capabilities including:
- Customer summarization
- Risk detection from engagement patterns
- Meeting prep assistance
- Semantic search (future)
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.customer import Customer, HealthStatus
from app.models.task import Task, TaskStatus
from app.models.risk import Risk, RiskStatus
from app.models.engagement import Engagement
from app.models.meeting_note import MeetingNote
from app.services.ai_provider import get_ai_provider, AIMessage

logger = logging.getLogger(__name__)


SUMMARIZATION_PROMPT = """You are an expert Customer Success analyst. Generate a concise executive summary for the customer based on the provided data.

Include:
1. **Health Overview**: Current status and any concerns
2. **Key Metrics**: ARR, renewal timeline, adoption
3. **Recent Activity**: Summary of recent engagements and tasks
4. **Risks & Issues**: Any open risks or concerns
5. **Recommended Actions**: 2-3 specific next steps

Keep the summary concise (under 300 words) and actionable. Use bullet points for clarity.
Focus on insights that would help a CSM prepare for a customer meeting."""


MEETING_PREP_PROMPT = """You are a Customer Success assistant helping a CSM prepare for a customer meeting.

Based on the customer data provided, generate a meeting prep briefing that includes:

1. **Customer Snapshot**: Quick health/status overview
2. **Key Topics to Address**: Based on open tasks, risks, and recent history
3. **Talking Points**: Suggested topics based on engagement history
4. **Questions to Ask**: Probing questions to uncover issues
5. **Action Items to Follow Up**: Open items that need attention

Keep the briefing focused and actionable. The CSM should be able to review this in 2 minutes."""


class AIFeatures:
    """AI-powered features for customer success."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._provider = None

    @property
    def provider(self):
        """Lazy load the AI provider."""
        if self._provider is None:
            self._provider = get_ai_provider()
        return self._provider

    async def summarize_customer(self, customer_id: int) -> Dict[str, Any]:
        """
        Generate an AI-powered summary for a customer.

        Args:
            customer_id: The customer ID to summarize

        Returns:
            Dict containing the summary and metadata
        """
        # Fetch customer with related data
        query = select(Customer).where(Customer.id == customer_id).options(
            selectinload(Customer.csm_owner),
            selectinload(Customer.tasks),
            selectinload(Customer.risks),
            selectinload(Customer.engagements)
        )
        result = await self.db.execute(query)
        customer = result.scalar_one_or_none()

        if not customer:
            return {"error": "Customer not found"}

        # Build context for the AI
        context = self._build_customer_context(customer)

        # Generate summary
        try:
            response = await self.provider.chat(
                messages=[AIMessage(role="user", content=f"Please summarize this customer:\n\n{context}")],
                system_prompt=SUMMARIZATION_PROMPT,
                max_tokens=1000
            )

            return {
                "customer_id": customer_id,
                "customer_name": customer.name,
                "summary": response.content,
                "generated_at": datetime.utcnow().isoformat(),
                "model": self._get_model_name()
            }

        except Exception as e:
            logger.error(f"Error generating customer summary: {e}")
            return {
                "customer_id": customer_id,
                "error": str(e)
            }

    async def generate_meeting_prep(self, customer_id: int, meeting_context: str = None) -> Dict[str, Any]:
        """
        Generate a meeting prep briefing for a customer.

        Args:
            customer_id: The customer ID
            meeting_context: Optional context about the meeting (e.g., "QBR", "escalation call")

        Returns:
            Dict containing the meeting prep and metadata
        """
        # Fetch customer with related data
        query = select(Customer).where(Customer.id == customer_id).options(
            selectinload(Customer.csm_owner),
            selectinload(Customer.tasks),
            selectinload(Customer.risks),
            selectinload(Customer.engagements)
        )
        result = await self.db.execute(query)
        customer = result.scalar_one_or_none()

        if not customer:
            return {"error": "Customer not found"}

        # Fetch recent meeting notes
        notes_query = select(MeetingNote).where(
            MeetingNote.customer_id == customer_id
        ).order_by(MeetingNote.meeting_date.desc()).limit(5)
        notes_result = await self.db.execute(notes_query)
        meeting_notes = notes_result.scalars().all()

        # Build context
        context = self._build_customer_context(customer, include_meeting_notes=True, meeting_notes=meeting_notes)

        if meeting_context:
            context += f"\n\nMeeting Context: {meeting_context}"

        # Generate meeting prep
        try:
            response = await self.provider.chat(
                messages=[AIMessage(role="user", content=f"Prepare a meeting briefing for this customer:\n\n{context}")],
                system_prompt=MEETING_PREP_PROMPT,
                max_tokens=1500
            )

            return {
                "customer_id": customer_id,
                "customer_name": customer.name,
                "meeting_prep": response.content,
                "generated_at": datetime.utcnow().isoformat(),
                "model": self._get_model_name()
            }

        except Exception as e:
            logger.error(f"Error generating meeting prep: {e}")
            return {
                "customer_id": customer_id,
                "error": str(e)
            }

    async def analyze_risk_signals(self, customer_id: int) -> Dict[str, Any]:
        """
        Analyze customer data for risk signals.

        Args:
            customer_id: The customer ID to analyze

        Returns:
            Dict containing identified risks and recommendations
        """
        # Fetch customer with related data
        query = select(Customer).where(Customer.id == customer_id).options(
            selectinload(Customer.tasks),
            selectinload(Customer.risks),
            selectinload(Customer.engagements)
        )
        result = await self.db.execute(query)
        customer = result.scalar_one_or_none()

        if not customer:
            return {"error": "Customer not found"}

        context = self._build_customer_context(customer)

        risk_prompt = """Analyze this customer data for risk signals. Identify:

1. **Detected Risk Signals**: Specific indicators of potential issues
2. **Risk Level**: Overall risk assessment (Low/Medium/High/Critical)
3. **Contributing Factors**: What's driving the risk
4. **Early Warning Signs**: Things to watch for
5. **Mitigation Recommendations**: Specific actions to address risks

Be specific and data-driven. Reference actual data points from the customer info."""

        try:
            response = await self.provider.chat(
                messages=[AIMessage(role="user", content=f"Analyze this customer for risk signals:\n\n{context}")],
                system_prompt=risk_prompt,
                max_tokens=1200
            )

            return {
                "customer_id": customer_id,
                "customer_name": customer.name,
                "risk_analysis": response.content,
                "current_health": customer.health_status.value,
                "generated_at": datetime.utcnow().isoformat(),
                "model": self._get_model_name()
            }

        except Exception as e:
            logger.error(f"Error analyzing risk signals: {e}")
            return {
                "customer_id": customer_id,
                "error": str(e)
            }

    def _build_customer_context(
        self,
        customer: Customer,
        include_meeting_notes: bool = False,
        meeting_notes: List[MeetingNote] = None
    ) -> str:
        """Build context string for AI from customer data."""
        # Basic info
        context = f"""
CUSTOMER: {customer.name}
Health Status: {customer.health_status.value.upper()}
Health Score: {customer.health_score or 'N/A'}
ARR: ${customer.arr:,.2f} if customer.arr else 'N/A'
Renewal Date: {customer.renewal_date.isoformat() if customer.renewal_date else 'N/A'}
Days to Renewal: {customer.days_to_renewal or 'N/A'}
Industry: {customer.industry or 'N/A'}
Products: {customer.products_owned or 'N/A'}
Adoption Stage: {customer.adoption_stage.value if customer.adoption_stage else 'N/A'}
Adoption %: {customer.adoption_percentage or 0}%
Last Contact: {customer.last_contact_date.isoformat() if customer.last_contact_date else 'N/A'}
CSM: {customer.csm_owner.full_name if customer.csm_owner else 'N/A'}
"""

        # Open tasks
        open_tasks = [t for t in customer.tasks if t.status in [TaskStatus.OPEN, TaskStatus.IN_PROGRESS]]
        if open_tasks:
            context += "\nOPEN TASKS:\n"
            for task in sorted(open_tasks, key=lambda t: t.due_date or datetime.max)[:10]:
                overdue = " (OVERDUE)" if task.is_overdue else ""
                context += f"- [{task.priority.value.upper()}] {task.title}{overdue}\n"
                if task.due_date:
                    context += f"  Due: {task.due_date.strftime('%Y-%m-%d')}\n"

        # Open risks
        open_risks = [r for r in customer.risks if r.status in [RiskStatus.OPEN, RiskStatus.MITIGATING]]
        if open_risks:
            context += "\nOPEN RISKS:\n"
            for risk in open_risks:
                context += f"- [{risk.severity.value.upper()}] {risk.title}\n"
                if risk.description:
                    context += f"  {risk.description[:200]}\n"

        # Recent engagements
        recent_engagements = sorted(
            customer.engagements,
            key=lambda e: e.engagement_date,
            reverse=True
        )[:10]
        if recent_engagements:
            context += "\nRECENT ENGAGEMENTS:\n"
            for eng in recent_engagements:
                context += f"- [{eng.engagement_date.strftime('%Y-%m-%d')}] {eng.engagement_type.value}: {eng.title}\n"
                if eng.summary:
                    context += f"  {eng.summary[:150]}\n"

        # Meeting notes if requested
        if include_meeting_notes and meeting_notes:
            context += "\nRECENT MEETING NOTES:\n"
            for note in meeting_notes:
                context += f"- [{note.meeting_date.strftime('%Y-%m-%d')}] {note.title}\n"
                if note.notes:
                    context += f"  Notes: {note.notes[:300]}...\n"
                if note.action_items:
                    context += f"  Action Items: {note.action_items[:200]}\n"

        return context

    def _get_model_name(self) -> str:
        """Get the name of the current model being used."""
        from app.core.config import settings
        if settings.llm_provider == "ollama":
            return f"ollama/{settings.ollama_model}"
        return f"anthropic/{settings.anthropic_model}"
