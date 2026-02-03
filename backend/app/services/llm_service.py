"""LLM service for CS Tracker chat functionality."""
import json
import uuid
import logging
from typing import Optional, List, Any
from datetime import datetime, date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.user import User, UserRole
from app.models.customer import Customer, HealthStatus
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.engagement import Engagement, EngagementType
from app.models.risk import Risk, RiskSeverity, RiskStatus, RiskCategory
from app.models.meeting_note import MeetingNote
from app.schemas.chat import ChatRequest, ChatResponse, ChatContext, ActionResult
from app.services.ai_provider import get_ai_provider, AIMessage, AIProvider
from app.services.targetprocess import get_tp_service

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a helpful Customer Success Assistant for CS Tracker, a customer success management application.

You help Customer Success Managers (CSMs) with:
- Querying customer data (health status, ARR, renewals, risks)
- Finding and managing tasks
- Logging engagements and meeting notes
- Creating and tracking risks
- Getting portfolio summaries and insights

IMPORTANT - TOOL USAGE:
- You MUST use the provided tools to answer questions that require data
- DO NOT describe what tool you would use - actually USE the tool
- DO NOT output JSON or function call syntax in your response text
- When you need customer data, risks, tasks, etc., call the appropriate tool immediately
- After getting tool results, respond with the actual data to the user

When responding:
- Be concise and professional
- Use specific data from tool results
- Suggest follow-up actions when appropriate
- Format responses clearly with bullet points when listing items

Context about the current user will be provided. Respect role-based access:
- READ_ONLY users can only query data, not create or modify
- CSM and ACCOUNT_MANAGER users can only act on their assigned customers
- MANAGER and ADMIN users have full access

