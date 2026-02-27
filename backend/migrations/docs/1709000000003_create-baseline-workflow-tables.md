# Migration: Create Baseline and Workflow Tables

**Migration ID**: 1709000000003

**Dependencies**: 
- 1709000000001 (create-core-tables)
- 1709000000002 (create-traceability-audit-tables)

**Requirements**: 6.1-6.4, 5.1-5.3, 16.1-16.5

## Overview

This migration creates the baseline, comments, and attachments tables to support:
- Baseline management (named snapshots of requirements)
- Threaded discussions on requirements
- File attachments for requirements

## Tables Created

### baselines

Stores named snapshots of requirements at specific points in time for compliance and release management.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique identifier
- `project_id` (UUID, NOT NULL, FK → projects): Project this baseline belongs to
- `name` (VARCHAR(255), NOT NULL): Human-readable baseline name (e.g., "Release 1.0")
- `description` (TEXT, NULL): Optional description of the baseline
- `locked` (BOOLEAN, NOT NULL, DEFAULT false): Whether the baseline is locked (immutable)
- `locked_at` (TIMESTAMP, NULL): When the baseline was locked
- `locked_by` (UUID, NULL, FK → users): User who locked the baseline
- `snapshot_data` (JSONB, NOT NULL): JSON blob containing all requirement states at baseline creation
- `created_at` (TIMESTAMP, NOT NULL): When the baseline was created
- `created_by` (UUID, NOT NULL, FK → users): User who created the baseline

**Indexes:**
- Index on `project_id` - for project queries
- Index on `locked` - for filtering by locked status
- Composite index on `(project_id, locked)` - for common filter combinations
- Index on `created_by` - for user queries
- Partial index on `locked_by` (WHERE locked_by IS NOT NULL) - for locked baseline queries

**Foreign Keys:**
- `project_id` → `projects(id)` ON DELETE CASCADE
- `created_by` → `users(id)` ON DELETE RESTRICT
- `locked_by` → `users(id)` ON DELETE RESTRICT

**Design Notes:**

The `snapshot_data` field stores a complete JSON snapshot of all requirements in the project at the time of baseline creation. This allows for:
- Point-in-time recovery
- Baseline comparison (diff between two baselines)
- Compliance auditing (proving what requirements existed at a specific release)

When a baseline is locked, it becomes immutable. The `locked`, `locked_at`, and `locked_by` fields track the locking state and provide audit information.

### comments

Stores threaded discussions on requirements, including clarification requests from AI agents.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique identifier
- `requirement_id` (UUID, NOT NULL, FK → requirements): Requirement this comment belongs to
- `parent_comment_id` (UUID, NULL, FK → comments): Parent comment for threaded discussions
- `content` (TEXT, NOT NULL): Comment content (rich text)
- `author_id` (UUID, NOT NULL, FK → users): User who authored the comment
- `is_clarification_request` (BOOLEAN, NOT NULL, DEFAULT false): Whether this is a clarification request
- `assigned_to` (UUID, NULL, FK → users): User assigned to respond to clarification request
- `resolved` (BOOLEAN, NOT NULL, DEFAULT false): Whether the comment/clarification is resolved
- `created_at` (TIMESTAMP, NOT NULL): When the comment was created
- `updated_at` (TIMESTAMP, NOT NULL): When the comment was last updated

**Indexes:**
- Index on `requirement_id` - for finding all comments on a requirement
- Partial index on `parent_comment_id` (WHERE parent_comment_id IS NOT NULL) - for threaded replies
- Index on `author_id` - for finding comments by author
- Partial index on `is_clarification_request` (WHERE is_clarification_request = true) - for clarification queries
- Index on `resolved` - for filtering resolved/unresolved comments
- Partial index on `assigned_to` (WHERE assigned_to IS NOT NULL) - for assigned clarification requests
- Composite index on `(requirement_id, created_at)` - for chronological ordering

**Foreign Keys:**
- `requirement_id` → `requirements(id)` ON DELETE CASCADE
- `parent_comment_id` → `comments(id)` ON DELETE CASCADE
- `author_id` → `users(id)` ON DELETE RESTRICT
- `assigned_to` → `users(id)` ON DELETE SET NULL

**Triggers:**
- `update_comments_updated_at` - Automatically updates `updated_at` timestamp on UPDATE

**Design Notes:**

The `parent_comment_id` field enables threaded discussions. Top-level comments have `parent_comment_id = NULL`, while replies reference their parent comment.

The `is_clarification_request` and `assigned_to` fields support AI agent workflows where agents can request clarification on ambiguous requirements. When a clarification request is created, it's assigned to the requirement owner for response.

Comments are displayed in chronological order using the `(requirement_id, created_at)` composite index.

### attachments

Stores file attachments for requirements (diagrams, specifications, reference documents).

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique identifier
- `requirement_id` (UUID, NOT NULL, FK → requirements): Requirement this attachment belongs to
- `filename` (VARCHAR(255), NOT NULL): Original filename
- `mime_type` (VARCHAR(100), NOT NULL): MIME type of the file
- `size_bytes` (BIGINT, NOT NULL): File size in bytes
- `storage_path` (VARCHAR(500), NOT NULL, UNIQUE): Local filesystem path relative to uploads directory
- `uploaded_by` (UUID, NOT NULL, FK → users): User who uploaded the file
- `uploaded_at` (TIMESTAMP, NOT NULL): When the file was uploaded

**Indexes:**
- Index on `requirement_id` - for finding all attachments on a requirement
- Index on `uploaded_by` - for finding attachments by uploader
- Composite index on `(requirement_id, uploaded_at)` - for chronological ordering
- Unique index on `storage_path` - for file path lookups and preventing duplicates

**Foreign Keys:**
- `requirement_id` → `requirements(id)` ON DELETE CASCADE
- `uploaded_by` → `users(id)` ON DELETE RESTRICT

**Design Notes:**

Files are stored on the local filesystem in the `./uploads` directory. The `storage_path` field stores the relative path from the uploads directory (e.g., `requirements/req-123/diagram.png`).

The unique index on `storage_path` ensures that each file has a unique location on disk and prevents accidental overwrites.

File metadata (filename, mime_type, size_bytes) is stored in the database for quick queries without accessing the filesystem.

## Migration Strategy

This migration can be run on an existing database with requirements data. The new tables are independent and don't modify existing tables.

**Rollback**: The down migration drops all three tables. Ensure backups exist before running this migration in production.

## Testing

After running this migration, verify:

1. All three tables are created successfully
2. All indexes are created
3. Foreign key constraints are enforced
4. The `update_comments_updated_at` trigger works correctly
5. The unique constraint on `attachments.storage_path` prevents duplicates

## Performance Considerations

- The `snapshot_data` JSONB field in baselines can be large for projects with many requirements. Consider compression for production deployments.
- The composite indexes on `(requirement_id, created_at)` and `(requirement_id, uploaded_at)` optimize chronological queries for comments and attachments.
- Partial indexes reduce index size by only indexing relevant rows (e.g., only threaded comments, only clarification requests).

## Related Requirements

- **Requirement 16.1-16.5**: Baseline creation, locking, and management
- **Requirement 6.1-6.4**: Comments and threaded discussions
- **Requirement 5.1-5.3**: File attachments
- **Requirement 40.1-40.4**: Clarification requests (AI agent support)
