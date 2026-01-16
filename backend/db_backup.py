"""
Database Backup and Restore Utility for CS Tracker

Provides data export/import in JSON format, which is useful for:
- Preserving data across schema migrations
- Human-readable backups
- Selective data restoration

Usage:
    python db_backup.py backup                    # Create timestamped backup
    python db_backup.py backup --name mybackup   # Create named backup
    python db_backup.py restore <backup_file>    # Restore from backup
    python db_backup.py list                     # List available backups
"""
import asyncio
import json
import sys
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, engine


BACKUP_DIR = Path(__file__).parent / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

# Tables to backup in order (respects foreign key dependencies)
TABLES_ORDER = [
    "app_settings",
    "partners",
    "users",
    "partner_users",
    "customers",
    "contacts",
    "adoption_history",
    "tasks",
    "engagements",
    "use_cases",
    "customer_use_cases",
    "roadmaps",
    "roadmap_items",
    "assessment_templates",
    "assessment_dimensions",
    "assessment_questions",
    "customer_assessments",
    "assessment_responses",
    "risks",
    "custom_field_definitions",
    "custom_field_values",
]


def json_serializer(obj: Any) -> Any:
    """Custom JSON serializer for non-standard types."""
    if isinstance(obj, datetime):
        return {"__type__": "datetime", "value": obj.isoformat()}
    elif isinstance(obj, date):
        return {"__type__": "date", "value": obj.isoformat()}
    elif isinstance(obj, Decimal):
        return {"__type__": "decimal", "value": str(obj)}
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def json_deserializer(obj: dict) -> Any:
    """Custom JSON deserializer for non-standard types."""
    if "__type__" in obj:
        if obj["__type__"] == "datetime":
            return datetime.fromisoformat(obj["value"])
        elif obj["__type__"] == "date":
            return date.fromisoformat(obj["value"])
        elif obj["__type__"] == "decimal":
            return Decimal(obj["value"])
    return obj


async def get_table_data(session: AsyncSession, table_name: str) -> list[dict]:
    """Fetch all data from a table."""
    try:
        result = await session.execute(text(f"SELECT * FROM {table_name}"))
        columns = result.keys()
        rows = result.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        print(f"  Warning: Could not read table {table_name}: {e}")
        return []


async def backup_database(backup_name: str = None) -> Path:
    """Create a full database backup in JSON format."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"cstracker_data_{backup_name or timestamp}.json"
    backup_path = BACKUP_DIR / filename

    print("=== CS Tracker Data Backup ===")
    print(f"Output: {backup_path}")
    print("")

    backup_data = {
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "version": "1.0",
            "app": "CS Tracker"
        },
        "tables": {}
    }

    async with async_session() as session:
        # Get list of actual tables in database
        result = await session.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        ))
        existing_tables = {row[0] for row in result.fetchall()}

        for table_name in TABLES_ORDER:
            if table_name not in existing_tables:
                continue

            print(f"  Backing up {table_name}...", end=" ")
            data = await get_table_data(session, table_name)
            backup_data["tables"][table_name] = data
            print(f"{len(data)} rows")

    # Write backup file
    with open(backup_path, "w") as f:
        json.dump(backup_data, f, default=json_serializer, indent=2)

    file_size = backup_path.stat().st_size / 1024
    print("")
    print(f"Backup completed: {backup_path}")
    print(f"Size: {file_size:.1f} KB")

    return backup_path


async def restore_database(backup_path: Path, confirm: bool = True) -> None:
    """Restore database from a JSON backup."""
    if not backup_path.exists():
        # Try in backups directory
        backup_path = BACKUP_DIR / backup_path.name
        if not backup_path.exists():
            print(f"Error: Backup file not found: {backup_path}")
            sys.exit(1)

    print("=== CS Tracker Data Restore ===")
    print(f"Source: {backup_path}")
    print("")

    # Load backup data
    with open(backup_path, "r") as f:
        backup_data = json.load(f, object_hook=json_deserializer)

    metadata = backup_data.get("metadata", {})
    print(f"Backup created: {metadata.get('created_at', 'Unknown')}")
    print(f"Tables: {len(backup_data.get('tables', {}))}")
    print("")

    if confirm:
        response = input("WARNING: This will overwrite existing data. Continue? (y/N) ")
        if response.lower() != 'y':
            print("Restore cancelled.")
            return

    print("")

    async with async_session() as session:
        # Disable foreign key checks temporarily
        await session.execute(text("SET session_replication_role = 'replica'"))

        try:
            for table_name in TABLES_ORDER:
                if table_name not in backup_data.get("tables", {}):
                    continue

                rows = backup_data["tables"][table_name]
                if not rows:
                    continue

                print(f"  Restoring {table_name}...", end=" ")

                # Clear existing data
                await session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE"))

                # Insert rows
                for row in rows:
                    columns = ", ".join(row.keys())
                    placeholders = ", ".join(f":{k}" for k in row.keys())
                    await session.execute(
                        text(f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"),
                        row
                    )

                print(f"{len(rows)} rows")

            # Reset sequences for auto-increment columns
            print("")
            print("  Resetting sequences...")
            for table_name in backup_data.get("tables", {}):
                try:
                    await session.execute(text(f"""
                        SELECT setval(pg_get_serial_sequence('{table_name}', 'id'),
                               COALESCE((SELECT MAX(id) FROM {table_name}), 1))
                    """))
                except:
                    pass  # Table might not have 'id' column

            await session.commit()

        finally:
            # Re-enable foreign key checks
            await session.execute(text("SET session_replication_role = 'origin'"))

    print("")
    print("Restore completed successfully!")
    print("Note: Restart the backend server for changes to take effect.")


def list_backups() -> None:
    """List available backup files."""
    print("=== Available Backups ===")
    print("")

    backups = sorted(BACKUP_DIR.glob("cstracker_*.json"), reverse=True)
    sql_backups = sorted(BACKUP_DIR.glob("cstracker_*.sql"), reverse=True)

    if not backups and not sql_backups:
        print("No backups found.")
        return

    print("JSON Data Backups:")
    for backup in backups[:10]:
        size = backup.stat().st_size / 1024
        print(f"  {backup.name} ({size:.1f} KB)")

    if sql_backups:
        print("")
        print("SQL Backups:")
        for backup in sql_backups[:10]:
            size = backup.stat().st_size / 1024
            print(f"  {backup.name} ({size:.1f} KB)")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "backup":
        name = None
        if len(sys.argv) > 2 and sys.argv[2] == "--name" and len(sys.argv) > 3:
            name = sys.argv[3]
        asyncio.run(backup_database(name))

    elif command == "restore":
        if len(sys.argv) < 3:
            print("Usage: python db_backup.py restore <backup_file>")
            sys.exit(1)
        backup_path = Path(sys.argv[2])
        asyncio.run(restore_database(backup_path))

    elif command == "list":
        list_backups()

    else:
        print(f"Unknown command: {command}")
        print("Commands: backup, restore, list")
        sys.exit(1)


if __name__ == "__main__":
    main()
