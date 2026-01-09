from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "CustomerStatusTracker"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/cstracker"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # IBM w3id SSO
    w3id_client_id: Optional[str] = None
    w3id_client_secret: Optional[str] = None
    w3id_issuer_url: str = "https://login.w3.ibm.com/oidc/endpoint/default"
    w3id_redirect_uri: str = "http://localhost:3000/auth/callback"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]

    # Future integrations
    salesforce_client_id: Optional[str] = None
    salesforce_client_secret: Optional[str] = None
    gainsight_api_key: Optional[str] = None
    targetprocess_api_token: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
