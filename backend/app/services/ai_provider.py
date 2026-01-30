"""
AI Provider abstraction layer for LLM integration.

Supports multiple providers:
- Ollama (free, local) - default
- Anthropic Claude (paid API)

The provider can be switched via configuration without changing application code.
"""
import json
import logging
import httpx
from abc import ABC, abstractmethod
from typing import Optional, List, Any, Dict
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class AIMessage:
    """Represents a message in a conversation."""
    role: str  # "user", "assistant", "system"
    content: str


@dataclass
class AIToolCall:
    """Represents a tool call request from the AI."""
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class AIResponse:
    """Represents a response from the AI provider."""
    content: str
    tool_calls: List[AIToolCall]
    stop_reason: str  # "end_turn", "tool_use", "max_tokens"
    raw_response: Any = None


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def chat(
        self,
        messages: List[AIMessage],
        system_prompt: str = "",
        tools: Optional[List[Dict]] = None,
        max_tokens: int = 4096
    ) -> AIResponse:
        """Send a chat message and get a response."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available and configured."""
        pass


class OllamaProvider(AIProvider):
    """Ollama provider for local LLM inference."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout

    def is_available(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")
            return False

    async def chat(
        self,
        messages: List[AIMessage],
        system_prompt: str = "",
        tools: Optional[List[Dict]] = None,
        max_tokens: int = 4096
    ) -> AIResponse:
        """Send a chat message to Ollama."""
        # Convert messages to Ollama format
        ollama_messages = []

        if system_prompt:
            ollama_messages.append({
                "role": "system",
                "content": system_prompt
            })

        for msg in messages:
            ollama_messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Build request payload
        payload = {
            "model": self.model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens
            }
        }

        # Add tools if provided (Ollama supports function calling in newer versions)
        if tools:
            # Convert Anthropic-style tools to Ollama format
            ollama_tools = self._convert_tools_to_ollama(tools)
            if ollama_tools:
                payload["tools"] = ollama_tools

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

                # Parse response
                message = result.get("message", {})
                content = message.get("content", "")
                tool_calls = []

                # Check for tool calls in response
                if "tool_calls" in message:
                    for tc in message["tool_calls"]:
                        # Handle arguments - may be string (JSON) or dict
                        args = tc.get("function", {}).get("arguments", {})
                        if isinstance(args, str):
                            args = json.loads(args) if args else {}

                        tool_calls.append(AIToolCall(
                            id=tc.get("id", f"call_{len(tool_calls)}"),
                            name=tc.get("function", {}).get("name", ""),
                            arguments=args
                        ))

                stop_reason = "tool_use" if tool_calls else "end_turn"

                return AIResponse(
                    content=content,
                    tool_calls=tool_calls,
                    stop_reason=stop_reason,
                    raw_response=result
                )

        except httpx.TimeoutException:
            logger.error("Ollama request timed out")
            raise Exception("AI request timed out. The model may be loading or the request is too complex.")
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e}")
            raise Exception(f"AI service error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise

    def _convert_tools_to_ollama(self, tools: List[Dict]) -> List[Dict]:
        """Convert Anthropic-style tools to Ollama format."""
        ollama_tools = []
        for tool in tools:
            ollama_tools.append({
                "type": "function",
                "function": {
                    "name": tool.get("name"),
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {})
                }
            })
        return ollama_tools


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""

    def __init__(self):
        self.api_key = settings.anthropic_api_key
        self.model = settings.anthropic_model

    def is_available(self) -> bool:
        """Check if Anthropic API key is configured."""
        return bool(self.api_key)

    async def chat(
        self,
        messages: List[AIMessage],
        system_prompt: str = "",
        tools: Optional[List[Dict]] = None,
        max_tokens: int = 4096
    ) -> AIResponse:
        """Send a chat message to Anthropic Claude."""
        try:
            from anthropic import Anthropic

            client = Anthropic(api_key=self.api_key)

            # Convert messages to Anthropic format
            anthropic_messages = [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]

            # Build request
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": anthropic_messages
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            if tools:
                kwargs["tools"] = tools

            response = client.messages.create(**kwargs)

            # Parse response
            content = ""
            tool_calls = []

            for block in response.content:
                if hasattr(block, "text"):
                    content += block.text
                elif block.type == "tool_use":
                    tool_calls.append(AIToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input
                    ))

            stop_reason = "tool_use" if response.stop_reason == "tool_use" else "end_turn"

            return AIResponse(
                content=content,
                tool_calls=tool_calls,
                stop_reason=stop_reason,
                raw_response=response
            )

        except ImportError:
            raise Exception("Anthropic library not installed. Run: pip install anthropic")
        except Exception as e:
            logger.error(f"Anthropic error: {e}")
            raise


def get_ai_provider() -> AIProvider:
    """
    Get the configured AI provider.

    Priority:
    1. Use configured provider from settings
    2. Fall back to available provider

    Returns:
        AIProvider: The configured or available AI provider

    Raises:
        Exception: If no provider is available
    """
    provider_name = settings.llm_provider.lower()

    # Try configured provider first
    if provider_name == "ollama":
        provider = OllamaProvider()
        if provider.is_available():
            logger.info(f"Using Ollama provider with model: {settings.ollama_model}")
            return provider
        logger.warning("Ollama not available, checking Anthropic...")

    if provider_name == "anthropic" or provider_name != "ollama":
        provider = AnthropicProvider()
        if provider.is_available():
            logger.info(f"Using Anthropic provider with model: {settings.anthropic_model}")
            return provider

    # Try fallbacks
    ollama = OllamaProvider()
    if ollama.is_available():
        logger.info("Falling back to Ollama provider")
        return ollama

    anthropic = AnthropicProvider()
    if anthropic.is_available():
        logger.info("Falling back to Anthropic provider")
        return anthropic

    raise Exception(
        "No AI provider available. Please either:\n"
        "1. Start Ollama: ollama serve\n"
        "2. Set ANTHROPIC_API_KEY in environment"
    )


async def check_ai_status() -> Dict[str, Any]:
    """Check the status of AI providers."""
    ollama = OllamaProvider()
    anthropic = AnthropicProvider()

    ollama_available = ollama.is_available()
    anthropic_available = anthropic.is_available()

    # Get Ollama models if available
    ollama_models = []
    if ollama_available:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.ollama_base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    ollama_models = [m.get("name") for m in data.get("models", [])]
        except Exception:
            pass

    return {
        "configured_provider": settings.llm_provider,
        "ollama": {
            "available": ollama_available,
            "base_url": settings.ollama_base_url,
            "model": settings.ollama_model,
            "installed_models": ollama_models
        },
        "anthropic": {
            "available": anthropic_available,
            "model": settings.anthropic_model
        },
        "active_provider": "ollama" if ollama_available and settings.llm_provider == "ollama" else (
            "anthropic" if anthropic_available else None
        )
    }
