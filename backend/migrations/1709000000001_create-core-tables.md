# Migration: Create Core Tables

**Migration ID:** 1709000000001_create-core-tables.js

**Requirements:** 1.1-1.12, 2.1-2.3, 4.1-4.3

## Overview

This migration creates the core database tables for the Requirements Management & Traceability (RMT) application. These tables form the foundation of the system and store projects, users, API tokens, and requirements.

## Tables Created

### 1. projects

Stores project information and configuration.

**Columns:**
- `id` (UUID, PK): Unique project identifier
- `name` (VARCHAR(255), NOT NULL): Project name
- `description` (TEXT): Optional project description
- `custom_field_definitions` (JSONB, NOT NULL, DEFAULT '[]'): Array of custom field definitions
- `approval_workflow` (JSONB): Optional approval workflow configuration
- `created_at` (TIMESTAMP, NOT NULL): Creation timestamp
- `created_by` (UUID, NOT NULL): User who created the project

**Indexes:**
- Primary key on `id`

### 2. users

Stores user accounts and authentication information.

**Columns:**
- `id` (UUID, PK): Unique user identifier
- `email` (VARCHAR(255), NOT NULL, UNIQUE): User email address
- `name` (VARCHAR(255), NOT NULL): User display name
- `role` (user_role, NOT NULL, DEFAULT 'viewer'): User role (viewer, author, reviewer, approver, administrator)
- `created_at` (TIMESTAMP, NOT NULL): Account creation timestamp
- `last_login_at` (TIMESTAMP): Last login timestamp

**Indexes:**
- Primary key on `id`
- Unique index on `email`

### 3. api_tokens

Stores API authentication tokens for programmatic access.

**Columns:**
- `id` (UUID, PK): Unique token identifier
- `user_id` (UUID, NOT NULL, FK → users): Owner of the token
- `name` (VARCHAR(255), NOT NULL): Token name/description
- `token_hash` (VARCHAR(255), NOT NULL, UNIQUE): Hashed token value
- `scopes` (JSONB, NOT NULL, DEFAULT '[]'): Array of permission scopes
- `expires_at` (TIMESTAMP): Optional expiration timestamp
- `last_used_at` (TIMESTAMP): Last usage timestamp
- `created_at` (TIMESTAMP, NOT NULL): Creation timestamp

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Unique index on `token_hash`

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE

### 4. requirements

The core table storing all requirements with their attributes.

**Columns:**
- `id` (UUID, PK): Unique internal identifier (never changes)
- `display_id` (VARCHAR(50), NOT NULL): Stable human-readable ID (e.g., "REQ-001")
- `project_id` (UUID, NOT NULL, FK → projects): Parent project
- `parent_id` (UUID, FK → requirements): Optional parent requirement for hierarchy
- `title` (VARCHAR(500), NOT NULL): Requirement title
- `description` (TEXT, NOT NULL, DEFAULT ''): Rich text description
- `type` (requirement_type, NOT NULL): Requirement type (stakeholder_need, system_requirement, etc.)
- `status` (requirement_status, NOT NULL, DEFAULT 'draft'): Current status (draft, in_review, approved, deprecated)
- `priority` (priority, NOT NULL, DEFAULT 'medium'): Priority level (critical, high, medium, low)
- `version` (INTEGER, NOT NULL, DEFAULT 1): Version number (incremented on updates)
- `tags` (JSONB, NOT NULL, DEFAULT '[]'): Array of tag strings
- `custom_fields` (JSONB, NOT NULL, DEFAULT '{}'): Object with custom field values
- `created_at` (TIMESTAMP, NOT NULL): Creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL): Last update timestamp (auto-updated by trigger)
- `created_by` (UUID, NOT NULL, FK → users): User who created the requirement
- `updated_by` (UUID, NOT NULL, FK → users): User who last updated the requirement
- `search_vector` (TSVECTOR, GENERATED): Full-text search vector (auto-generated)

