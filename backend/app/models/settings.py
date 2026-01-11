from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class SettingValueType(str, enum.Enum):
    STRING = "string"
    BOOLEAN = "boolean"
    INTEGER = "integer"
    JSON = "json"


class AppSetting(Base):
    """Application settings stored in database for feature flags and configuration."""
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    value_type: Mapped[SettingValueType] = mapped_column(
        String(20), default=SettingValueType.STRING
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def get_typed_value(self):
        """Return the value converted to its proper type."""
        if self.value_type == SettingValueType.BOOLEAN:
            return self.value.lower() in ('true', '1', 'yes')
        elif self.value_type == SettingValueType.INTEGER:
            return int(self.value)
        elif self.value_type == SettingValueType.JSON:
            import json
            return json.loads(self.value)
        return self.value

    def __repr__(self) -> str:
        return f"<AppSetting {self.key}={self.value}>"
