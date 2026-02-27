# Database Migrations

This directory contains PostgreSQL database migrations for the RMT application using `node-pg-migrate`.

## Migration Commands

### Create a new migration
```bash
npm run db:migrate:create <migration-name>
```

Example:
```bash
npm run db:migrate:create add-users-table
```

### Run all pending migrations
```bash
npm run db:migrate
```

### Rollback the last migration
```bash
npm run db:migrate:down
```

### Redo the last migration (down then up)
```bash
npm run db:migrate:redo
```

### Reset database (rollback all migrations and re-run)
```bash
npm run db:reset
```

## Migration File Structure

Each migration file exports two functions:

```javascript
exports.up = (pgm) => {
  // Code to apply the migration
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
};

exports.down = (pgm) => {
  // Code to rollback the migration
  pgm.dropTable('users');
};
```

## Best Practices

1. **Always provide a down migration**: Every migration should be reversible
2. **One logical change per migration**: Keep migrations focused and atomic
3. **Test migrations**: Test both up and down migrations before committing
4. **Never modify existing migrations**: Once a migration is committed and run in production, create a new migration to make changes
5. **Use transactions**: Migrations run in transactions by default, but be aware of operations that can't be rolled back (like DROP DATABASE)
6. **Add indexes**: Remember to add indexes for foreign keys and frequently queried columns
7. **Document complex migrations**: Add comments for non-obvious changes

## Migration Naming Convention

Use descriptive names with hyphens:
- `create-requirements-table`
- `add-display-id-to-requirements`
- `create-traceability-links-table`
- `add-full-text-search-index`

## Configuration

Migration configuration is stored in `.migrate.json` in the backend root directory.

## Database Connection

Migrations use the `DATABASE_URL` environment variable from `.env` file:
```
DATABASE_URL=postgresql://rmt_user:rmt_password@localhost:5432/rmt_dev
```

## Migration Order

Migrations are executed in chronological order based on their timestamp prefix. The system tracks which migrations have been applied in the `pgmigrations` table.

## Troubleshooting

### Migration fails midway
If a migration fails, it will be rolled back automatically (if in a transaction). Fix the issue and run `npm run db:migrate` again.

### Need to rollback multiple migrations
```bash
npm run migrate down 3  # Rollback last 3 migrations
```

### Check migration status
```bash
npm run migrate -- --help
```

### Force migration (use with caution)
If you need to mark a migration as applied without running it:
```bash
npm run migrate mark <migration-name>
```