**Indexes:**
- Primary key on `id`
- Index on `project_id`
- Unique composite index on `(project_id, display_id)` - ensures display_id is unique within a project
- Index on `parent_id` - for hierarchical queries
- Index on `status` - for filtering by status
- Index on `type` - for filtering by type
- Index on `priority` - for filtering by priority
- Composite index on `(project_id, status, type)` - for common filter combinations
- Index on `created_by` - for user queries
- Index on `updated_by` - for user queries
- GIN index on `tags` - for tag array queries
- GIN index on `custom_fields` - for JSONB queries
- GIN index on `search_vector` - for full-text search

**Foreign Keys:**
- `project_id` → `projects(id)` ON DELETE CASCADE
- `parent_id` → `requirements(id)` ON DELETE SET NULL
- `created_by` → `users(id)` ON DELETE RESTRICT
- `updated_by` → `users(id)` ON DELETE RESTRICT

**Triggers:**
- `update_requirements_updated_at` - Automatically updates `updated_at` timestamp on row updates

## Key Features

### Display ID Uniqueness

The `display_id` field is designed to be stable and never change, even when a requirement is moved within the hierarchy. The unique composite index on `(project_id, display_id)` ensures that display IDs are unique within each project but can be reused across different projects.

### Full-Text Search

The `search_vector` column is a generated column that automatically creates a full-text search index combining the `title` (weight A) and `description` (weight B) fields. This enables efficient full-text search queries using PostgreSQL's built-in search capabilities.

### Hierarchical Structure

The `parent_id` self-referencing foreign key enables hierarchical organization of requirements. The ON DELETE SET NULL constraint ensures that if a parent requirement is deleted, child requirements are not deleted but their `parent_id` is set to NULL.

### JSONB Fields

Both `tags` and `custom_fields` use JSONB for flexible schema-less storage:
- `tags`: Array of strings for cross-cutting concerns
- `custom_fields`: Object with user-defined fields specific to each project

### Automatic Timestamp Updates

The `updated_at` column is automatically updated whenever a row is modified, thanks to the `update_requirements_updated_at` trigger that calls the `update_updated_at_column()` function (created in the initial setup migration).

## Dependencies

This migration depends on:
- `1709000000000_initial-setup.js` - Provides enum types, extensions, and helper functions

## Testing

To test this migration:

1. **Start PostgreSQL:**
   ```bash
   docker-compose up postgres
   ```

2. **Run the migration:**
   ```bash
   npm run db:migrate
   ```

3. **Verify tables were created:**
   ```bash
   npm run db:verify
   ```

4. **Test rollback:**
   ```bash
   npm run db:migrate down
   npm run db:migrate up
   ```

## Rollback

The `down` migration drops all four tables in reverse order (respecting foreign key constraints):
1. requirements
2. api_tokens
3. users
4. projects

The `cascade: true` option ensures that dependent objects are also dropped.

## Performance Considerations

### Index Strategy

The migration creates strategic indexes to optimize common query patterns:
- Single-column indexes for simple filters (status, type, priority)
- Composite indexes for common filter combinations (project_id + status + type)
- GIN indexes for JSONB and array queries (tags, custom_fields)
- Full-text search index for title and description

### JSONB vs. Normalized Tables

The migration uses JSONB for `tags` and `custom_fields` to provide flexibility without requiring schema migrations for each new custom field. This is appropriate because:
- Custom fields vary by project
- Tags are simple strings without complex relationships
- JSONB queries are efficient with GIN indexes

### Foreign Key Constraints

The migration uses appropriate ON DELETE actions:
- CASCADE: When a project or user is deleted, related records should also be deleted
- SET NULL: When a parent requirement is deleted, children should remain but become orphaned
- RESTRICT: Prevent deletion of users who created/updated requirements (maintain audit trail)

## Security Considerations

### User References

The `created_by` and `updated_by` fields use ON DELETE RESTRICT to prevent accidental deletion of users who have created or modified requirements. This maintains the audit trail integrity.

### Token Storage

The `api_tokens` table stores only hashed token values, never plaintext tokens. The application must hash tokens before querying this table.

## Future Enhancements

Potential improvements for future migrations:
- Add materialized views for frequently accessed aggregations
- Add partitioning for large requirements tables
- Add additional composite indexes based on query patterns
- Add check constraints for data validation
