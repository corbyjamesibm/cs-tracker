"""
TargetProcess API integration service.

Provides methods to query and update TargetProcess entities.
"""
import logging
from typing import Optional, Dict, Any, List
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class TargetProcessService:
    """Service for interacting with TargetProcess API."""

    def __init__(self):
        self.base_url = settings.targetprocess_base_url.rstrip('/')
        self.api_token = settings.targetprocess_api_token
        self.timeout = 30

    def is_available(self) -> bool:
        """Check if TP is configured."""
        return bool(self.api_token)

    def _get_headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    async def search_entities(
        self,
        entity_type: str,
        where: Optional[str] = None,
        include: Optional[List[str]] = None,
        take: int = 25
    ) -> Dict[str, Any]:
        """
        Search TargetProcess entities.

        Args:
            entity_type: Type of entity (UserStory, Bug, Task, Feature, Epic, etc.)
            where: Filter expression (e.g., "EntityState.Name eq 'Open'")
            include: Related data to include (e.g., ["Project", "AssignedUser"])
            take: Number of results to return

        Returns:
            Dict with items and metadata
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/{entity_type}"
        params = {
            "take": take,
            "format": "json"
        }

        if where:
            params["where"] = where
        if include:
            params["include"] = f"[{','.join(include)}]"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()

                items = data.get("Items", [])
                return {
                    "items": items,
                    "count": len(items),
                    "entity_type": entity_type
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"TP API error: {e.response.status_code}")
            return {"error": f"TP API error: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}

    async def get_entity(
        self,
        entity_type: str,
        entity_id: int,
        include: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get a specific TargetProcess entity by ID.

        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            include: Related data to include

        Returns:
            Entity data or error
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/{entity_type}/{entity_id}"
        params = {"format": "json"}

        if include:
            params["include"] = f"[{','.join(include)}]"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return {"error": f"{entity_type} #{entity_id} not found"}
            return {"error": f"TP API error: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}

    async def create_entity(
        self,
        entity_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new TargetProcess entity.

        Args:
            entity_type: Type of entity to create
            data: Entity data (name, description, project, etc.)

        Returns:
            Created entity or error
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/{entity_type}"
        params = {"format": "json"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    json=data
                )
                response.raise_for_status()
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("Id"),
                    "entity": result
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"TP create error: {e.response.text}")
            return {"error": f"Failed to create {entity_type}: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}

    async def update_entity(
        self,
        entity_type: str,
        entity_id: int,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a TargetProcess entity.

        Args:
            entity_type: Type of entity
            entity_id: Entity ID to update
            data: Fields to update

        Returns:
            Updated entity or error
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/{entity_type}/{entity_id}"
        params = {"format": "json"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    json=data
                )
                response.raise_for_status()
                result = response.json()
                return {
                    "success": True,
                    "entity": result
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"TP update error: {e.response.text}")
            return {"error": f"Failed to update {entity_type} #{entity_id}: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}

    async def add_comment(
        self,
        entity_type: str,
        entity_id: int,
        comment: str
    ) -> Dict[str, Any]:
        """
        Add a comment to a TargetProcess entity.

        Args:
            entity_type: Type of entity (UserStory, Bug, etc.)
            entity_id: Entity ID
            comment: Comment text

        Returns:
            Created comment or error
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/Comments"
        params = {"format": "json"}

        data = {
            "Description": comment,
            "General": {"Id": entity_id}
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    json=data
                )
                response.raise_for_status()
                result = response.json()
                return {
                    "success": True,
                    "comment_id": result.get("Id")
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"TP comment error: {e.response.text}")
            return {"error": f"Failed to add comment: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}

    async def get_comments(
        self,
        entity_id: int,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get comments for an entity.

        Args:
            entity_id: Entity ID
            limit: Max comments to return

        Returns:
            List of comments
        """
        if not self.is_available():
            return {"error": "TargetProcess not configured"}

        url = f"{self.base_url}/api/v1/Comments"
        params = {
            "where": f"General.Id eq {entity_id}",
            "take": limit,
            "orderByDesc": "CreateDate",
            "include": "[Owner]",
            "format": "json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()

                comments = []
                for item in data.get("Items", []):
                    comments.append({
                        "id": item.get("Id"),
                        "text": item.get("Description"),
                        "author": item.get("Owner", {}).get("FirstName", "") + " " + item.get("Owner", {}).get("LastName", ""),
                        "created": item.get("CreateDate")
                    })

                return {"comments": comments, "count": len(comments)}

        except Exception as e:
            logger.error(f"TP error: {e}")
            return {"error": str(e)}


# Singleton instance
_tp_service = None


def get_tp_service() -> TargetProcessService:
    """Get the TargetProcess service instance."""
    global _tp_service
    if _tp_service is None:
        _tp_service = TargetProcessService()
    return _tp_service
