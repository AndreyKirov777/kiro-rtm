# Migration: Create Traceability and Audit Tables

**Migration ID**: 1709000000002  
**Created**: 2024  
**Requirements**: 8.1-8.7, 14.1-14.7, 21.1-21.5

## Overview

This migration creates the traceability, audit, and electronic signature tables that support:
- Bidirectional traceability links between requirements and external items
- Immutable audit trail for compliance
- Tamper-evident electronic signatures for approvals

## Tables Created

### traceability_links

Stores bidirectional links between requirements and other artifacts (requirements, test cases, implementation items).

**Columns**:
- `id` (UUID, PK): Unique identifier
- `source_id` (UUID, FK → requirements): Source requirement
- `target_id` (VARCHAR): Target requirement UUID or external reference
- `target_type` (VARCHAR): 'requirement' or 'external'
- `link_type` (ENUM): Type of relationship (derives_from, refines, satisfies, verified_by, conflicts_with, relates_to)
- `external_system` (VARCHAR, nullable): External system name (jira, github, linear)
- `external_id` (VARCHAR, nullable): External item identifier
- `external_metadata` (JSONB, nullable): Cached external item data (title, status, url, lastSyncedAt)
- `created_at` (TIMESTAMP): Creation timestamp
- `created_by` (UUID, FK → users): Creator

**Indexes**:
- `idx_traceability_links_source_id`: Fast lookup by source
- `idx_traceability_links_target_id`: Fast lookup by target (bidirectional)
- `idx_traceability_links_link_type`: Filter by link type
- `idx_traceability_links_source_link_type`: Composite for common queries
- `idx_traceability_links_unique`: Unique constraint (source, target, link_type)
- `idx_traceability_links_external_system`: Filter external links
- Index on `created_by`

**Constraints**:
- Unique constraint on (source_id, target_id, link_type) prevents duplicate links
- Check constraint on target_type
- Check constraint on external_system

### audit_entries

Immutable append-only audit log for all changes to requirements and related entities.

**Columns**:
- `id` (UUID, PK): Unique identifier
- `timestamp` (TIMESTAMP): When the change occurred
- `actor_id` (UUID): User or API client ID
- `actor_type` (ENUM): 'user', 'api_client', or 'system'
- `entity_type` (VARCHAR): Type of entity changed (requirement, traceability_link, baseline, comment)
- `entity_id` (UUID): ID of the changed entity
- `action` (VARCHAR): Action performed (e.g., "update_status", "create_link")
- `change_description` (TEXT): Human-readable description
- `previous_value` (JSONB, nullable): Previous state
- `new_value` (JSONB, nullable): New state

**Indexes**:
- `idx_audit_entries_entity`: Composite on (entity_type, entity_id)
- `idx_audit_entries_timestamp`: For date range queries
- `idx_audit_entries_actor`: Composite on (actor_id, actor_type)
- `idx_audit_entries_action`: Filter by action type
- `idx_audit_entries_entity_timestamp`: Composite for common queries

**Immutability**:
- Triggers prevent UPDATE and DELETE operations
- Raises exception if modification is attempted
- Ensures compliance with audit trail requirements (14.6, 14.7)

### electronic_signatures

Tamper-evident electronic signatures for requirement approvals (21 CFR Part 11 compliance).

**Columns**:
- `id` (UUID, PK): Unique identifier
- `requirement_id` (UUID, FK → requirements): Signed requirement
- `user_id` (UUID, FK → users): Signer
- `signature_meaning` (TEXT): Purpose of signature (e.g., "Approved for implementation")
- `timestamp` (TIMESTAMP): When signature was captured
- `signature_hash` (VARCHAR): HMAC-SHA256 hash for tamper detection

**Indexes**:
- `idx_electronic_signatures_requirement_id`: Find signatures by requirement
- `idx_electronic_signatures_user_id`: Find signatures by user
- `idx_electronic_signatures_timestamp`: Date range queries
- `idx_electronic_signatures_requirement_timestamp`: Composite for common queries

**Immutability**:
- Triggers prevent UPDATE and DELETE operations
- Raises exception if modification is attempted
- Ensures non-repudiation and tamper-evidence (21.3, 21.4)

## Functions Created

### prevent_audit_entry_modification()

Trigger function that prevents any UPDATE or DELETE operations on audit_entries table.

**Purpose**: Enforce immutability requirement (14.6)

### prevent_signature_modification()

