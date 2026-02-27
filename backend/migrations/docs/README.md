# Database Migrations Documentation

This directory contains documentation and tests for all database migrations in the Requirements Management & Traceability (RMT) application.

## Migration Overview

### Core Tables (1709000000001)
Creates the foundational tables for the application:
- `requirements`: Core requirement data with hierarchical support
- `projects`: Project organization
- `users`: User management
- `api_tokens`: API authentication

**Documentation**: [1709000000001_create-core-tables.md](./1709000000001_create-core-tables.md)

### Traceability and Audit Tables (1709000000002)
Creates tables for traceability links, audit trail, and electronic signatures:
- `traceability_links`: Bidirectional links between requirements and external items
- `audit_entries`: Immutable audit trail with tamper-proof constraints
- `electronic_signatures`: Tamper-evident digital signatures for approvals

**Documentation**: [1709000000002_create-traceability-audit-tables.md](./1709000000002_create-traceability-audit-tables.md)

**Key Features**:
- Immutability triggers prevent modification or deletion of audit entries
- Immutability triggers prevent modification or deletion of electronic signatures
- Comprehensive indexing for fast audit queries

### Baseline and Workflow Tables (1709000000003)
Creates tables for baseline management and collaboration:
- `baselines`: Locked snapshots of requirements at specific points in time
- `comments`: Threaded discussions on requirements
- `attachments`: File attachments for requirements

**Documentation**: [1709000000003_create-baseline-workflow-tables.md](./1709000000003_create-baseline-workflow-tables.md)

### Retired Display IDs Table (1709000000004)
Creates table to track retired requirement identifiers:
- `retired_display_ids`: Ensures requirement IDs are never reused

**Key Features**:
- Automatic retirement on requirement deletion
- Prevents ID reuse for compliance

### Automatic Audit Triggers (1709000000005)
Implements database triggers for automatic audit logging:
- Requirement change triggers (INSERT, UPDATE, DELETE)
- Traceability link change triggers (INSERT, DELETE)

**Documentation**: [1709000000005_add-automatic-audit-triggers.md](./1709000000005_add-automatic-audit-triggers.md)

**Key Features**:
- Complete audit coverage without application code
- Automatic actor attribution
- Detailed change descriptions
- Supports all requirement field changes

## Testing

Each migration includes comprehensive tests:

### Unit Tests
Located in `backend/src/repositories/*.test.ts`
- Test individual repository methods
- Verify CRUD operations
- Test error handling

### Integration Tests
Located in `backend/src/repositories/*.integration.test.ts`
- Test database interactions
- Verify trigger behavior
- Test transaction handling

### Property-Based Tests
Located in `backend/src/repositories/*.property.test.ts`
- Test universal correctness properties
- Verify invariants hold across all inputs
- Use fast-check for property testing

## Running Migrations

### Apply All Pending Migrations
```bash
npm run db:migrate
```

### Rollback Last Migration
```bash
npm run db:migrate:down
```

### Rollback and Re-run Last Migration
```bash
npm run db:migrate:redo
```

### Reset Database (All Down, Then All Up)
```bash
npm run db:reset
```

## Migration Best Practices

1. **Never modify existing migrations** after they've been committed
2. **Always provide both `up` and `down` functions** for rollback support
3. **Test migrations thoroughly** before committing
4. **Document all schema changes** in the migration docs
5. **Use transactions** for multi-step migrations
6. **Add indexes** for frequently queried columns
7. **Consider performance** for large datasets

## Compliance Notes

The audit trail implementation satisfies regulatory requirements:
- **FDA 21 CFR Part 11**: Electronic signatures and audit trails
- **IEC 62304**: Medical device software lifecycle
- **DO-178C**: Aerospace software safety
- **ISO 26262**: Automotive functional safety

Key compliance features:
- Immutable audit entries (cannot be modified or deleted)
- Complete change tracking (all modifications logged)
- Actor attribution (who made each change)
- Timestamp accuracy (automatic database timestamps)
- Tamper-evident signatures (HMAC-SHA256 hashing)
- 10-year retention (enforced by immutability)

## Troubleshooting

### Migration Fails
1. Check PostgreSQL logs: `docker-compose logs postgres`
2. Verify database connection: Check `DATABASE_URL` in `.env`
3. Check for conflicting migrations: `SELECT * FROM pgmigrations;`

### Trigger Issues
1. Verify triggers exist: `\dft` in psql
2. Check trigger functions: `\df log_*` in psql
3. Test manually: Insert/update/delete records and check `audit_entries`

### Test Failures
1. Ensure database is running: `docker-compose ps`
2. Run migrations: `npm run db:migrate`
3. Check for stale test data: Clean up test users/projects
4. Run with verbose output: `npm test -- --verbose`

## Additional Resources

- [Backend Documentation](../../docs/)
- [Migration Guide](../../docs/MIGRATIONS.md)
- [Product Requirements](../../../PRD-Requirements-Management-Traceability.md)
- [Setup Instructions](../../../SETUP.md)
