#!/bin/bash
# Database Restore Script for CS Tracker
# Restores database from a SQL dump file

set -e

# Default values (can be overridden by environment variables or .env file)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cstracker}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Load from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
    # Extract components from URL like: postgresql+asyncpg://user:pass@host:port/dbname
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
fi

BACKUP_DIR="$(dirname "$0")/backups"

# Check if a backup file was provided
if [ -z "$1" ]; then
    echo "=== CS Tracker Database Restore ==="
    echo ""
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    echo ""
    ls -lt "$BACKUP_DIR"/cstracker_backup_*.sql 2>/dev/null | head -10 | awk '{print "  " $NF " (" $5 ")"}'
    echo ""
    echo "Example: $0 backups/cstracker_backup_20260115_143000.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backups directory prefix
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

echo "=== CS Tracker Database Restore ==="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "Restore from: $BACKUP_FILE"
echo ""

# Confirm restore
read -p "WARNING: This will overwrite existing data. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo "Restoring database..."

# Run psql to restore
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" 2>&1 | grep -v "NOTICE"

# Unset password
unset PGPASSWORD

echo ""
echo "Restore completed successfully!"
echo ""
echo "Note: You may need to restart the backend server for changes to take effect."
