# Database Backups

This directory stores database backups before schema migrations or destructive operations.

## Backup Naming Convention

```
YYYYMMDD_HHMMSS_description.dump   # Full table/database dumps
YYYYMMDD_HHMMSS_tablename.json     # JSON exports for specific tables
pre_deploy_YYYYMMDD_HHMMSS.dump    # Pre-deployment full backups
```

## Creating Backups

### Full Database Backup
```bash
podman exec cs-tracker-db pg_dump -U postgres -d cs_tracker \
  -F c > backups/full_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Single Table Backup (Custom Format)
```bash
podman exec cs-tracker-db pg_dump -U postgres -d cs_tracker \
  --table=table_name -F c > backups/table_name_$(date +%Y%m%d_%H%M%S).dump
```

### Table to JSON Export
```bash
podman exec cs-tracker-db psql -U postgres -d cs_tracker -c \
  "COPY (SELECT row_to_json(t) FROM table_name t) TO STDOUT" \
  > backups/table_name_$(date +%Y%m%d_%H%M%S).json
```

## Restoring Backups

### Full Database Restore
```bash
podman exec -i cs-tracker-db pg_restore -U postgres -d cs_tracker \
  --clean --if-exists < backups/backup_file.dump
```

### Single Table Restore
```bash
podman exec -i cs-tracker-db pg_restore -U postgres -d cs_tracker \
  --table=table_name < backups/table_backup.dump
```

### JSON Import (requires custom script)
```python
import json
# Parse JSON and insert via SQLAlchemy
```

## Retention Policy

- Keep pre-migration backups for at least 30 days
- Keep pre-deployment backups for at least 7 days
- Archive important backups to external storage monthly

## This Directory is Gitignored

Backup files contain production data and should NOT be committed to version control.
