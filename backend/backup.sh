#!/bin/bash
# Database Backup Script for CS Tracker
# Creates timestamped SQL dump of the PostgreSQL database

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

# Create backups directory if it doesn't exist
BACKUP_DIR="$(dirname "$0")/backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cstracker_backup_$TIMESTAMP.sql"

echo "=== CS Tracker Database Backup ==="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Set password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Run pg_dump
echo "Creating backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    -f "$BACKUP_FILE"

# Unset password
unset PGPASSWORD

# Get file size
FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')

echo ""
echo "Backup completed successfully!"
echo "File: $BACKUP_FILE"
echo "Size: $FILE_SIZE"

# Keep only last 10 backups (optional cleanup)
echo ""
echo "Cleaning up old backups (keeping last 10)..."
cd "$BACKUP_DIR"
ls -t cstracker_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f
echo "Done!"
