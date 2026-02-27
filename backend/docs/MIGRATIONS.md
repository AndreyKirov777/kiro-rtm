# Database Migration Guide

## Overview

The RMT application uses `node-pg-migrate` for managing PostgreSQL database schema changes. This guide covers everything you need to know about working with migrations.

## Quick Start

### Prerequisites
- PostgreSQL database running (via Docker Compose or locally)
- Node.js and npm installed
- Environment variables configured (see `.env.example`)

### Basic Commands

```bash
# Run all pending migrations
npm run db:migrate

# Create a new migration
npm run db:migrate:create <migration-name>

# Rollback the last migration
npm run db:migrate:down

# Redo the last migration (down then up)
npm run db:migrate:redo

# Reset database (rollback all and re-run)
npm run db:reset
```

## Migration System Architecture

### Configuration

The migration system is configured via `.migrate.json`:

```json
{
  "database-url-var": "DATABASE_URL",
  "migrations-dir": "migrations",
  "migrations-table": "pgmigrations",
  "migration-file-language": "js",
  "check-order": true,
  "verbose": true
}
```

### Migration Tracking

Migrations are tracked in the `pgmigrations` table, which is automatically created by node-pg-migrate. This table stores:
- Migration name
- Run timestamp
- Migration checksum (for detecting changes)

### Initial Setup Migration

The first migration (`1709000000000_initial-setup.js`) creates:

1. **PostgreSQL Extensions**:
   - `uuid-ossp`: For UUID generation
   - `pg_trgm`: For full-text search with trigram matching

2. **Helper Functions**:
   - `update_updated_at_column()`: Trigger function to auto-update timestamps
   - `generate_display_id()`: Function to generate stable requirement IDs

3. **Enum Types**:
   - `requirement_type`: Types of requirements
   - `requirement_status`: Workflow states
   - `priority`: Priority levels
   - `link_type`: Traceability link types
   - `coverage_status`: Test coverage states
   - `actor_type`: Types of actors in audit trail
   - `user_role`: RBAC roles

## Creating Migrations

### Naming Convention

Use descriptive, kebab-case names:
- ✅ `create-requirements-table`
- ✅ `add-full-text-search-index`
- ✅ `add-display-id-uniqueness-constraint`
- ❌ `migration1`
- ❌ `update_table`

### Migration File Structure

```javascript
/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Code to apply the migration
  pgm.createTable('example', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
};

exports.down = (pgm) => {
  // Code to rollback the migration
  pgm.dropTable('example');
};
```

### Common Operations

#### Creating Tables

```javascript
exports.up = (pgm) => {
  pgm.createTable('requirements', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    display_id: {
      type: 'varchar(50)',
      notNull: true,
      unique: true
    },
    title: {
      type: 'varchar(500)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    type: {
      type: 'requirement_type',
      notNull: true
    },
    status: {
      type: 'requirement_status',
      notNull: true,
      default: 'draft'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Add indexes
  pgm.createIndex('requirements', 'display_id');
  pgm.createIndex('requirements', 'status');
  pgm.createIndex('requirements', 'type');

  // Add trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER update_requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};
```

#### Adding Foreign Keys

```javascript
exports.up = (pgm) => {
  pgm.addColumns('requirements', {
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE'
    }
  });

  pgm.createIndex('requirements', 'project_id');
};
```

#### Adding Columns

```javascript
exports.up = (pgm) => {
  pgm.addColumns('requirements', {
    priority: {
      type: 'priority',
      notNull: true,
      default: 'medium'
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('requirements', ['priority']);
};
```

#### Creating Indexes

```javascript
exports.up = (pgm) => {
  // Simple index
  pgm.createIndex('requirements', 'status');

  // Composite index
  pgm.createIndex('requirements', ['project_id', 'status']);

  // Full-text search index (GIN)
  pgm.sql(`
    CREATE INDEX requirements_search_idx 
    ON requirements 
    USING GIN (to_tsvector('english', title || ' ' || description));
  `);
};
```

#### Creating Constraints

```javascript
exports.up = (pgm) => {
  // Unique constraint
  pgm.addConstraint('requirements', 'unique_display_id', {
    unique: ['display_id']
  });

  // Check constraint
  pgm.addConstraint('requirements', 'valid_version', {
    check: 'version > 0'
  });
};
```

## Best Practices

### 1. Always Provide Down Migrations

Every migration should be reversible:

```javascript
exports.up = (pgm) => {
  pgm.addColumns('requirements', {
    new_field: { type: 'varchar(100)' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('requirements', ['new_field']);
};
```

### 2. Use Transactions

Migrations run in transactions by default. For operations that can't be in a transaction:

```javascript
exports.up = (pgm) => {
  pgm.noTransaction();
  // Operations that require no transaction
};
```

### 3. Test Both Directions

Always test both up and down migrations:

```bash
npm run db:migrate        # Apply migration
npm run db:migrate:down   # Rollback migration
npm run db:migrate        # Re-apply migration
```

