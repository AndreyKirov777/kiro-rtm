# PostgreSQL Migration System Setup

## Overview

The RMT backend uses `node-pg-migrate` for database schema management. This document describes the migration system setup completed in Task 2.1.

## What Was Created

### 1. Migration Configuration (`.migrate.json`)

Configuration file that tells node-pg-migrate:
- Where to find migrations (`migrations/` directory)
- Which environment variable contains the database URL (`DATABASE_URL`)
- Migration tracking table name (`pgmigrations`)
- Migration file language (JavaScript)

### 2. Initial Setup Migration (`migrations/1709000000000_initial-setup.js`)

The foundational migration that creates:

**PostgreSQL Extensions:**
- `uuid-ossp` - For generating UUIDs
- `pg_trgm` - For full-text search with trigram matching

**Helper Functions:**
- `update_updated_at_column()` - Automatically updates `updated_at` timestamps
- `generate_display_id()` - Generates stable, human-readable requirement IDs (e.g., REQ-001)

**Enum Types:**
- `requirement_type` - Types of requirements (stakeholder_need, system_requirement, etc.)
- `requirement_status` - Workflow states (draft, in_review, approved, deprecated)
- `priority` - Priority levels (critical, high, medium, low)
- `link_type` - Traceability link types (derives_from, refines, satisfies, etc.)
- `coverage_status` - Test coverage states (passed, failed, not_run, no_test)
- `actor_type` - Types of actors in audit trail (user, api_client, system)
- `user_role` - RBAC roles (viewer, author, reviewer, approver, administrator)

### 3. NPM Scripts (Updated `package.json`)

Added migration management scripts:
- `npm run migrate` - Run node-pg-migrate with custom arguments
- `npm run db:migrate` - Apply all pending migrations
- `npm run db:migrate:down` - Rollback the last migration
- `npm run db:migrate:redo` - Rollback and re-apply the last migration
- `npm run db:migrate:create <name>` - Create a new migration file
- `npm run db:reset` - Rollback all migrations and re-apply them

### 4. Helper Scripts

**`scripts/verify-setup.sh`**
- Verifies that all migration system components are in place
- Checks for dependencies, configuration files, and Docker status
- Provides next steps for setup

**`scripts/test-migrations.sh`**
- Tests migrations by running up, down, and up again
- Ensures migrations are reversible
- Useful for CI/CD pipelines

**`scripts/create-migration.sh`**
- Wrapper script to create new migrations
- Provides better error messages

### 5. Documentation

**`migrations/README.md`**
- Quick reference for migration commands
- Best practices for writing migrations
- Troubleshooting guide

**`docs/MIGRATIONS.md`**
- Comprehensive migration guide
- Examples of common operations
- Advanced topics (data migrations, large datasets, etc.)
- Testing and deployment workflows

## How to Use

### Prerequisites

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL
   ```

3. **Start PostgreSQL:**
   ```bash
   # From project root
   docker-compose up -d postgres
   ```

### Running Migrations

1. **Verify Setup:**
   ```bash
   ./scripts/verify-setup.sh
   ```

2. **Run Migrations:**
   ```bash
   npm run db:migrate
   ```

   This will:
   - Create the `pgmigrations` tracking table
   - Run the initial setup migration
   - Create all enum types and helper functions

3. **Verify Migration Success:**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Check that extensions are installed
   \dx
   
   # Check that enum types exist
   \dT
   
   # Check that functions exist
   \df
   ```

### Creating New Migrations

```bash
# Create a new migration
npm run db:migrate:create create-requirements-table

# Edit the generated file in migrations/
# Then run the migration
npm run db:migrate
```

## Migration System Architecture

```
backend/
├── .migrate.json              # Migration configuration
├── migrations/                # Migration files directory
│   ├── README.md             # Quick reference
│   └── 1709000000000_initial-setup.js  # Initial setup
├── scripts/
│   ├── verify-setup.sh       # Setup verification
│   ├── test-migrations.sh    # Migration testing
│   └── create-migration.sh   # Migration creation helper
├── docs/
│   └── MIGRATIONS.md         # Comprehensive guide
└── package.json              # NPM scripts
```

## Next Steps

After completing Task 2.1, the next tasks will create:

- **Task 2.2**: Core tables (requirements, projects, users, api_tokens)
- **Task 2.3**: Traceability and audit tables
- **Task 2.4**: Baseline and workflow tables

Each of these will be a separate migration file that builds on the initial setup.

## Verification Checklist

- [x] node-pg-migrate installed as dependency
- [x] .migrate.json configuration file created
- [x] Initial setup migration created
- [x] NPM scripts added for migration management
- [x] Helper scripts created and made executable
- [x] Documentation created (README.md and MIGRATIONS.md)
- [x] Verification script created

## Testing the Setup

Run the verification script:

```bash
./scripts/verify-setup.sh
```

Expected output:
```
=== Verifying Migration System Setup ===

✓ Dependencies installed
✓ Migrations directory exists
✓ Migration configuration file exists
✓ Initial setup migration exists
✓ .env file exists
✓ DATABASE_URL is configured
✓ Docker is running
✓ PostgreSQL container is running

=== Setup Verification Complete ===
```

## Troubleshooting

### "node-pg-migrate: command not found"

Solution: Run `npm install` to install dependencies.

### "Cannot connect to database"

Solutions:
1. Check Docker is running: `docker info`
2. Start PostgreSQL: `docker-compose up -d postgres`
3. Verify DATABASE_URL in .env file
4. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### "Migration template not found"

This is a known issue with node-pg-migrate. Migrations are created manually with the proper naming convention: `<timestamp>_<name>.js`

## References

- [node-pg-migrate Documentation](https://salsita.github.io/node-pg-migrate/)
- [PostgreSQL Extensions](https://www.postgresql.org/docs/current/contrib.html)
- [Design Document](../.kiro/specs/requirements-management-traceability/design.md)