When creating tasks, engagements, or risks, always confirm the action was successful and provide the ID for reference."""


TOOLS = [
    {
        "name": "search_customers",
        "description": "Search for customers by name, health status, or CSM. Returns basic customer info including health, ARR, and renewal date.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search_term": {
                    "type": "string",
                    "description": "Search term to match against customer name"
                },
                "health_status": {
                    "type": "string",
                    "enum": ["red", "yellow", "green"],
                    "description": "Filter by health status"
                },
                "csm_id": {
                    "type": "integer",
                    "description": "Filter by CSM owner ID"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum number of results"
                }
            }
        }
    },
    {
        "name": "get_customer_details",
        "description": "Get full details for a specific customer including health, ARR, risks, recent tasks, and engagements.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "The customer ID to look up"
                }
            },
            "required": ["customer_id"]
        }
    },
    {
        "name": "get_portfolio_summary",
        "description": "Get a summary of the current user's portfolio including customer count, health distribution, total ARR, and upcoming renewals.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "list_tasks",
        "description": "List tasks with optional filters. Returns task title, status, priority, due date, and customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Filter by customer ID"
                },
                "status": {
                    "type": "string",
                    "enum": ["open", "in_progress", "completed", "cancelled"],
                    "description": "Filter by task status"
                },
                "assignee_id": {
                    "type": "integer",
                    "description": "Filter by assignee ID (use 'me' for current user)"
                },
                "overdue_only": {
                    "type": "boolean",
                    "description": "Only show overdue tasks"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum number of results"
                }
            }
        }
    },
    {
        "name": "create_task",
        "description": "Create a new task. Requires at least a title. Customer ID is optional.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Task title"
                },
                "description": {
                    "type": "string",
                    "description": "Task description"
                },
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID to associate the task with"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "urgent"],
                    "default": "medium",
                    "description": "Task priority"
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in YYYY-MM-DD format"
                },
                "assignee_id": {
                    "type": "integer",
                    "description": "User ID to assign the task to"
                }
            },
            "required": ["title"]
        }
    },
    {
        "name": "complete_task",
        "description": "Mark a task as completed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer",
                    "description": "ID of the task to complete"
                },
                "completion_notes": {
                    "type": "string",
                    "description": "Optional notes about task completion"
                }
            },
            "required": ["task_id"]
        }
    },
    {
        "name": "log_engagement",
        "description": "Log a customer engagement (call, meeting, email, etc.).",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID"
                },
                "engagement_type": {
                    "type": "string",
                    "enum": ["call", "meeting", "email", "qbr", "note", "escalation", "status_report", "other"],
                    "description": "Type of engagement"
                },
                "title": {
                    "type": "string",
                    "description": "Engagement title"
                },
                "summary": {
                    "type": "string",
                    "description": "Summary of the engagement"
                },
                "engagement_date": {
                    "type": "string",
                    "description": "Date of engagement in YYYY-MM-DD format (defaults to today)"
                }
            },
            "required": ["customer_id", "engagement_type", "title"]
        }
    },
    {
        "name": "list_risks",
        "description": "List risks with optional filters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Filter by customer ID"
                },
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Filter by severity"
                },
                "status": {
                    "type": "string",
                    "enum": ["open", "mitigating", "resolved", "accepted"],
                    "description": "Filter by status"
                },
                "open_only": {
                    "type": "boolean",
                    "default": True,
                    "description": "Only show open/mitigating risks"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum number of results"
                }
            }
        }
    },
    {
        "name": "create_risk",
        "description": "Create a new risk for a customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID"
                },
                "title": {
                    "type": "string",
                    "description": "Risk title"
                },
                "description": {
                    "type": "string",
                    "description": "Risk description"
                },
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "default": "medium",
                    "description": "Risk severity"
                },
                "category": {
                    "type": "string",
                    "enum": ["adoption", "renewal", "technical", "relationship", "financial", "other"],
                    "description": "Risk category"
                },
                "mitigation_plan": {
                    "type": "string",
                    "description": "Plan to mitigate the risk"
                }
            },
            "required": ["customer_id", "title"]
        }
    },
    {
        "name": "get_risk_summary",
        "description": "Get a summary of all risks including counts by severity and status.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "search_meeting_notes",
        "description": "Search meeting notes for a customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID"
                },
                "search_term": {
                    "type": "string",
                    "description": "Search term to match against title or notes"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum number of results"
                }
            },
            "required": ["customer_id"]
        }
    },
    {
        "name": "create_meeting_note",
        "description": "Create a meeting note for a customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID"
                },
                "title": {
                    "type": "string",
                    "description": "Meeting title"
                },
                "meeting_date": {
                    "type": "string",
                    "description": "Meeting date in YYYY-MM-DD format (defaults to today)"
                },
                "attendees": {
                    "type": "string",
                    "description": "List of attendees"
                },
                "notes": {
                    "type": "string",
                    "description": "Meeting notes content"
                },
                "action_items": {
                    "type": "string",
                    "description": "Action items from the meeting"
                },
                "next_steps": {
                    "type": "string",
                    "description": "Next steps"
                }
            },
            "required": ["customer_id", "title"]
        }
    },
    {
        "name": "get_renewals_upcoming",
        "description": "Get customers with upcoming renewals within the specified number of days.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "default": 90,
                    "description": "Number of days to look ahead for renewals"
                }
            }
        }
    },
    # TargetProcess Integration Tools
    {
        "name": "tp_search",
        "description": "Search TargetProcess for work items (UserStory, Bug, Task, Feature, Epic). Returns matching items with basic info.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["UserStory", "Bug", "Task", "Feature", "Epic", "Request"],
                    "description": "Type of TP entity to search"
                },
                "filter": {
                    "type": "string",
                    "description": "Filter expression (e.g., \"EntityState.Name eq 'Open'\", \"Project.Name eq 'MyProject'\")"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum results to return"
                }
            },
            "required": ["entity_type"]
        }
    },
    {
        "name": "tp_get_details",
        "description": "Get detailed information about a specific TargetProcess item by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["UserStory", "Bug", "Task", "Feature", "Epic", "Request"],
                    "description": "Type of TP entity"
                },
                "entity_id": {
                    "type": "integer",
                    "description": "The TP entity ID"
                }
            },
            "required": ["entity_type", "entity_id"]
        }
    },
    {
        "name": "tp_create",
        "description": "Create a new item in TargetProcess (UserStory, Bug, Task, Feature).",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["UserStory", "Bug", "Task", "Feature", "Request"],
                    "description": "Type of entity to create"
                },
                "name": {
                    "type": "string",
                    "description": "Name/title of the item"
                },
                "description": {
                    "type": "string",
                    "description": "Description of the item"
                },
                "project_id": {
                    "type": "integer",
                    "description": "TP Project ID to create the item in"
                }
            },
            "required": ["entity_type", "name", "project_id"]
        }
    },
    {
        "name": "tp_update",
        "description": "Update an existing TargetProcess item (change name, description, state, etc.).",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["UserStory", "Bug", "Task", "Feature", "Epic", "Request"],
                    "description": "Type of entity"
                },
                "entity_id": {
                    "type": "integer",
                    "description": "Entity ID to update"
                },
                "name": {
                    "type": "string",
                    "description": "New name (optional)"
                },
                "description": {
                    "type": "string",
                    "description": "New description (optional)"
                },
                "state_id": {
                    "type": "integer",
                    "description": "New state ID (optional)"
                }
            },
            "required": ["entity_type", "entity_id"]
        }
    },
    {
        "name": "tp_add_comment",
        "description": "Add a comment to a TargetProcess item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {
                    "type": "integer",
                    "description": "Entity ID to comment on"
                },
                "comment": {
                    "type": "string",
                    "description": "Comment text"
                }
            },
            "required": ["entity_id", "comment"]
        }
    },
    {
        "name": "tp_get_comments",
        "description": "Get comments from a TargetProcess item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {
                    "type": "integer",
                    "description": "Entity ID to get comments for"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum comments to return"
                }
            },
            "required": ["entity_id"]
        }
    },
    # Write/Update Tools for CS Tracker data
    {
        "name": "update_customer",
        "description": "Update customer information (health status, notes, adoption stage, etc.).",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "integer",
                    "description": "Customer ID to update"
                },
                "health_status": {
                    "type": "string",
                    "enum": ["green", "yellow", "red"],
                    "description": "New health status"
                },
                "notes": {
                    "type": "string",
                    "description": "Notes to add"
                },
                "adoption_stage": {
                    "type": "string",
                    "enum": ["onboarding", "adoption", "value_realization", "expansion", "renewal"],
                    "description": "New adoption stage"
                }
            },
            "required": ["customer_id"]
        }
    },
    {
        "name": "update_task",
        "description": "Update an existing task (change status, priority, due date, assignee).",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer",
                    "description": "Task ID to update"
                },
                "status": {
                    "type": "string",
                    "enum": ["open", "in_progress", "completed", "cancelled"],
                    "description": "New status"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "urgent"],
                    "description": "New priority"
                },
                "due_date": {
                    "type": "string",
                    "description": "New due date (YYYY-MM-DD)"
                },
                "assignee_id": {
                    "type": "integer",
                    "description": "New assignee user ID"
                }
            },
            "required": ["task_id"]
        }
    },
    {
        "name": "update_risk",
        "description": "Update a risk (change severity, status, mitigation plan).",
        "input_schema": {
            "type": "object",
            "properties": {
                "risk_id": {
                    "type": "integer",
                    "description": "Risk ID to update"
                },
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "New severity"
                },
                "status": {
                    "type": "string",
                    "enum": ["open", "mitigating", "resolved", "accepted"],
                    "description": "New status"
                },
                "mitigation_plan": {
                    "type": "string",
                    "description": "Updated mitigation plan"
                },
                "resolution_notes": {
                    "type": "string",
                    "description": "Resolution notes (when resolving)"
                }
            },
            "required": ["risk_id"]
        }
    }
]

# Core tools for smaller models (Ollama 8b) - limited to most commonly used
CORE_TOOL_NAMES = [
    "search_customers",
    "get_customer_details",
    "get_portfolio_summary",
    "list_tasks",
    "list_risks",
    "get_risk_summary",
    "get_renewals_upcoming",
    "search_meeting_notes",
    "create_task",
    "log_engagement",
]

# Keyword to tool mapping for fast tool selection (Ollama optimization)
KEYWORD_TOOL_MAP = {
    # Risk-related keywords
    "risk": ["list_risks", "get_risk_summary"],
    "risks": ["list_risks", "get_risk_summary"],
    "danger": ["list_risks"],
    "issue": ["list_risks"],
    "problem": ["list_risks"],
    # Customer-related keywords
    "customer": ["search_customers", "get_customer_details"],
    "customers": ["search_customers"],
    "client": ["search_customers"],
    "account": ["search_customers"],
    # Task-related keywords
    "task": ["list_tasks"],
    "tasks": ["list_tasks"],
    "todo": ["list_tasks"],
    "action": ["list_tasks"],
    # Renewal-related keywords
    "renewal": ["get_renewals_upcoming"],
    "renewals": ["get_renewals_upcoming"],
    "expiring": ["get_renewals_upcoming"],
    "expire": ["get_renewals_upcoming"],
    # Portfolio/summary keywords
    "portfolio": ["get_portfolio_summary"],
    "summary": ["get_portfolio_summary", "get_risk_summary"],
    "overview": ["get_portfolio_summary"],
    # Meeting/engagement keywords
    "meeting": ["search_meeting_notes"],
    "notes": ["search_meeting_notes"],
    "engagement": ["search_meeting_notes", "log_engagement"],
}


class LLMService:
    """Service for handling LLM-powered chat interactions."""

    def __init__(self, db: AsyncSession, current_user: User, provider: AIProvider = None):
        self.db = db
        self.current_user = current_user
        self.provider = provider or get_ai_provider()
        self.actions_taken: List[ActionResult] = []

    def _can_write(self) -> bool:
        """Check if current user has write permissions."""
        return self.current_user.role not in [UserRole.READ_ONLY]

    def _select_tools_by_query(self, query: str) -> List[dict]:
        """Select the most relevant tools based on query keywords (for Ollama)."""
        query_lower = query.lower()
        selected_tool_names = set()

        # Find matching tools by keywords
        for keyword, tools in KEYWORD_TOOL_MAP.items():
            if keyword in query_lower:
                selected_tool_names.update(tools)

        # If no keywords matched, use a small default set
        if not selected_tool_names:
            selected_tool_names = {"search_customers", "get_portfolio_summary"}

        # Limit to 3 tools max for Ollama
        tool_names = list(selected_tool_names)[:3]

        return [t for t in TOOLS if t["name"] in tool_names]

    def _get_tools_for_provider(self, query: str = "") -> List[dict]:
        """Get appropriate tools based on AI provider type and query."""
        from app.services.ai_provider import OllamaProvider

        # For Ollama, use smart tool selection based on query keywords (max 3 tools)
        if isinstance(self.provider, OllamaProvider):
            return self._select_tools_by_query(query)
        return TOOLS

    def _get_user_context(self) -> str:
        """Get context about the current user for the system prompt."""
        return f"""