### 4. Never Modify Existing Migrations

Once a migration is committed and run in any environment, never modify it. Create a new migration instead.

### 5. Keep Migrations Atomic

Each migration should represent one logical change:
- ✅ One migration to create a table
- ✅ Another migration to add an index
- ❌ One migration that creates multiple unrelated tables

### 6. Add Indexes for Performance

Always add indexes for:
- Foreign keys
- Columns used in WHERE clauses
- Columns used in JOIN conditions
- Columns used in ORDER BY

### 7. Use Enum Types for Fixed Values

Instead of varchar with check constraints, use PostgreSQL enum types:

```javascript
pgm.createType('status', ['draft', 'published', 'archived']);
```

### 8. Document Complex Migrations

Add comments for non-obvious changes:

```javascript
exports.up = (pgm) => {
  // Migrate existing data from old_column to new_column
  // This is safe because old_column is always non-null
  pgm.sql(`
    UPDATE requirements 
    SET new_column = old_column::jsonb 
    WHERE old_column IS NOT NULL;
  `);
};
```

## Troubleshooting

### Migration Fails Midway

If a migration fails, it will be rolled back automatically. Fix the issue and run again:

```bash
npm run db:migrate
```

### Need to Rollback Multiple Migrations

```bash
# Rollback last 3 migrations
npx node-pg-migrate down 3
```

### Check Migration Status

```bash
# List all migrations and their status
npx node-pg-migrate list
```

### Force Mark Migration as Applied

Use with extreme caution:

```bash
npx node-pg-migrate mark <migration-name>
```

### Database Connection Issues

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Verify DATABASE_URL in .env:
   ```bash
   echo $DATABASE_URL
   ```

3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

### Migration Checksum Mismatch

This means a migration file was modified after being run. Options:
1. Revert the changes to the migration file
2. Create a new migration with the changes
3. (Development only) Reset the database: `npm run db:reset`

## Testing Migrations

### Automated Testing

Use the test script:

```bash
./scripts/test-migrations.sh
```

This script will:
1. Run all migrations up
2. Rollback the last migration
3. Re-run migrations up

### Manual Testing

1. **Test on a copy of production data**:
   ```bash
   # Create a backup
   pg_dump $PROD_DATABASE_URL > backup.sql
   
   # Restore to test database
   psql $TEST_DATABASE_URL < backup.sql
   
   # Run migrations
   DATABASE_URL=$TEST_DATABASE_URL npm run db:migrate
   ```

2. **Verify data integrity**:
   - Check row counts before and after
   - Verify foreign key relationships
   - Test application functionality

3. **Test rollback**:
   ```bash
   npm run db:migrate:down
   # Verify database is in previous state
   ```

## Migration Workflow

### Development

1. Create a new migration:
   ```bash
   npm run db:migrate:create add-new-feature
   ```

2. Edit the migration file in `migrations/`

3. Test the migration:
   ```bash
   npm run db:migrate
   npm run db:migrate:down
   npm run db:migrate
   ```

4. Commit the migration file

### Staging/Production

1. Pull latest code with new migrations

2. Backup the database:
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

4. Verify application works correctly

5. If issues occur, rollback:
   ```bash
   npm run db:migrate:down
   # Or restore from backup
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```

## Advanced Topics

### Data Migrations

For migrations that transform data:

```javascript
exports.up = (pgm) => {
  // Add new column
  pgm.addColumns('requirements', {
    new_format: { type: 'jsonb' }
  });

  // Migrate data
  pgm.sql(`
    UPDATE requirements
    SET new_format = jsonb_build_object(
      'old_value', old_column,
      'migrated_at', current_timestamp
    )
    WHERE old_column IS NOT NULL;
  `);

  // Drop old column (in a separate migration in production)
  // pgm.dropColumns('requirements', ['old_column']);
};
```

### Conditional Migrations

```javascript
exports.up = async (pgm) => {
  // Check if column exists before adding
  const result = await pgm.db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'requirements' 
    AND column_name = 'new_column';
  `);

  if (result.rows.length === 0) {
    pgm.addColumns('requirements', {
      new_column: { type: 'varchar(100)' }
    });
  }
};
```

### Large Data Migrations

For tables with millions of rows:

```javascript
exports.up = (pgm) => {
  // Process in batches to avoid locking
  pgm.sql(`
    DO $$
    DECLARE
      batch_size INTEGER := 10000;
      offset_val INTEGER := 0;
      rows_affected INTEGER;
    BEGIN
      LOOP
        UPDATE requirements
        SET new_column = transform_function(old_column)
        WHERE id IN (
          SELECT id FROM requirements
          WHERE new_column IS NULL
          LIMIT batch_size
        );
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        EXIT WHEN rows_affected = 0;
        
        -- Commit after each batch
        COMMIT;
      END LOOP;
    END $$;
  `);
};
```

## Resources

- [node-pg-migrate Documentation](https://salsita.github.io/node-pg-migrate/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)
