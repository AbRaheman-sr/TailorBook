# TailorBook Database Migrations

This directory contains version-controlled SQL migrations for the TailorBook PostgreSQL database hosted on Supabase.

## Directory Structure

```
backend/database/
├── migrations/
│   ├── README.md               # Migration guidelines and execution instructions
│   └── 0001_initial_schema.sql # (To be implemented in schema phase)
```

## Naming Convention

Migration files follow an ordered prefix convention:
`XXXX_descriptive_name.sql`

Example:
- `0001_initial_schema.sql`
- `0002_add_customer_phone_index.sql`

## Execution Guidelines

1. **Idempotency & Safety**:
   - Every migration must be transactional where supported (`BEGIN; ... COMMIT;`).
   - Use `IF NOT EXISTS` / `IF EXISTS` where appropriate.
   - Migrations are forward-only; destructive operations (e.g. `DROP COLUMN`) require explicit verification and data backups.

2. **Environment Execution**:
   - Migrations are applied using the backend database connection via automated migration runner or scripted Node/pg execution.
   - Do **not** manually execute DDL directly inside the Supabase dashboard SQL editor to avoid schema drift between environments.

3. **Status**:
   - The initial schema migration will be created in the subsequent implementation phase as instructed in the TailorBook roadmap.