Trigger function that prevents any UPDATE or DELETE operations on electronic_signatures table.

**Purpose**: Enforce immutability and tamper-evidence requirements (21.4)

## Triggers Created

### prevent_audit_entry_update

Fires BEFORE UPDATE on audit_entries, calls prevent_audit_entry_modification()

### prevent_audit_entry_delete

Fires BEFORE DELETE on audit_entries, calls prevent_audit_entry_modification()

### prevent_signature_update

Fires BEFORE UPDATE on electronic_signatures, calls prevent_signature_modification()

### prevent_signature_delete

Fires BEFORE DELETE on electronic_signatures, calls prevent_signature_modification()

## Requirements Satisfied

### Traceability (8.1-8.7)
- ✅ 8.1: Create links between requirements
- ✅ 8.2: Create links to external implementation items
- ✅ 8.3: Create links to test cases
- ✅ 8.4: Create links to test results
- ✅ 8.5: Support link types (derives_from, refines, satisfies, verified_by, conflicts_with, relates_to)
- ✅ 8.6: Store links bidirectionally (source_id and target_id indexes)
- ✅ 8.7: Store creator and timestamp

### Audit Trail (14.1-14.7)
- ✅ 14.1-14.4: Create audit entries for all changes
- ✅ 14.5: Store timestamp, actor, change description, previous/new values
- ✅ 14.6: Immutable audit entries (triggers prevent modification)
- ✅ 14.7: Retention support (no automatic deletion)

### Electronic Signatures (21.1-21.5)
- ✅ 21.1: Capture signatures on approval
- ✅ 21.2: Store user, timestamp, meaning
- ✅ 21.3: Tamper-evident (signature_hash)
- ✅ 21.4: Immutable (triggers prevent modification)
- ✅ 21.5: Non-repudiable (hash verification)

## Usage Examples

### Create a traceability link
```sql
INSERT INTO traceability_links (source_id, target_id, target_type, link_type, created_by)
VALUES (
  'req-uuid-1',
  'req-uuid-2',
  'requirement',
  'derives_from',
  'user-uuid'
);
```

### Create an audit entry
```sql
INSERT INTO audit_entries (
  actor_id, actor_type, entity_type, entity_id, 
  action, change_description, previous_value, new_value
)
VALUES (
  'user-uuid',
  'user',
  'requirement',
  'req-uuid',
  'update_status',
  'Status changed from draft to in_review',
  '{"status": "draft"}'::jsonb,
  '{"status": "in_review"}'::jsonb
);
```

### Create an electronic signature
```sql
INSERT INTO electronic_signatures (
  requirement_id, user_id, signature_meaning, signature_hash
)
VALUES (
  'req-uuid',
  'user-uuid',
  'Approved for implementation',
  'hmac-sha256-hash-value'
);
```

### Query traceability links (bidirectional)
```sql
-- Find all downstream links from a requirement
SELECT * FROM traceability_links WHERE source_id = 'req-uuid';

-- Find all upstream links to a requirement
SELECT * FROM traceability_links WHERE target_id = 'req-uuid';
```

### Query audit trail
```sql
-- Get all changes to a requirement
SELECT * FROM audit_entries 
WHERE entity_type = 'requirement' AND entity_id = 'req-uuid'
ORDER BY timestamp DESC;

-- Get all changes by a user
SELECT * FROM audit_entries 
WHERE actor_id = 'user-uuid' AND actor_type = 'user'
ORDER BY timestamp DESC;
```

## Testing

Run the migration test:
```bash
npm test backend/migrations/1709000000002_create-traceability-audit-tables.test.js
```

## Rollback

To rollback this migration:
```bash
npm run db:migrate:down
```

This will:
1. Drop all triggers
2. Drop trigger functions
3. Drop all three tables (electronic_signatures, audit_entries, traceability_links)

## Dependencies

**Requires**:
- Migration 1709000000000 (initial-setup): Enum types (link_type, actor_type)
- Migration 1709000000001 (create-core-tables): requirements, users tables

**Required by**:
- Future migrations that reference these tables
- Baseline and workflow migrations

## Notes

- The audit_entries and electronic_signatures tables are **immutable by design**
- Attempting to UPDATE or DELETE rows will raise an exception
- The traceability_links table uses VARCHAR for target_id to support both internal UUIDs and external references
- External metadata is cached in JSONB for performance (avoids API calls)
- All indexes are optimized for common query patterns identified in the design document