Current user: {self.current_user.full_name} (ID: {self.current_user.id})
Role: {self.current_user.role.value}
Can create/modify data: {self._can_write()}
"""

    async def chat(self, request: ChatRequest) -> ChatResponse:
        """Process a chat message and return a response."""
        self.actions_taken = []

        conversation_id = request.conversation_id or str(uuid.uuid4())

        # Build context from request
        context_info = ""
        if request.context:
            if request.context.customer_id:
                context_info = f"\nCurrent page context: Viewing customer ID {request.context.customer_id}"
            elif request.context.page:
                context_info = f"\nCurrent page: {request.context.page}"

        system_message = SYSTEM_PROMPT + self._get_user_context() + context_info

        messages = [AIMessage(role="user", content=request.message)]

        # Get appropriate tools for the provider (using query for smart selection)
        active_tools = self._get_tools_for_provider(request.message)

        # Call AI provider with tools
        try:
            response = await self.provider.chat(
                messages=messages,
                system_prompt=system_message,
                tools=active_tools,
                max_tokens=settings.llm_max_tokens
            )

            # Process tool calls
            final_response = await self._process_response(response, messages, system_message, active_tools)

            # Generate suggestions based on response
            suggestions = self._generate_suggestions(request, final_response)

            return ChatResponse(
                message=final_response,
                actions_taken=self.actions_taken,
                suggestions=suggestions,
                conversation_id=conversation_id
            )

        except Exception as e:
            logger.error(f"Error in LLM chat: {e}")
            return ChatResponse(
                message=f"I encountered an error processing your request: {str(e)}",
                actions_taken=[],
                suggestions=[],
                conversation_id=conversation_id
            )

    async def _process_response(self, response, messages: List[AIMessage], system_prompt: str, tools: List[dict]) -> str:
        """Process AI response, handling any tool calls."""
        max_iterations = 10  # Prevent infinite loops
        iteration = 0

        while response.stop_reason == "tool_use" and iteration < max_iterations:
            iteration += 1

            # Process tool calls
            tool_results = []
            for tool_call in response.tool_calls:
                result = await self._execute_tool(tool_call.name, tool_call.arguments)
                tool_results.append({
                    "tool_call_id": tool_call.id,
                    "name": tool_call.name,
                    "result": result
                })

            # Add assistant message with tool calls to conversation
            assistant_content = response.content
            if response.tool_calls:
                tool_call_info = ", ".join([f"{tc.name}" for tc in response.tool_calls])
                assistant_content = f"{response.content}\n[Called tools: {tool_call_info}]" if response.content else f"[Called tools: {tool_call_info}]"

            messages.append(AIMessage(role="assistant", content=assistant_content))

            # Add tool results as user message
            tool_results_text = "\n".join([
                f"Tool '{tr['name']}' result: {json.dumps(tr['result'])}"
                for tr in tool_results
            ])
            messages.append(AIMessage(role="user", content=f"Tool results:\n{tool_results_text}"))

            # Continue the conversation
            response = await self.provider.chat(
                messages=messages,
                system_prompt=system_prompt,
                tools=tools,
                max_tokens=settings.llm_max_tokens
            )

        return response.content

    async def _execute_tool(self, tool_name: str, tool_input: dict) -> dict:
        """Execute a tool and return the result."""
        try:
            if tool_name == "search_customers":
                return await self._search_customers(**tool_input)
            elif tool_name == "get_customer_details":
                return await self._get_customer_details(**tool_input)
            elif tool_name == "get_portfolio_summary":
                return await self._get_portfolio_summary()
            elif tool_name == "list_tasks":
                return await self._list_tasks(**tool_input)
            elif tool_name == "create_task":
                return await self._create_task(**tool_input)
            elif tool_name == "complete_task":
                return await self._complete_task(**tool_input)
            elif tool_name == "log_engagement":
                return await self._log_engagement(**tool_input)
            elif tool_name == "list_risks":
                return await self._list_risks(**tool_input)
            elif tool_name == "create_risk":
                return await self._create_risk(**tool_input)
            elif tool_name == "get_risk_summary":
                return await self._get_risk_summary()
            elif tool_name == "search_meeting_notes":
                return await self._search_meeting_notes(**tool_input)
            elif tool_name == "create_meeting_note":
                return await self._create_meeting_note(**tool_input)
            elif tool_name == "get_renewals_upcoming":
                return await self._get_renewals_upcoming(**tool_input)
            # TargetProcess tools
            elif tool_name == "tp_search":
                return await self._tp_search(**tool_input)
            elif tool_name == "tp_get_details":
                return await self._tp_get_details(**tool_input)
            elif tool_name == "tp_create":
                return await self._tp_create(**tool_input)
            elif tool_name == "tp_update":
                return await self._tp_update(**tool_input)
            elif tool_name == "tp_add_comment":
                return await self._tp_add_comment(**tool_input)
            elif tool_name == "tp_get_comments":
                return await self._tp_get_comments(**tool_input)
            # Update tools
            elif tool_name == "update_customer":
                return await self._update_customer(**tool_input)
            elif tool_name == "update_task":
                return await self._update_task(**tool_input)
            elif tool_name == "update_risk":
                return await self._update_risk(**tool_input)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            # Rollback on error to recover from failed transactions
            try:
                await self.db.rollback()
            except Exception:
                pass
            return {"error": str(e)}

    async def _search_customers(
        self,
        search_term: str = None,
        health_status: str = None,
        csm_id: int = None,
        limit: int = 10
    ) -> dict:
        """Search for customers."""
        query = select(Customer)

        # Apply filters
        if search_term:
            query = query.where(Customer.name.ilike(f"%{search_term}%"))
        if health_status:
            query = query.where(Customer.health_status == HealthStatus(health_status))
        if csm_id:
            query = query.where(Customer.csm_owner_id == csm_id)

        # Scope to user's customers if CSM or Account Manager
        if self.current_user.role == UserRole.CSM:
            query = query.where(Customer.csm_owner_id == self.current_user.id)
        elif self.current_user.role == UserRole.ACCOUNT_MANAGER:
            query = query.where(Customer.account_manager_id == self.current_user.id)

        query = query.limit(limit)
        result = await self.db.execute(query)
        customers = result.scalars().all()

        return {
            "customers": [
                {
                    "id": c.id,
                    "name": c.name,
                    "health_status": c.health_status.value,
                    "arr": float(c.arr) if c.arr else None,
                    "renewal_date": c.renewal_date.isoformat() if c.renewal_date else None,
                    "days_to_renewal": c.days_to_renewal,
                    "csm_owner_id": c.csm_owner_id
                }
                for c in customers
            ],
            "count": len(customers)
        }

    async def _get_customer_details(self, customer_id: int) -> dict:
        """Get full details for a customer."""
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

        # Check access
        if self.current_user.role == UserRole.CSM and customer.csm_owner_id != self.current_user.id:
            return {"error": "You don't have access to this customer"}
        if self.current_user.role == UserRole.ACCOUNT_MANAGER and customer.account_manager_id != self.current_user.id:
            return {"error": "You don't have access to this customer"}

        # Get recent tasks
        recent_tasks = sorted(
            [t for t in customer.tasks if t.status in [TaskStatus.OPEN, TaskStatus.IN_PROGRESS]],
            key=lambda t: t.due_date or datetime.max,
        )[:5]

        # Get open risks
        open_risks = [r for r in customer.risks if r.status in [RiskStatus.OPEN, RiskStatus.MITIGATING]]

        # Get recent engagements
        recent_engagements = sorted(
            customer.engagements,
            key=lambda e: e.engagement_date,
            reverse=True
        )[:5]

        return {
            "id": customer.id,
            "name": customer.name,
            "health_status": customer.health_status.value,
            "health_score": customer.health_score,
            "adoption_stage": customer.adoption_stage.value if customer.adoption_stage else None,
            "adoption_percentage": customer.adoption_percentage,
            "arr": float(customer.arr) if customer.arr else None,
            "renewal_date": customer.renewal_date.isoformat() if customer.renewal_date else None,
            "days_to_renewal": customer.days_to_renewal,
            "industry": customer.industry,
            "products_owned": customer.products_owned,
            "csm_owner": customer.csm_owner.full_name if customer.csm_owner else None,
            "last_contact_date": customer.last_contact_date.isoformat() if customer.last_contact_date else None,
            "open_tasks": [
                {"id": t.id, "title": t.title, "priority": t.priority.value, "due_date": t.due_date.isoformat() if t.due_date else None}
                for t in recent_tasks
            ],
            "open_risks": [
                {"id": r.id, "title": r.title, "severity": r.severity.value, "status": r.status.value}
                for r in open_risks
            ],
            "recent_engagements": [
                {"id": e.id, "type": e.engagement_type.value, "title": e.title, "date": e.engagement_date.isoformat()}
                for e in recent_engagements
            ]
        }

    async def _get_portfolio_summary(self) -> dict:
        """Get portfolio summary for current user."""
        # Base query for user's customers
        base_query = select(Customer)
        if self.current_user.role == UserRole.CSM:
            base_query = base_query.where(Customer.csm_owner_id == self.current_user.id)
        elif self.current_user.role == UserRole.ACCOUNT_MANAGER:
            base_query = base_query.where(Customer.account_manager_id == self.current_user.id)

        result = await self.db.execute(base_query)
        customers = result.scalars().all()

        # Calculate stats
        total_customers = len(customers)
        total_arr = sum(float(c.arr) for c in customers if c.arr)
        health_distribution = {"green": 0, "yellow": 0, "red": 0}
        for c in customers:
            health_distribution[c.health_status.value] += 1

        # Upcoming renewals (90 days)
        today = date.today()
        ninety_days = today + timedelta(days=90)
        upcoming_renewals = [
            c for c in customers
            if c.renewal_date and today <= c.renewal_date <= ninety_days
        ]

        return {
            "total_customers": total_customers,
            "total_arr": total_arr,
            "health_distribution": health_distribution,
            "at_risk_arr": sum(float(c.arr) for c in customers if c.arr and c.health_status in [HealthStatus.RED, HealthStatus.YELLOW]),
            "upcoming_renewals": {
                "count": len(upcoming_renewals),
                "arr": sum(float(c.arr) for c in upcoming_renewals if c.arr),
                "customers": [
                    {"id": c.id, "name": c.name, "arr": float(c.arr) if c.arr else None, "renewal_date": c.renewal_date.isoformat()}
                    for c in sorted(upcoming_renewals, key=lambda x: x.renewal_date)[:5]
                ]
            }
        }

    async def _list_tasks(
        self,
        customer_id: int = None,
        status: str = None,
        assignee_id: int = None,
        overdue_only: bool = False,
        limit: int = 10
    ) -> dict:
        """List tasks with filters."""
        query = select(Task).options(selectinload(Task.customer))

        if customer_id:
            query = query.where(Task.customer_id == customer_id)
        if status:
            query = query.where(Task.status == TaskStatus(status))
        if assignee_id:
            query = query.where(Task.assignee_id == assignee_id)
        elif assignee_id == "me" or (not customer_id and not assignee_id):
            # Default to current user's tasks
            query = query.where(Task.assignee_id == self.current_user.id)

        if overdue_only:
            query = query.where(
                and_(
                    Task.due_date < datetime.utcnow(),
                    Task.status.in_([TaskStatus.OPEN, TaskStatus.IN_PROGRESS])
                )
            )

        query = query.order_by(Task.due_date.asc().nullslast()).limit(limit)
        result = await self.db.execute(query)
        tasks = result.scalars().all()

        return {
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status.value,
                    "priority": t.priority.value,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "customer": {"id": t.customer.id, "name": t.customer.name} if t.customer else None,
                    "is_overdue": t.is_overdue
                }
                for t in tasks
            ],
            "count": len(tasks)
        }

    async def _create_task(
        self,
        title: str,
        description: str = None,
        customer_id: int = None,
        priority: str = "medium",
        due_date: str = None,
        assignee_id: int = None
    ) -> dict:
        """Create a new task."""
        if not self._can_write():
            return {"error": "You don't have permission to create tasks"}

        # Validate customer access if provided
        if customer_id:
            customer = await self.db.get(Customer, customer_id)
            if not customer:
                return {"error": "Customer not found"}
            if self.current_user.role == UserRole.CSM and customer.csm_owner_id != self.current_user.id:
                return {"error": "You don't have access to this customer"}

        task = Task(
            title=title,
            description=description,
            customer_id=customer_id,
            priority=TaskPriority(priority),
            due_date=datetime.fromisoformat(due_date) if due_date else None,
            assignee_id=assignee_id or self.current_user.id,
            created_by_id=self.current_user.id
        )
        self.db.add(task)
        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="task_created",
            entity_type="task",
            entity_id=task.id,
            summary=f"Created task: {title}"
        ))

        return {
            "success": True,
            "task_id": task.id,
            "message": f"Task '{title}' created successfully"
        }

    async def _complete_task(self, task_id: int, completion_notes: str = None) -> dict:
        """Mark a task as completed."""
        if not self._can_write():
            return {"error": "You don't have permission to complete tasks"}

        task = await self.db.get(Task, task_id)
        if not task:
            return {"error": "Task not found"}

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        if completion_notes:
            task.completion_notes = completion_notes

        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="task_completed",
            entity_type="task",
            entity_id=task.id,
            summary=f"Completed task: {task.title}"
        ))

        return {
            "success": True,
            "message": f"Task '{task.title}' marked as completed"
        }

    async def _log_engagement(
        self,
        customer_id: int,
        engagement_type: str,
        title: str,
        summary: str = None,
        engagement_date: str = None
    ) -> dict:
        """Log a customer engagement."""
        if not self._can_write():
            return {"error": "You don't have permission to log engagements"}

        customer = await self.db.get(Customer, customer_id)
        if not customer:
            return {"error": "Customer not found"}

        engagement = Engagement(
            customer_id=customer_id,
            engagement_type=EngagementType(engagement_type),
            title=title,
            summary=summary,
            engagement_date=datetime.fromisoformat(engagement_date) if engagement_date else datetime.utcnow(),
            created_by_id=self.current_user.id
        )
        self.db.add(engagement)

        # Update customer last contact date
        customer.last_contact_date = engagement.engagement_date

        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="engagement_logged",
            entity_type="engagement",
            entity_id=engagement.id,
            summary=f"Logged {engagement_type}: {title}"
        ))

        return {
            "success": True,
            "engagement_id": engagement.id,
            "message": f"Engagement '{title}' logged successfully"
        }

    async def _list_risks(
        self,
        customer_id: int = None,
        severity: str = None,
        status: str = None,
        open_only: bool = True,
        limit = None
    ) -> dict:
        """List risks with filters."""
        # Ensure valid limit (default to 10 if invalid)
        try:
            limit = int(limit) if limit is not None else 10
            if limit <= 0:
                limit = 10
        except (ValueError, TypeError):
            limit = 10

        query = select(Risk).options(selectinload(Risk.customer))

        if customer_id:
            query = query.where(Risk.customer_id == customer_id)
        if severity and severity not in ('null', 'None', None):
            try:
                query = query.where(Risk.severity == RiskSeverity(severity.lower()))
            except ValueError:
                pass  # Invalid severity, ignore filter
        if status and status not in ('null', 'None', None):
            # Handle both string and list status
            if isinstance(status, list):
                valid_statuses = []
                for s in status:
                    try:
                        valid_statuses.append(RiskStatus(s.lower() if isinstance(s, str) else s))
                    except ValueError:
                        pass
                if valid_statuses:
                    query = query.where(Risk.status.in_(valid_statuses))
            else:
                try:
                    query = query.where(Risk.status == RiskStatus(status.lower()))
                except ValueError:
                    pass  # Invalid status, ignore filter
        elif open_only:
            query = query.where(Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING]))

        query = query.order_by(Risk.severity.desc(), Risk.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        risks = result.scalars().all()

        return {
            "risks": [
                {
                    "id": r.id,
                    "title": r.title,
                    "severity": r.severity.value,
                    "status": r.status.value,
                    "category": r.category.value if r.category else None,
                    "customer": {"id": r.customer.id, "name": r.customer.name} if r.customer else None,
                    "created_at": r.created_at.isoformat()
                }
                for r in risks
            ],
            "count": len(risks)
        }

    async def _create_risk(
        self,
        customer_id: int,
        title: str,
        description: str = None,
        severity: str = "medium",
        category: str = None,
        mitigation_plan: str = None
    ) -> dict:
        """Create a new risk."""
        if not self._can_write():
            return {"error": "You don't have permission to create risks"}

        customer = await self.db.get(Customer, customer_id)
        if not customer:
            return {"error": "Customer not found"}

        risk = Risk(
            customer_id=customer_id,
            title=title,
            description=description,
            severity=RiskSeverity(severity),
            category=RiskCategory(category) if category else None,
            mitigation_plan=mitigation_plan,
            owner_id=self.current_user.id,
            created_by_id=self.current_user.id
        )
        self.db.add(risk)
        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="risk_created",
            entity_type="risk",
            entity_id=risk.id,
            summary=f"Created {severity} risk: {title}"
        ))

        return {
            "success": True,
            "risk_id": risk.id,
            "message": f"Risk '{title}' created successfully"
        }

    async def _get_risk_summary(self) -> dict:
        """Get risk summary statistics."""
        # Total open risks
        open_statuses = [RiskStatus.OPEN, RiskStatus.MITIGATING]

        total_open = await self.db.scalar(
            select(func.count()).select_from(Risk).where(Risk.status.in_(open_statuses))
        )

        # By severity
        by_severity = {}
        for severity in RiskSeverity:
            count = await self.db.scalar(
                select(func.count()).select_from(Risk).where(
                    and_(Risk.severity == severity, Risk.status.in_(open_statuses))
                )
            )
            by_severity[severity.value] = count or 0

        # By status
        by_status = {}
        for status in RiskStatus:
            count = await self.db.scalar(
                select(func.count()).select_from(Risk).where(Risk.status == status)
            )
            by_status[status.value] = count or 0

        return {
            "total_open": total_open or 0,
            "by_severity": by_severity,
            "by_status": by_status
        }

    async def _search_meeting_notes(
        self,
        customer_id: int,
        search_term: str = None,
        limit: int = 10
    ) -> dict:
        """Search meeting notes for a customer."""
        query = select(MeetingNote).where(MeetingNote.customer_id == customer_id)

        if search_term:
            query = query.where(
                or_(
                    MeetingNote.title.ilike(f"%{search_term}%"),
                    MeetingNote.notes.ilike(f"%{search_term}%")
                )
            )

        query = query.order_by(MeetingNote.meeting_date.desc()).limit(limit)
        result = await self.db.execute(query)
        notes = result.scalars().all()

        return {
            "meeting_notes": [
                {
                    "id": n.id,
                    "title": n.title,
                    "meeting_date": n.meeting_date.isoformat(),
                    "attendees": n.attendees,
                    "notes_preview": n.notes[:200] if n.notes else None,
                    "action_items": n.action_items
                }
                for n in notes
            ],
            "count": len(notes)
        }

    async def _create_meeting_note(
        self,
        customer_id: int,
        title: str,
        meeting_date: str = None,
        attendees: str = None,
        notes: str = None,
        action_items: str = None,
        next_steps: str = None
    ) -> dict:
        """Create a meeting note."""
        if not self._can_write():
            return {"error": "You don't have permission to create meeting notes"}

        customer = await self.db.get(Customer, customer_id)
        if not customer:
            return {"error": "Customer not found"}

        note = MeetingNote(
            customer_id=customer_id,
            title=title,
            meeting_date=date.fromisoformat(meeting_date) if meeting_date else date.today(),
            attendees=attendees,
            notes=notes,
            action_items=action_items,
            next_steps=next_steps,
            created_by_id=self.current_user.id
        )
        self.db.add(note)
        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="meeting_note_created",
            entity_type="meeting_note",
            entity_id=note.id,
            summary=f"Created meeting note: {title}"
        ))

        return {
            "success": True,
            "meeting_note_id": note.id,
            "message": f"Meeting note '{title}' created successfully"
        }

    async def _get_renewals_upcoming(self, days: int = 90) -> dict:
        """Get customers with upcoming renewals."""
        today = date.today()
        end_date = today + timedelta(days=days)

        query = select(Customer).where(
            and_(
                Customer.renewal_date >= today,
                Customer.renewal_date <= end_date
            )
        ).order_by(Customer.renewal_date)

        # Scope to user's customers if needed
        if self.current_user.role == UserRole.CSM:
            query = query.where(Customer.csm_owner_id == self.current_user.id)
        elif self.current_user.role == UserRole.ACCOUNT_MANAGER:
            query = query.where(Customer.account_manager_id == self.current_user.id)

        result = await self.db.execute(query)
        customers = result.scalars().all()

        return {
            "renewals": [
                {
                    "id": c.id,
                    "name": c.name,
                    "health_status": c.health_status.value,
                    "arr": float(c.arr) if c.arr else None,
                    "renewal_date": c.renewal_date.isoformat(),
                    "days_to_renewal": c.days_to_renewal
                }
                for c in customers
            ],
            "count": len(customers),
            "total_arr": sum(float(c.arr) for c in customers if c.arr)
        }

    # ================================================================
    # TargetProcess Tool Handlers
    # ================================================================

    async def _tp_search(
        self,
        entity_type: str,
        filter: str = None,
        limit: int = 10
    ) -> dict:
        """Search TargetProcess entities."""
        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        include = ["Project", "AssignedUser", "EntityState"]
        result = await tp_service.search_entities(
            entity_type=entity_type,
            where=filter,
            include=include,
            take=limit
        )

        if "error" in result:
            return result

        # Format items for response
        items = []
        for item in result.get("items", []):
            items.append({
                "id": item.get("Id"),
                "name": item.get("Name"),
                "state": item.get("EntityState", {}).get("Name") if item.get("EntityState") else None,
                "project": item.get("Project", {}).get("Name") if item.get("Project") else None,
                "assigned_to": item.get("AssignedUser", {}).get("FirstName", "") + " " + item.get("AssignedUser", {}).get("LastName", "") if item.get("AssignedUser") else None
            })

        return {
            "items": items,
            "count": len(items),
            "entity_type": entity_type
        }

    async def _tp_get_details(
        self,
        entity_type: str,
        entity_id: int
    ) -> dict:
        """Get detailed TP entity information."""
        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        include = ["Project", "AssignedUser", "EntityState", "Description"]
        result = await tp_service.get_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            include=include
        )

        if "error" in result:
            return result

        return {
            "id": result.get("Id"),
            "name": result.get("Name"),
            "description": result.get("Description"),
            "state": result.get("EntityState", {}).get("Name") if result.get("EntityState") else None,
            "project": result.get("Project", {}).get("Name") if result.get("Project") else None,
            "assigned_to": result.get("AssignedUser", {}).get("FirstName", "") + " " + result.get("AssignedUser", {}).get("LastName", "") if result.get("AssignedUser") else None,
            "create_date": result.get("CreateDate"),
            "modify_date": result.get("ModifyDate"),
            "entity_type": entity_type
        }

    async def _tp_create(
        self,
        entity_type: str,
        name: str,
        project_id: int,
        description: str = None
    ) -> dict:
        """Create a new TP entity."""
        if not self._can_write():
            return {"error": "You don't have permission to create TargetProcess items"}

        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        data = {
            "Name": name,
            "Project": {"Id": project_id}
        }
        if description:
            data["Description"] = description

        result = await tp_service.create_entity(entity_type, data)

        if "error" in result:
            return result

        self.actions_taken.append(ActionResult(
            action_type="tp_entity_created",
            entity_type=entity_type,
            entity_id=result.get("id"),
            summary=f"Created TP {entity_type}: {name}"
        ))

        return {
            "success": True,
            "id": result.get("id"),
            "message": f"Created {entity_type} '{name}' in TargetProcess"
        }

    async def _tp_update(
        self,
        entity_type: str,
        entity_id: int,
        name: str = None,
        description: str = None,
        state_id: int = None
    ) -> dict:
        """Update a TP entity."""
        if not self._can_write():
            return {"error": "You don't have permission to update TargetProcess items"}

        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        data = {}
        if name:
            data["Name"] = name
        if description:
            data["Description"] = description
        if state_id:
            data["EntityState"] = {"Id": state_id}

        if not data:
            return {"error": "No fields to update"}

        result = await tp_service.update_entity(entity_type, entity_id, data)

        if "error" in result:
            return result

        self.actions_taken.append(ActionResult(
            action_type="tp_entity_updated",
            entity_type=entity_type,
            entity_id=entity_id,
            summary=f"Updated TP {entity_type} #{entity_id}"
        ))

        return {
            "success": True,
            "message": f"Updated {entity_type} #{entity_id} in TargetProcess"
        }

    async def _tp_add_comment(
        self,
        entity_id: int,
        comment: str
    ) -> dict:
        """Add a comment to a TP entity."""
        if not self._can_write():
            return {"error": "You don't have permission to add comments"}

        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        result = await tp_service.add_comment("General", entity_id, comment)

        if "error" in result:
            return result

        self.actions_taken.append(ActionResult(
            action_type="tp_comment_added",
            entity_type="Comment",
            entity_id=result.get("comment_id"),
            summary=f"Added comment to TP item #{entity_id}"
        ))

        return {
            "success": True,
            "comment_id": result.get("comment_id"),
            "message": f"Added comment to TP item #{entity_id}"
        }

    async def _tp_get_comments(
        self,
        entity_id: int,
        limit: int = 10
    ) -> dict:
        """Get comments from a TP entity."""
        tp_service = get_tp_service()
        if not tp_service.is_available():
            return {"error": "TargetProcess is not configured"}

        result = await tp_service.get_comments(entity_id, limit)

        if "error" in result:
            return result

        return result

    # ================================================================
    # CS Tracker Update Tool Handlers
    # ================================================================

    async def _update_customer(
        self,
        customer_id: int,
        health_status: str = None,
        notes: str = None,
        adoption_stage: str = None
    ) -> dict:
        """Update customer information."""
        if not self._can_write():
            return {"error": "You don't have permission to update customers"}

        customer = await self.db.get(Customer, customer_id)
        if not customer:
            return {"error": "Customer not found"}

        # Check access
        if self.current_user.role == UserRole.CSM and customer.csm_owner_id != self.current_user.id:
            return {"error": "You don't have access to this customer"}
        if self.current_user.role == UserRole.ACCOUNT_MANAGER and customer.account_manager_id != self.current_user.id:
            return {"error": "You don't have access to this customer"}

        updates = []
        if health_status:
            customer.health_status = HealthStatus(health_status)
            updates.append(f"health status to {health_status}")
        if notes:
            # Append to existing notes
            existing = customer.notes or ""
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            customer.notes = f"{existing}\n\n[{timestamp}] {notes}".strip()
            updates.append("added notes")
        if adoption_stage:
            from app.models.customer import AdoptionStage
            customer.adoption_stage = AdoptionStage(adoption_stage)
            updates.append(f"adoption stage to {adoption_stage}")

        if not updates:
            return {"error": "No fields to update"}

        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="customer_updated",
            entity_type="customer",
            entity_id=customer_id,
            summary=f"Updated customer: {', '.join(updates)}"
        ))

        return {
            "success": True,
            "message": f"Updated customer '{customer.name}': {', '.join(updates)}"
        }

    async def _update_task(
        self,
        task_id: int,
        status: str = None,
        priority: str = None,
        due_date: str = None,
        assignee_id: int = None
    ) -> dict:
        """Update a task."""
        if not self._can_write():
            return {"error": "You don't have permission to update tasks"}

        task = await self.db.get(Task, task_id)
        if not task:
            return {"error": "Task not found"}

        updates = []
        if status:
            task.status = TaskStatus(status)
            updates.append(f"status to {status}")
            if status == "completed":
                task.completed_at = datetime.utcnow()
        if priority:
            task.priority = TaskPriority(priority)
            updates.append(f"priority to {priority}")
        if due_date:
            task.due_date = datetime.fromisoformat(due_date)
            updates.append(f"due date to {due_date}")
        if assignee_id:
            task.assignee_id = assignee_id
            updates.append(f"assignee to user #{assignee_id}")

        if not updates:
            return {"error": "No fields to update"}

        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="task_updated",
            entity_type="task",
            entity_id=task_id,
            summary=f"Updated task: {', '.join(updates)}"
        ))

        return {
            "success": True,
            "message": f"Updated task '{task.title}': {', '.join(updates)}"
        }

    async def _update_risk(
        self,
        risk_id: int,
        severity: str = None,
        status: str = None,
        mitigation_plan: str = None,
        resolution_notes: str = None
    ) -> dict:
        """Update a risk."""
        if not self._can_write():
            return {"error": "You don't have permission to update risks"}

        risk = await self.db.get(Risk, risk_id)
        if not risk:
            return {"error": "Risk not found"}

        updates = []
        if severity:
            risk.severity = RiskSeverity(severity)
            updates.append(f"severity to {severity}")
        if status:
            risk.status = RiskStatus(status)
            updates.append(f"status to {status}")
            if status == "resolved":
                risk.resolved_at = datetime.utcnow()
        if mitigation_plan:
            risk.mitigation_plan = mitigation_plan
            updates.append("mitigation plan")
        if resolution_notes:
            risk.resolution_notes = resolution_notes
            updates.append("resolution notes")

        if not updates:
            return {"error": "No fields to update"}

        await self.db.flush()

        self.actions_taken.append(ActionResult(
            action_type="risk_updated",
            entity_type="risk",
            entity_id=risk_id,
            summary=f"Updated risk: {', '.join(updates)}"
        ))

        return {
            "success": True,
            "message": f"Updated risk '{risk.title}': {', '.join(updates)}"
        }

    def _generate_suggestions(self, request: ChatRequest, response: str) -> List[str]:
        """Generate follow-up suggestions based on the conversation."""
        suggestions = []

        # Context-based suggestions
        if request.context and request.context.customer_id:
            suggestions.append("Show me open tasks for this customer")
            suggestions.append("What risks exist for this customer?")

        # Response-based suggestions
        if "risk" in response.lower():
            suggestions.append("Show me the risk summary")
        if "renewal" in response.lower():
            suggestions.append("Show upcoming renewals in 30 days")
        if "task" in response.lower() and "created" not in response.lower():
            suggestions.append("Create a follow-up task")

        # Default suggestions
        if not suggestions:
            suggestions = [
                "Show my portfolio summary",
                "What are my overdue tasks?",
                "Show at-risk customers"
            ]

        return suggestions[:3]
