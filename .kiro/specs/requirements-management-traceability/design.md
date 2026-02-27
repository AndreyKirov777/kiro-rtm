# Design Document

## Overview

The Requirements Management & Traceability (RMT) Application is a full-stack web application designed to manage requirements throughout the software development lifecycle. This design is optimized for local development, allowing developers to run the entire system on their laptop without external services.

### Key Design Goals

- **Local-First**: Run entirely on a developer's machine with minimal setup
- **Traceability**: Bidirectional links between requirements, implementation, and tests
- **Compliance**: Immutable audit trails, electronic signatures, and baseline management
- **API-First**: Comprehensive REST API with stable schemas for AI agent integration
- **Simple Setup**: Single docker-compose command to start all services
- **Scalable Design**: Architecture can scale to production when needed

### Technology Stack

- **Frontend**: React with TypeScript, Axios for HTTP requests
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Docker Compose
- **Storage**: Local filesystem (`./uploads` directory)
- **Search**: PostgreSQL full-text search with GIN indexes
- **Authentication**: Simple JWT with mock users (no OAuth)

## Architecture

### System Architecture

The system follows a simple three-tier architecture optimized for local development:

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development Setup                   │
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ React Dev    │         │ Node.js      │                  │
│  │ Server       │────────▶│ API Server   │                  │
│  │ (Port 3000)  │         │ (Port 4000)  │                  │
│  └──────────────┘         └──────────────┘                  │
│                                  │                            │
│                                  ▼                            │
│                    ┌──────────────────────────┐              │
│                    │ PostgreSQL Database      │              │
│                    │ (Docker Container)       │              │
│                    │ (Port 5432)              │              │
│                    └──────────────────────────┘              │
│                                  │                            │
│                                  ▼                            │
│                    ┌──────────────────────────┐              │
│                    │ Local File Storage       │              │
│                    │ (./uploads)              │              │
│                    └──────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Requirement Service**: CRUD operations for requirements, version management, hierarchy management

**Traceability Service**: Link creation/deletion, impact analysis, orphan detection, traceability matrix generation

**Baseline Service**: Baseline creation, locking, comparison, snapshot management

**Audit Service**: Immutable audit log creation, retention management, history queries

**Workflow Service**: Approval workflow execution, state transitions, reviewer assignment

**Export Service**: Report generation (PDF, CSV, ReqIF, JSON), traceability matrix export

**Import Service**: Data parsing and validation (CSV, ReqIF, Word), bulk requirement creation

### Data Flow Patterns

**Read Operations**: Client → API Gateway → Service → Database

**Write Operations**: Client → API Gateway → Service → Database → Audit Service

**Search Operations**: Client → API Gateway → Database Full-Text Search

**Export Operations**: Client → API Gateway → Export Service → Database → File Generation → Local Filesystem

## Setup and Running

### Quick Start with Docker Compose

The simplest way to run the application locally:

**Prerequisites**:
- Docker and Docker Compose

**Setup Steps**:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd requirements-management-traceability
   ```

2. **Start all services**:
   ```bash
   docker-compose up
   ```

That's it! The application will:
- Start PostgreSQL database on port 5432
- Start the backend API on http://localhost:4000
- Start the frontend on http://localhost:3000
- Create uploads directory at `./uploads`
- Open your browser automatically

3. **Access the application**:
   - Web UI: http://localhost:3000
   - REST API: http://localhost:4000/api/v1

4. **Stop all services**:
   ```bash
   docker-compose down
   ```

**Default Development Credentials**:
- Email: `admin@example.com`
- Password: Any password (mock auth accepts anything)

### Docker Compose Configuration

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=rmt_dev
      - POSTGRES_USER=rmt_user
      - POSTGRES_PASSWORD=rmt_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rmt_user -d rmt_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://rmt_user:rmt_password@postgres:5432/rmt_dev
      - JWT_SECRET=dev-secret-change-in-production
      - UPLOAD_DIR=./uploads
    command: npm run dev
    depends_on:
      postgres:
        condition: service_healthy

  # Frontend React app
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:4000
    command: npm start
    depends_on:
      - api

volumes:
  postgres_data:
```

### Local Development Features

**Full Features**:

The local development environment provides complete functionality:

1. **Core CRUD Operations**: All requirement management operations work identically
2. **Traceability Links**: Full traceability functionality including impact analysis
3. **Baselines**: Baseline creation, locking, and comparison
4. **Audit Trail**: Complete audit logging to PostgreSQL database
5. **Electronic Signatures**: Signature capture and verification
6. **Import/Export**: All import and export formats (CSV, JSON, PDF, ReqIF, Word)
7. **Approval Workflows**: Full workflow state machine
8. **REST API**: Full REST API functionality with nested resource loading
9. **Full-Text Search**: PostgreSQL full-text search with GIN indexes

**Simplified/Mocked Features**:

1. **Authentication**: Mock authentication accepts any email/password
2. **External Integrations**: Jira, GitHub, and Linear integrations are mocked (optional)
3. **Notifications**: Console logging instead of email delivery
4. **Multi-tenancy**: Single organization mode (simplified)
5. **Caching**: In-memory caching using JavaScript Map objects
6. **File Storage**: Local filesystem instead of S3

### Environment Configuration

Create a `.env` file in the backend directory (optional - defaults work out of the box):

```bash
# Database
DATABASE_URL=postgresql://rmt_user:rmt_password@localhost:5432/rmt_dev

# Authentication
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRATION=24h

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Server
PORT=4000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Database Setup

The application uses PostgreSQL with Docker Compose:

**PostgreSQL Setup**:
- Automatically started by Docker Compose
- Database created at first startup
- Excellent performance for all dataset sizes
- Full-text search using GIN indexes
- Connection pooling for concurrent access

**Running Migrations**:
```bash
npm run db:migrate
```

**Loading Sample Data**:
```bash
npm run db:seed
```

The seed script creates:
- 50 requirements across different types and statuses
- Hierarchical requirement structure (3 levels deep)
- 20 traceability links between requirements
- 2 baselines (1 locked, 1 unlocked)
- 10 comments on various requirements
- 5 file attachments
- Complete audit trail for all operations

### Testing

**Run All Tests**:
```bash
npm test
```

**Run Unit Tests Only**:
```bash
npm run test:unit
```

**Run Integration Tests**:
```bash
npm run test:integration
```

**Run Property-Based Tests**:
```bash
npm run test:property
```

**Run with Coverage**:
```bash
npm run test:coverage
```

### Troubleshooting

**Port Already in Use**:
```bash
# Find process using port 4000 or 5432
lsof -i :4000
lsof -i :5432
# Kill the process
kill -9 <PID>
```

**Database Connection Errors**:
- Ensure Docker Compose is running: `docker-compose ps`
- Check PostgreSQL container logs: `docker-compose logs postgres`
- Verify PostgreSQL is ready: `docker-compose exec postgres pg_isready -U rmt_user -d rmt_dev`
- Check connection string in `.env`

**Docker Container Issues**:
```bash
# Restart all services
docker-compose restart

# Rebuild containers
docker-compose up --build

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

**Module Not Found Errors**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**File Upload Failures**:
- Ensure `./uploads` directory exists and is writable
- Check `MAX_FILE_SIZE_MB` environment variable

## Components and Interfaces

### REST API Endpoints

Base URL: `/api/v1`

The REST API provides comprehensive query capabilities including nested resource loading, filtering, sorting, pagination, batch operations, and field selection to handle complex relational queries efficiently.

#### Query Parameters (Global)

All list endpoints support the following query parameters:

**Pagination**:
- `limit` - Number of items per page (default: 50, max: 1000)
- `offset` - Offset-based pagination (default: 0)
- `cursor` - Cursor-based pagination (alternative to offset)

**Field Selection (Sparse Fieldsets)**:
- `fields` - Comma-separated list of fields to include (e.g., `fields=id,title,status`)
- Reduces payload size by returning only requested fields
- Example: `GET /requirements?fields=id,title,status,priority`

**Resource Expansion**:
- `include` - Comma-separated list of related resources to embed (e.g., `include=links,comments,attachments`)
- Supported values: `links`, `comments`, `attachments`, `history`, `parent`, `children`, `upstreamLinks`, `downstreamLinks`, `createdBy`, `updatedBy`
- Example: `GET /requirements/123?include=links,comments,attachments`

**Filtering**:
- `filter[field]` - Filter by field value
- `filter[field][operator]` - Filter with operator (eq, ne, gt, lt, gte, lte, in, contains)
- Example: `GET /requirements?filter[status]=approved&filter[priority][in]=high,critical`

**Sorting**:
- `sort` - Comma-separated list of fields to sort by (prefix with `-` for descending)
- Example: `GET /requirements?sort=-priority,createdAt`

#### Requirements

**GET /requirements/:id**
- Retrieve a single requirement
- Query params: `include`, `fields`
- Response: Requirement object with requested expansions

**GET /requirements**
- List requirements with filtering and pagination
- Query params: All global params plus:
  - `filter[projectId]` - Filter by project
  - `filter[status]` - Filter by status (draft, in_review, approved, deprecated)
  - `filter[type]` - Filter by type
  - `filter[priority]` - Filter by priority
  - `filter[tags]` - Filter by tags (comma-separated)
  - `filter[assigneeId]` - Filter by assignee
  - `filter[coverageStatus]` - Filter by coverage status
  - `filter[parentId]` - Filter by parent (use `null` for root requirements)
  - `filter[customFields][name]` - Filter by custom field value
  - `search` - Full-text search across title and description
- Response: Paginated list with metadata

Example request:
```
GET /requirements?filter[projectId]=proj-123&filter[status][in]=approved,in_review&filter[priority]=high&include=links,comments&sort=-updatedAt&limit=20&offset=0
```

Example response:
```json
{
  "data": [
    {
      "id": "req-123",
      "displayId": "REQ-001",
      "title": "User authentication",
      "status": "approved",
      "priority": "high",
      "links": [...],
      "comments": [...]
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "links": {
    "next": "/api/v1/requirements?offset=20&limit=20",
    "prev": null
  }
}
```

**POST /requirements**
- Create a new requirement
- Body: Requirement data
- Response: Created requirement

**PUT /requirements/:id**
- Update a requirement
- Body: Partial requirement data
- Response: Updated requirement

**DELETE /requirements/:id**
- Delete (deprecate) a requirement
- Response: 204 No Content

**GET /requirements/:id/history**
- Get revision history
- Query params: `limit`, `offset`
- Response: Paginated list of historical versions

**POST /requirements/:id/restore**
- Restore a previous version
- Body: `{ "version": 3 }`
- Response: Restored requirement

**GET /requirements/:id/impact**
- Get impact analysis
- Query params: `include` (to expand impacted items)
- Response: Tree of impacted requirements and external items

**GET /requirements/:id/links**
- Get all traceability links for a requirement
- Query params: `filter[linkType]`, `filter[direction]` (upstream, downstream, both)
- Response: List of traceability links with expanded targets

#### Traceability

**POST /traceability-links**
- Create a traceability link
- Body: `{ "sourceId": "req-123", "targetId": "req-456", "linkType": "derives_from" }`
- Response: Created link

**DELETE /traceability-links/:id**
- Delete a traceability link
- Response: 204 No Content

**GET /traceability-links**
- List traceability links
- Query params: `filter[sourceId]`, `filter[targetId]`, `filter[linkType]`, `include=source,target`
- Response: Paginated list of links

**GET /projects/:id/traceability-matrix**
- Generate traceability matrix
- Query params: `format` (json, csv, pdf), `filter[type]` (to filter requirement types)
- Response: Traceability matrix data or file download

**GET /projects/:id/orphaned-requirements**
- List orphaned requirements (no downstream links)
- Query params: Standard filtering and pagination
- Response: Paginated list of orphaned requirements

#### Baselines

**POST /baselines**
- Create a baseline
- Body: `{ "projectId": "proj-123", "name": "Release 1.0", "description": "..." }`
- Response: Created baseline

**PUT /baselines/:id/lock**
- Lock a baseline
- Response: Locked baseline

**GET /baselines/:id**
- Retrieve a baseline
- Query params: `include=requirements` (to embed requirement snapshots)
- Response: Baseline with optional requirement snapshots

**GET /baselines/:id/compare/:targetId**
- Compare two baselines (or baseline to current if targetId is "current")
- Response: Comparison showing added, modified, deleted requirements

**GET /baselines**
- List baselines
- Query params: `filter[projectId]`, `filter[locked]`, standard pagination
- Response: Paginated list of baselines

#### Workflows

**POST /requirements/:id/approve**
- Approve a requirement
- Body: `{ "signature": { "meaning": "Approved for implementation" } }`
- Response: Updated requirement with approval

**POST /requirements/:id/request-changes**
- Request changes to a requirement
- Body: `{ "reason": "Missing acceptance criteria" }`
- Response: Updated requirement

**POST /requirements/:id/reject**
- Reject a requirement
- Body: `{ "reason": "Out of scope" }`
- Response: Updated requirement

#### Comments

**POST /requirements/:id/comments**
- Add a comment to a requirement
- Body: `{ "content": "...", "isClarificationRequest": false }`
- Response: Created comment

**GET /requirements/:id/comments**
- Get comments for a requirement
- Query params: `filter[resolved]`, `include=author`, pagination
- Response: Paginated list of comments

**PUT /comments/:id**
- Update a comment
- Body: `{ "content": "...", "resolved": true }`
- Response: Updated comment

**DELETE /comments/:id**
- Delete a comment
- Response: 204 No Content

#### Attachments

**POST /requirements/:id/attachments**
- Upload an attachment
- Body: Multipart form data with file
- Response: Created attachment metadata

**GET /requirements/:id/attachments**
- List attachments for a requirement
- Response: List of attachment metadata

**GET /attachments/:id/download**
- Download an attachment file
- Response: File stream

**DELETE /attachments/:id**
- Delete an attachment
- Response: 204 No Content

#### Import/Export

**POST /import/csv**
- Import from CSV
- Body: Multipart form data with CSV file and field mapping
- Response: Import job ID and status

**POST /import/reqif**
- Import from ReqIF
- Body: Multipart form data with ReqIF XML file
- Response: Import job ID and status

**POST /import/word**
- Import from Word
- Body: Multipart form data with .docx file
- Response: Import job ID and status

**GET /import/jobs/:id**
- Get import job status
- Response: Job status, progress, errors

**GET /export/csv**
- Export to CSV
- Query params: `filter[projectId]`, `fields` (columns to include)
- Response: CSV file download

**GET /export/json**
- Export to JSON
- Query params: `filter[projectId]`, `include` (related resources)
- Response: JSON file download

**GET /export/pdf**
- Export to PDF
- Query params: `filter[projectId]`, `template` (report template)
- Response: PDF file download

**GET /export/reqif**
- Export to ReqIF
- Query params: `filter[projectId]`
- Response: ReqIF XML file download

#### Batch Operations

**POST /requirements/batch**
- Bulk fetch requirements by IDs
- Body: `{ "ids": ["req-123", "req-456", "req-789"], "include": "links,comments" }`
- Response: Array of requirements (preserves order, includes null for not found)

**POST /traceability-links/batch**
- Bulk create traceability links
- Body: `{ "links": [{ "sourceId": "...", "targetId": "...", "linkType": "..." }, ...] }`
- Response: Array of created links with individual success/error status

**PUT /requirements/batch**
- Bulk update requirements
- Body: `{ "updates": [{ "id": "req-123", "status": "approved" }, ...] }`
- Response: Array of updated requirements with individual success/error status

**DELETE /requirements/batch**
- Bulk delete requirements
- Body: `{ "ids": ["req-123", "req-456"] }`
- Response: Batch operation result with individual success/error status

#### Search

**GET /search**
- Full-text search across requirements
- Query params:
  - `q` - Search query
  - `filter[projectId]` - Limit to project
  - `filter[type]`, `filter[status]`, etc. - Additional filters
  - `include` - Expand related resources
  - Standard pagination
- Response: Paginated search results with relevance scores

#### Audit Trail

**GET /audit-trail**
- Get audit entries
- Query params:
  - `filter[entityType]` - Filter by entity type
  - `filter[entityId]` - Filter by entity ID
  - `filter[actorId]` - Filter by actor
  - `filter[action]` - Filter by action
  - `filter[timestamp][gte]`, `filter[timestamp][lte]` - Date range
  - Standard pagination
- Response: Paginated list of audit entries

#### Projects

**GET /projects**
- List projects
- Query params: Standard pagination
- Response: Paginated list of projects

**GET /projects/:id**
- Get project details
- Query params: `include=customFieldDefinitions,approvalWorkflow`
- Response: Project with optional expansions

**POST /projects**
- Create a project
- Body: Project data
- Response: Created project

**PUT /projects/:id**
- Update a project
- Body: Partial project data
- Response: Updated project

#### Users

**GET /users/me**
- Get current user profile
- Response: User object

**PUT /users/me**
- Update current user profile
- Body: Partial user data (name, notificationPreferences)
- Response: Updated user

**GET /users**
- List users in organization (admin only)
- Query params: Standard pagination
- Response: Paginated list of users

#### API Tokens

**GET /api-tokens**
- List API tokens for current user
- Response: List of tokens (hashed values not returned)

**POST /api-tokens**
- Create an API token
- Body: `{ "name": "CI/CD Token", "scopes": ["requirements:read"], "expiresAt": "2025-12-31" }`
- Response: Created token with plaintext value (only shown once)

**DELETE /api-tokens/:id**
- Revoke an API token
- Response: 204 No Content

#### Implementation Status (AI Agent Endpoint)

**GET /requirements/:id/implementation-status**
- Get implementation status for AI agents
- Query params: `include=links` (to expand linked items)
- Response: Requirement details, approval status, linked implementation items with states, coverage status

#### Clarification Requests (AI Agent Endpoint)

**POST /requirements/:id/clarification-requests**
- Create a clarification request
- Body: `{ "question": "What is the expected behavior when...?" }`
- Response: Created comment with clarification request flag, notification sent to owner

### Integration Interfaces

#### Jira Integration

- **Authentication**: OAuth 2.0 with Jira Cloud
- **API**: Jira REST API v3
- **Operations**:
  - Create traceability link to Jira issue
  - Fetch issue status and metadata
  - Post comments to Jira issues when requirements change
  - Subscribe to Jira webhooks for status updates

#### GitHub Integration

- **Authentication**: OAuth 2.0 with GitHub Apps
- **API**: GitHub REST API v3
- **Operations**:
  - Create traceability link to GitHub issue or PR
  - Fetch issue/PR status and metadata
  - Subscribe to GitHub webhooks for status updates

#### Linear Integration

- **Authentication**: OAuth 2.0 with Linear
- **API**: Linear REST API
- **Operations**:
  - Create traceability link to Linear issue
  - Fetch issue status and metadata
  - Subscribe to Linear webhooks for status updates

## Data Models

### Core Entities

#### Requirement

```typescript
interface Requirement {
  id: string;                    // UUID
  displayId: string;             // Stable human-readable ID (e.g., "REQ-001")
  projectId: string;
  parentId: string | null;       // Hierarchical relationships
  
  title: string;
  description: string;           // Rich text (HTML)
  type: RequirementType;
  status: RequirementStatus;
  priority: Priority;
  version: number;               // Incremented on each update
  
  tags: string[];
  customFields: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;             // User ID
  updatedBy: string;             // User ID
  
  // Computed fields (not stored)
  coverageStatus?: CoverageStatus;
  isOrphaned?: boolean;
}
```

#### TraceabilityLink

```typescript
interface TraceabilityLink {
  id: string;                    // UUID
  
  sourceId: string;              // Requirement ID
  targetId: string;              // Requirement ID or external item reference
  targetType: 'requirement' | 'external';
  
  linkType: LinkType;
  
  // For external items (optional/mocked in local dev)
  externalSystem?: 'jira' | 'github' | 'linear';
  externalId?: string;
  externalMetadata?: {
    title: string;
    status: string;
    url: string;
    lastSyncedAt: Date;
  };
  
  createdAt: Date;
  createdBy: string;
}
```

#### Baseline

```typescript
interface Baseline {
  id: string;                    // UUID
  projectId: string;
  
  name: string;
  description: string | null;
  
  locked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;       // User ID
  
  snapshotData: string;          // JSON blob of all requirement states
  
  createdAt: Date;
  createdBy: string;
}
```

#### AuditEntry

```typescript
interface AuditEntry {
  id: string;                    // UUID
  
  timestamp: Date;
  actorId: string;
  actorType: 'user' | 'api_client' | 'system';
  
  entityType: 'requirement' | 'traceability_link' | 'baseline' | 'comment';
  entityId: string;
  
  action: string;                // e.g., "update_status", "create_link"
  changeDescription: string;
  previousValue: any | null;     // JSON
  newValue: any | null;          // JSON
  
  // Immutable - no updates allowed
}
```

#### ElectronicSignature

```typescript
interface ElectronicSignature {
  id: string;                    // UUID
  
  requirementId: string;
  userId: string;
  
  signatureMeaning: string;      // e.g., "Approved for implementation"
  timestamp: Date;
  
  // Tamper-evident hash
  signatureHash: string;         // HMAC-SHA256 of (userId + timestamp + requirementId + meaning)
  
  // Immutable - no updates allowed
}
```

#### Comment

```typescript
interface Comment {
  id: string;                    // UUID
  requirementId: string;
  
  parentCommentId: string | null; // For threaded discussions
  
  content: string;               // Rich text
  authorId: string;
  
  isClarificationRequest: boolean;
  assignedTo: string | null;     // User ID for clarification requests
  resolved: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### Attachment

```typescript
interface Attachment {
  id: string;                    // UUID
  requirementId: string;
  
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;           // Local filesystem path
  
  uploadedBy: string;
  uploadedAt: Date;
}
```

#### Project

```typescript
interface Project {
  id: string;                    // UUID
  
  name: string;
  description: string | null;
  
  customFieldDefinitions: CustomFieldDefinition[];
  approvalWorkflow: ApprovalWorkflow | null;
  
  createdAt: Date;
  createdBy: string;
}
```

#### CustomFieldDefinition

```typescript
interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'enum';
  required: boolean;
  enumValues?: string[];         // For enum type
}
```

#### ApprovalWorkflow

```typescript
interface ApprovalWorkflow {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

interface WorkflowState {
  id: string;
  name: string;
  requiresApproval: boolean;
  reviewerRoles: string[];       // Role IDs
}

interface WorkflowTransition {
  fromState: string;
  toState: string;
  action: 'approve' | 'request_changes' | 'reject';
  requiresSignature: boolean;
}
```

#### User

```typescript
interface User {
  id: string;                    // UUID
  
  email: string;
  name: string;
  role: 'viewer' | 'author' | 'reviewer' | 'approver' | 'administrator';
  
  createdAt: Date;
  lastLoginAt: Date;
}
```

#### ApiToken

```typescript
interface ApiToken {
  id: string;                    // UUID
  userId: string;
  
  name: string;
  tokenHash: string;             // Hashed token value
  scopes: string[];              // e.g., ["requirements:read", "requirements:write"]
  
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  
  createdAt: Date;
}
```

### Database Schema

#### PostgreSQL Tables

**requirements**
- Primary key: `id` (UUID)
- Indexes: `project_id`, `display_id`, `parent_id`, `status`, `type`, `priority`
- Full-text search: GIN index on tsvector column

**traceability_links**
- Primary key: `id` (UUID)
- Indexes: `source_id`, `target_id`, `link_type`
- Unique constraint: `(source_id, target_id, link_type)`

**baselines**
- Primary key: `id` (UUID)
- Indexes: `project_id`, `locked`

**audit_entries**
- Primary key: `id` (UUID)
- Indexes: `entity_type`, `entity_id`, `timestamp`

**electronic_signatures**
- Primary key: `id` (UUID)
- Indexes: `requirement_id`, `user_id`

**comments**
- Primary key: `id` (UUID)
- Indexes: `requirement_id`, `parent_comment_id`

**attachments**
- Primary key: `id` (UUID)
- Indexes: `requirement_id`

**projects**
- Primary key: `id` (UUID)

**users**
- Primary key: `id` (UUID)
- Indexes: `email` (unique)

**api_tokens**
- Primary key: `id` (UUID)
- Indexes: `user_id`, `token_hash` (unique)

### Data Consistency Patterns

**Optimistic Locking**: Use version numbers to prevent concurrent update conflicts

**Audit Log Append-Only**: Audit entries are never updated or deleted, only appended

**In-Memory Cache**: Simple JavaScript Map for caching frequently accessed requirements (cleared on restart)
## Graph Abstraction Layer

The requirements traceability system models relationships between requirements as a directed graph. To support efficient graph operations while maintaining flexibility for future database migrations, we implement an abstraction layer that decouples graph operations from the underlying storage mechanism.

### Design Goals

1. **Storage Agnostic**: Abstract graph operations to allow swapping PostgreSQL for a dedicated graph database (Neo4j, Amazon Neptune) without changing application code
2. **Performance**: Optimize for common graph queries (impact analysis, traceability paths, cycle detection)
3. **Scalability**: Support projects with 100,000+ requirements and complex traceability networks
4. **Maintainability**: Provide a clean interface that simplifies business logic and testing

### Graph Operations Interface

The graph abstraction layer exposes a unified interface for all graph operations:

```typescript
interface IGraphRepository {
  // Traversal Operations
  findDownstreamRequirements(
    sourceId: string, 
    options?: TraversalOptions
  ): Promise<RequirementNode[]>;
  
  findUpstreamRequirements(
    targetId: string, 
    options?: TraversalOptions
  ): Promise<RequirementNode[]>;
  
  findAllPaths(
    sourceId: string, 
    targetId: string, 
    maxDepth?: number
  ): Promise<Path[]>;
  
  findShortestPath(
    sourceId: string, 
    targetId: string
  ): Promise<Path | null>;
  
  // Analysis Operations
  detectCycles(projectId: string): Promise<Cycle[]>;
  
  findOrphanedRequirements(
    projectId: string, 
    direction: 'upstream' | 'downstream' | 'both'
  ): Promise<Requirement[]>;
  
  calculateImpactAnalysis(
    requirementId: string, 
    maxDepth?: number
  ): Promise<ImpactTree>;
  
  calculateCoverageStatus(
    requirementId: string
  ): Promise<CoverageStatus>;
  
  // Multi-Level Traceability
  traceToSource(
    requirementId: string, 
    sourceTypes: string[]
  ): Promise<TraceabilityChain[]>;
  
  traceToImplementation(
    requirementId: string, 
    targetTypes: string[]
  ): Promise<TraceabilityChain[]>;
  
  // Bulk Operations
  bulkFindDownstream(
    sourceIds: string[]
  ): Promise<Map<string, RequirementNode[]>>;
  
  // Graph Statistics
  getGraphMetrics(projectId: string): Promise<GraphMetrics>;
}

interface TraversalOptions {
  maxDepth?: number;              // Limit traversal depth
  linkTypes?: LinkType[];         // Filter by link types
  includeExternal?: boolean;      // Include external items
  stopCondition?: (node: RequirementNode) => boolean;
}

interface RequirementNode {
  requirement: Requirement;
  depth: number;                  // Distance from starting node
  path: string[];                 // IDs of nodes in path from root
  linkType: LinkType;             // Type of link from parent
}

interface Path {
  nodes: Requirement[];
  links: TraceabilityLink[];
  totalDepth: number;
}

interface Cycle {
  nodes: Requirement[];
  links: TraceabilityLink[];
}

interface ImpactTree {
  root: Requirement;
  impactedNodes: RequirementNode[];
  totalImpacted: number;
  maxDepth: number;
}

interface TraceabilityChain {
  source: Requirement;
  target: Requirement | ExternalItem;
  intermediateNodes: RequirementNode[];
  complete: boolean;              // True if chain reaches target type
}

interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDepth: number;
  cycleCount: number;
  orphanCount: number;
  connectedComponents: number;
}
```

### PostgreSQL Implementation

The initial implementation uses PostgreSQL with recursive Common Table Expressions (CTEs) to perform graph traversal. This approach leverages existing infrastructure while providing good performance for most use cases.

#### Recursive CTE Examples

**Finding All Downstream Requirements (Impact Analysis)**:

```sql
WITH RECURSIVE downstream AS (
  -- Base case: start with the source requirement
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.status,
    r.type,
    tl.link_type,
    1 as depth,
    ARRAY[r.id] as path,
    false as is_cycle
  FROM requirements r
  WHERE r.id = $1  -- source requirement ID
  
  UNION ALL
  
  -- Recursive case: find requirements linked from current level
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.status,
    r.type,
    tl.link_type,
    d.depth + 1,
    d.path || r.id,
    r.id = ANY(d.path) as is_cycle
  FROM downstream d
  JOIN traceability_links tl ON tl.source_id = d.id
  JOIN requirements r ON r.id = tl.target_id
  WHERE 
    d.depth < $2  -- max depth parameter
    AND NOT (r.id = ANY(d.path))  -- prevent infinite loops
    AND tl.target_type = 'requirement'
)
SELECT DISTINCT ON (id) *
FROM downstream
ORDER BY id, depth ASC;
```

**Finding All Upstream Requirements (Traceability to Source)**:

```sql
WITH RECURSIVE upstream AS (
  -- Base case: start with the target requirement
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.status,
    r.type,
    tl.link_type,
    1 as depth,
    ARRAY[r.id] as path
  FROM requirements r
  WHERE r.id = $1  -- target requirement ID
  
  UNION ALL
  
  -- Recursive case: find requirements that link to current level
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.status,
    r.type,
    tl.link_type,
    u.depth + 1,
    u.path || r.id
  FROM upstream u
  JOIN traceability_links tl ON tl.target_id = u.id
  JOIN requirements r ON r.id = tl.source_id
  WHERE 
    u.depth < $2  -- max depth parameter
    AND NOT (r.id = ANY(u.path))  -- prevent infinite loops
    AND tl.target_type = 'requirement'
)
SELECT DISTINCT ON (id) *
FROM upstream
ORDER BY id, depth ASC;
```

**Detecting Circular Dependencies**:

```sql
WITH RECURSIVE cycle_detection AS (
  -- Start from each requirement
  SELECT 
    r.id as start_id,
    r.id as current_id,
    ARRAY[r.id] as path,
    false as has_cycle
  FROM requirements r
  WHERE r.project_id = $1
  
  UNION ALL
  
  -- Follow links and detect cycles
  SELECT 
    cd.start_id,
    tl.target_id,
    cd.path || tl.target_id,
    tl.target_id = cd.start_id as has_cycle
  FROM cycle_detection cd
  JOIN traceability_links tl ON tl.source_id = cd.current_id
  WHERE 
    NOT (tl.target_id = ANY(cd.path))
    AND tl.target_type = 'requirement'
    AND array_length(cd.path, 1) < 100  -- prevent runaway recursion
)
SELECT DISTINCT
  start_id,
  path
FROM cycle_detection
WHERE has_cycle = true;
```

**Finding Orphaned Requirements**:

```sql
-- Requirements with no downstream links (no implementation)
SELECT r.*
FROM requirements r
LEFT JOIN traceability_links tl ON tl.source_id = r.id
WHERE 
  r.project_id = $1
  AND r.type IN ('functional', 'non_functional')  -- exclude certain types
  AND tl.id IS NULL
  AND r.status != 'deprecated';

-- Requirements with no upstream links (no source)
SELECT r.*
FROM requirements r
LEFT JOIN traceability_links tl ON tl.target_id = r.id
WHERE 
  r.project_id = $1
  AND r.type IN ('design', 'implementation')  -- types that should have sources
  AND tl.id IS NULL
  AND r.status != 'deprecated';
```

**Finding Shortest Path Between Two Requirements**:

```sql
WITH RECURSIVE paths AS (
  -- Base case: start from source
  SELECT 
    $1::uuid as source_id,
    r.id as current_id,
    ARRAY[r.id] as path,
    ARRAY[]::uuid[] as link_ids,
    0 as depth
  FROM requirements r
  WHERE r.id = $1
  
  UNION ALL
  
  -- Recursive case: extend path
  SELECT 
    p.source_id,
    tl.target_id,
    p.path || tl.target_id,
    p.link_ids || tl.id,
    p.depth + 1
  FROM paths p
  JOIN traceability_links tl ON tl.source_id = p.current_id
  WHERE 
    NOT (tl.target_id = ANY(p.path))  -- no cycles
    AND p.depth < 20  -- reasonable depth limit
    AND tl.target_type = 'requirement'
)
SELECT 
  path,
  link_ids,
  depth
FROM paths
WHERE current_id = $2  -- target requirement ID
ORDER BY depth ASC
LIMIT 1;
```

**Multi-Level Traceability Query (Requirements → Design → Implementation → Tests)**:

```sql
WITH RECURSIVE full_trace AS (
  -- Base case: start with requirement
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.type,
    1 as level,
    ARRAY[r.type] as type_path,
    ARRAY[r.id] as id_path,
    tl.link_type
  FROM requirements r
  WHERE r.id = $1
  
  UNION ALL
  
  -- Recursive case: follow links through different requirement types
  SELECT 
    r.id,
    r.display_id,
    r.title,
    r.type,
    ft.level + 1,
    ft.type_path || r.type,
    ft.id_path || r.id,
    tl.link_type
  FROM full_trace ft
  JOIN traceability_links tl ON tl.source_id = ft.id
  JOIN requirements r ON r.id = tl.target_id
  WHERE 
    NOT (r.id = ANY(ft.id_path))
    AND ft.level < 10
    AND tl.target_type = 'requirement'
)
SELECT * FROM full_trace
ORDER BY level, type;
```

#### PostgreSQL Indexing Strategy

To optimize graph traversal performance, we create strategic indexes:

```sql
-- Primary indexes for traceability links
CREATE INDEX idx_traceability_links_source 
  ON traceability_links(source_id, target_type, link_type);

CREATE INDEX idx_traceability_links_target 
  ON traceability_links(target_id, target_type, link_type);

-- Composite index for bidirectional traversal
CREATE INDEX idx_traceability_links_bidirectional 
  ON traceability_links(source_id, target_id, link_type);

-- Index for project-wide queries
CREATE INDEX idx_requirements_project_status 
  ON requirements(project_id, status, type);

-- Partial index for orphan detection (downstream)
CREATE INDEX idx_requirements_no_downstream 
  ON requirements(project_id, type) 
  WHERE NOT EXISTS (
    SELECT 1 FROM traceability_links 
    WHERE source_id = requirements.id
  );

-- GIN index for path arrays in recursive queries (if storing paths)
CREATE INDEX idx_traceability_paths 
  ON traceability_links USING GIN(path_array);
```

#### Performance Considerations

**Query Optimization**:
- Use `DISTINCT ON` to eliminate duplicate nodes in traversal results
- Set reasonable `max_depth` limits to prevent runaway recursion (default: 20)
- Use `LIMIT` clauses for shortest path queries
- Add `WHERE` filters early in the recursion to prune search space

**Caching Strategy**:
- Cache frequently accessed graph traversals in Redis (TTL: 5 minutes)
- Invalidate cache when traceability links are created/deleted
- Cache key format: `graph:{operation}:{requirementId}:{options_hash}`

**Materialized Views** (for read-heavy workloads):
```sql
-- Pre-compute direct descendants count
CREATE MATERIALIZED VIEW requirement_graph_stats AS
SELECT 
  r.id,
  COUNT(DISTINCT tl_down.target_id) as downstream_count,
  COUNT(DISTINCT tl_up.source_id) as upstream_count
FROM requirements r
LEFT JOIN traceability_links tl_down ON tl_down.source_id = r.id
LEFT JOIN traceability_links tl_up ON tl_up.target_id = r.id
GROUP BY r.id;

CREATE UNIQUE INDEX ON requirement_graph_stats(id);

-- Refresh periodically or on-demand
REFRESH MATERIALIZED VIEW CONCURRENTLY requirement_graph_stats;
```

**Connection Pooling**:
- Use connection pooling to handle concurrent graph queries
- Configure pool size based on expected query load (recommended: 10-20 connections)

### Performance Optimization Strategies

#### 1. Materialized Paths

For frequently accessed hierarchical relationships, store pre-computed paths:

```typescript
interface RequirementWithPath {
  id: string;
  materializedPath: string;  // e.g., "root.parent.child"
  pathDepth: number;
}
```

```sql
-- Find all descendants using materialized path
SELECT * FROM requirements
WHERE materialized_path LIKE 'root.parent.child%'
ORDER BY path_depth;

-- Find all ancestors
SELECT * FROM requirements
WHERE 'root.parent.child.grandchild' LIKE materialized_path || '%'
ORDER BY path_depth DESC;
```

**Trade-offs**:
- Pros: O(1) descendant queries, simple implementation
- Cons: Path updates on reparenting, limited to tree structures (not general graphs)

#### 2. Closure Tables

Store all ancestor-descendant relationships explicitly:

```sql
CREATE TABLE requirement_closure (
  ancestor_id UUID NOT NULL,
  descendant_id UUID NOT NULL,
  depth INTEGER NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX idx_closure_ancestor ON requirement_closure(ancestor_id, depth);
CREATE INDEX idx_closure_descendant ON requirement_closure(descendant_id, depth);
```

```sql
-- Find all descendants at any depth
SELECT r.* 
FROM requirements r
JOIN requirement_closure c ON c.descendant_id = r.id
WHERE c.ancestor_id = $1;

-- Find direct children only
SELECT r.* 
FROM requirements r
JOIN requirement_closure c ON c.descendant_id = r.id
WHERE c.ancestor_id = $1 AND c.depth = 1;
```

**Trade-offs**:
- Pros: Very fast reads, supports complex queries
- Cons: Storage overhead (O(n²) for deep hierarchies), complex write operations

#### 3. Adjacency List with Recursive CTE (Current Approach)

Store only direct links and use recursive CTEs for traversal:

**Trade-offs**:
- Pros: Minimal storage, simple writes, flexible for general graphs
- Cons: Slower reads for deep traversals, query complexity

**When to Use Each Strategy**:
- **Materialized Paths**: Hierarchical requirement structures (parent-child only)
- **Closure Tables**: Read-heavy workloads with complex traceability queries
- **Adjacency List + CTE**: General-purpose, balanced read/write, flexible graph structures (recommended for initial implementation)

### Future Graph Database Migration Path

The abstraction layer enables seamless migration to a dedicated graph database when scale or performance requirements demand it.

#### Migration to Neo4j

**Neo4j Implementation**:

```typescript
class Neo4jGraphRepository implements IGraphRepository {
  private driver: neo4j.Driver;
  
  async findDownstreamRequirements(
    sourceId: string, 
    options?: TraversalOptions
  ): Promise<RequirementNode[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH path = (source:Requirement {id: $sourceId})-[:TRACES_TO*1..${options?.maxDepth || 20}]->(target:Requirement)
        WHERE ALL(node IN nodes(path) WHERE single(x IN nodes(path) WHERE x = node))
        RETURN target, length(path) as depth, [node IN nodes(path) | node.id] as path
        ORDER BY depth
      `, { sourceId });
      
      return result.records.map(record => ({
        requirement: record.get('target').properties,
        depth: record.get('depth'),
        path: record.get('path'),
        linkType: record.get('linkType')
      }));
    } finally {
      await session.close();
    }
  }
  
  async detectCycles(projectId: string): Promise<Cycle[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (r:Requirement {projectId: $projectId})
        MATCH path = (r)-[:TRACES_TO*]->(r)
        RETURN nodes(path) as cycle, relationships(path) as links
      `, { projectId });
      
      return result.records.map(record => ({
        nodes: record.get('cycle').map(n => n.properties),
        links: record.get('links').map(l => l.properties)
      }));
    } finally {
      await session.close();
    }
  }
  
  // ... other methods
}
```

**Neo4j Advantages**:
- Native graph traversal algorithms (shortest path, cycle detection)
- Better performance for complex multi-hop queries
- Built-in graph algorithms (PageRank, community detection)
- Cypher query language optimized for graph patterns

**Migration Steps**:
1. Export requirements and links from PostgreSQL
2. Import into Neo4j using batch import tools
3. Create indexes on node properties (id, projectId, type)
4. Swap `PostgresGraphRepository` for `Neo4jGraphRepository` in dependency injection
5. Run integration tests to verify behavior
6. Deploy with feature flag to gradually roll out

#### Migration to Amazon Neptune

Similar approach using Gremlin query language:

```typescript
class NeptuneGraphRepository implements IGraphRepository {
  private client: gremlin.driver.Client;
  
  async findDownstreamRequirements(
    sourceId: string, 
    options?: TraversalOptions
  ): Promise<RequirementNode[]> {
    const traversal = this.client.submit(
      `g.V().has('id', sourceId)
        .repeat(out('TRACES_TO').simplePath())
        .times(${options?.maxDepth || 20})
        .emit()
        .path()
        .by(valueMap(true))`,
      { sourceId }
    );
    
    // Process results...
  }
}
```

**Neptune Advantages**:
- Fully managed AWS service
- Supports both Gremlin and SPARQL
- Automatic backups and high availability
- Integration with AWS ecosystem

### Data Access Layer Architecture

The graph abstraction layer integrates with the service layer through dependency injection:

```typescript
// Service layer depends on interface, not implementation
class TraceabilityService {
  constructor(
    private graphRepository: IGraphRepository,
    private requirementRepository: IRequirementRepository,
    private auditService: IAuditService
  ) {}
  
  async getImpactAnalysis(requirementId: string): Promise<ImpactTree> {
    // Business logic uses abstract interface
    const impactTree = await this.graphRepository.calculateImpactAnalysis(
      requirementId,
      20  // max depth
    );
    
    // Audit the operation
    await this.auditService.log({
      action: 'impact_analysis',
      entityId: requirementId,
      entityType: 'requirement'
    });
    
    return impactTree;
  }
  
  async createTraceabilityLink(
    sourceId: string, 
    targetId: string, 
    linkType: LinkType
  ): Promise<TraceabilityLink> {
    // Check for cycles before creating link
    const wouldCreateCycle = await this.wouldCreateCycle(sourceId, targetId);
    if (wouldCreateCycle) {
      throw new Error('Cannot create link: would create circular dependency');
    }
    
    // Create link in database
    const link = await this.requirementRepository.createLink({
      sourceId,
      targetId,
      linkType
    });
    
    // Invalidate graph cache
    await this.graphRepository.invalidateCache(sourceId);
    await this.graphRepository.invalidateCache(targetId);
    
    return link;
  }
  
  private async wouldCreateCycle(
    sourceId: string, 
    targetId: string
  ): Promise<boolean> {
    // Check if path already exists from target to source
    const path = await this.graphRepository.findShortestPath(targetId, sourceId);
    return path !== null;
  }
}
```

**Dependency Injection Configuration**:

```typescript
// config/dependencies.ts
import { Container } from 'inversify';

const container = new Container();

// Bind interface to implementation based on configuration
if (config.database.type === 'neo4j') {
  container.bind<IGraphRepository>('IGraphRepository')
    .to(Neo4jGraphRepository)
    .inSingletonScope();
} else {
  // Default to PostgreSQL implementation
  container.bind<IGraphRepository>('IGraphRepository')
    .to(PostgresGraphRepository)
    .inSingletonScope();
}

container.bind<TraceabilityService>('TraceabilityService')
  .to(TraceabilityService)
  .inSingletonScope();

export { container };
```

### Graph Query Examples

#### Example 1: Complete Impact Analysis

```typescript
// Find all requirements impacted by a change
const impactTree = await graphRepository.calculateImpactAnalysis(
  'req-123',
  { maxDepth: 10, includeExternal: true }
);

console.log(`Total impacted: ${impactTree.totalImpacted}`);
console.log(`Max depth: ${impactTree.maxDepth}`);

// Group by depth level
const byDepth = impactTree.impactedNodes.reduce((acc, node) => {
  acc[node.depth] = acc[node.depth] || [];
  acc[node.depth].push(node);
  return acc;
}, {} as Record<number, RequirementNode[]>);
```

#### Example 2: Traceability Matrix Generation

```typescript
// Generate full traceability matrix for a project
const requirements = await requirementRepository.findByProject('proj-123');

const matrix: TraceabilityMatrix = {
  rows: requirements.filter(r => r.type === 'functional'),
  columns: requirements.filter(r => r.type === 'test'),
  cells: []
};

// Bulk fetch all downstream links
const downstreamMap = await graphRepository.bulkFindDownstream(
  matrix.rows.map(r => r.id)
);

// Build matrix cells
for (const row of matrix.rows) {
  for (const col of matrix.columns) {
    const downstream = downstreamMap.get(row.id) || [];
    const isLinked = downstream.some(node => node.requirement.id === col.id);
    
    matrix.cells.push({
      rowId: row.id,
      colId: col.id,
      linked: isLinked,
      path: isLinked ? downstream.find(n => n.requirement.id === col.id)?.path : null
    });
  }
}
```

#### Example 3: Finding Gaps in Traceability

```typescript
// Find requirements that should have tests but don't
const functionalReqs = await requirementRepository.findByType('functional');

const gaps: TraceabilityGap[] = [];

for (const req of functionalReqs) {
  const downstream = await graphRepository.findDownstreamRequirements(
    req.id,
    { linkTypes: ['tests', 'verified_by'] }
  );
  
  const hasTests = downstream.some(node => 
    node.requirement.type === 'test' || 
    node.requirement.type === 'test_case'
  );
  
  if (!hasTests) {
    gaps.push({
      requirement: req,
      missingLinkType: 'test',
      severity: req.priority === 'critical' ? 'high' : 'medium'
    });
  }
}
```

#### Example 4: Compliance Report - Full Traceability Chain

```typescript
// Verify complete traceability from business requirement to test
const businessReqs = await requirementRepository.findByType('business');

const complianceReport: ComplianceReport = {
  totalRequirements: businessReqs.length,
  fullyTraced: 0,
  partiallyTraced: 0,
  notTraced: 0,
  details: []
};

for (const req of businessReqs) {
  const chain = await graphRepository.traceToImplementation(
    req.id,
    ['test', 'test_case']
  );
  
  const hasCompleteChain = chain.some(c => c.complete);
  
  if (hasCompleteChain) {
    complianceReport.fullyTraced++;
  } else if (chain.length > 0) {
    complianceReport.partiallyTraced++;
  } else {
    complianceReport.notTraced++;
  }
  
  complianceReport.details.push({
    requirement: req,
    traceabilityChains: chain,
    status: hasCompleteChain ? 'complete' : chain.length > 0 ? 'partial' : 'missing'
  });
}
```

### Testing Strategy for Graph Operations

**Unit Tests**: Test individual graph operations with small, controlled graphs

**Property-Based Tests**: Verify graph invariants hold across random graph structures
- Property: No cycles should exist after cycle detection and removal
- Property: Shortest path should always be ≤ any other path length
- Property: Impact analysis should include all reachable nodes within max depth

**Integration Tests**: Test against real PostgreSQL database with realistic data volumes

**Performance Tests**: Benchmark query performance with 10k, 50k, 100k requirements

**Migration Tests**: Verify identical results between PostgreSQL and Neo4j implementations


## Security Architecture

### Authentication

**Local Development Authentication**:
- Simple JWT tokens with configurable expiration (default: 24 hours)
- Mock authentication accepts any email/password combination
- Session management in memory (cleared on server restart)

**API Authentication**:
- API tokens with configurable scopes and expiration
- Token hashing using bcrypt before storage

### Authorization

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| Viewer | Read requirements, view traceability, view baselines |
| Author | Viewer + Create/edit requirements, create links, add comments |
| Reviewer | Author + Add review comments, request clarifications |
| Approver | Reviewer + Approve/reject requirements, create electronic signatures |
| Administrator | Approver + Manage projects, workflows, users |

**Permission Enforcement**:
- Middleware checks user role before executing operations
- API tokens are scoped to specific permissions (e.g., `requirements:read`, `requirements:write`)

### Encryption

**Data at Rest**:
- PostgreSQL encryption can be enabled via Docker volume encryption
- Database credentials stored in environment variables

**Data in Transit**:
- HTTPS recommended for production (not required for local dev)
- TLS 1.3 for production deployments

**Sensitive Data**:
- API tokens hashed using bcrypt before storage
- Electronic signature hashes use HMAC-SHA256

### Security Headers (Production)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `X-XSS-Protection: 1; mode=block`

## Compliance and Audit Trail

### Audit Trail Implementation

**Audit Entry Creation**:
- Triggered automatically by database triggers for requirement changes
- Triggered by application code for traceability link changes
- Includes complete before/after state for all changes

**Audit Entry Storage**:
- Append-only table with no update or delete operations
- Monthly partitioning for performance
- Separate tablespace for audit data
- Replicated to separate audit database for tamper resistance

**Audit Entry Retention**:
- Minimum 10-year retention as required by regulations
- Automated archival to cold storage after 2 years
- Compliance with 21 CFR Part 11 for electronic records

### Electronic Signatures

**Signature Capture**:
- User must re-authenticate before signing
- Signature includes: user ID, timestamp, requirement ID, signature meaning
- HMAC-SHA256 hash computed over signature data with secret key
- Hash stored with signature for tamper detection

**Signature Verification**:
- Recompute hash and compare with stored hash
- Any mismatch indicates tampering
- Signature records are immutable and non-repudiable

### Baseline Management

**Baseline Creation**:
- Snapshot captures complete state of all requirements in project
- Includes requirement content, metadata, traceability links
- Stored as compressed JSON blob

**Baseline Locking**:
- Only users with Approver or Administrator role can lock baselines
- Locked baselines are immutable
- Lock timestamp and user recorded in audit trail

**Baseline Comparison**:
- Diff algorithm identifies added, modified, deleted requirements
- Shows field-level changes for modified requirements
- Highlights traceability link changes

### Compliance Reporting

**Gap Reports**:
- Requirements without approved status
- Requirements without test coverage (no VerifiedBy links)
- Requirements with failing tests
- Requirements changed since last baseline

**Traceability Matrix**:
- Shows all requirements with their test coverage status
- Includes links to implementation items
- Exportable to PDF and CSV for regulatory submissions

## Performance and Scalability

### Performance Targets

- **Requirement List Load**: < 2 seconds for 10,000 requirements
- **Traceability Matrix Generation**: < 10 seconds for 2,000 requirements
- **Single Requirement Query**: < 200 milliseconds
- **Implementation Status Endpoint**: < 500 milliseconds
- **Search Query**: < 1 second for full-text search

### Caching Strategy

**In-Memory Caching**:
- Cache individual requirements using JavaScript Map
- Cache traceability links
- Cache invalidation on write operations
- Cleared on server restart

**Browser Caching**:
- Static assets cached for 1 year with cache busting
- API responses include `ETag` headers for conditional requests

### Database Optimization

**Indexing**:
- B-tree indexes on foreign keys and frequently filtered columns
- GIN indexes (PostgreSQL) for full-text search
- Partial indexes for common query patterns (e.g., non-deprecated requirements)

**Query Optimization**:
- Use of prepared statements to prevent SQL injection and improve performance
- Connection pooling (PostgreSQL)
- Query result pagination with cursor-based pagination for large result sets

### Local Development Performance

**PostgreSQL Performance**:
- Excellent performance for all dataset sizes
- Supports concurrent connections via connection pooling
- Full-text search using GIN indexes
- Optimized for both small and large datasets (10,000+ requirements)
- Docker container runs locally with minimal overhead

## Import/Export Mechanisms

### CSV Import

**Process**:
1. User uploads CSV file
2. System parses CSV and displays field mapping UI
3. User maps CSV columns to requirement fields
4. System validates data (required fields, data types, enum values)
5. System displays validation errors if any
6. User confirms import
7. System creates requirements in transaction

**Validation**:
- Required fields present
- Data types match (e.g., priority is valid enum value)
- Display IDs are unique within project
- Parent IDs reference existing requirements

### ReqIF Import

**Process**:
1. User uploads ReqIF XML file
2. System parses ReqIF structure
3. System maps ReqIF spec objects to requirements
4. System maps ReqIF spec relations to traceability links
5. System preserves requirement hierarchy
6. System creates requirements and links in transaction

**Mapping**:
- ReqIF SpecObject → Requirement
- ReqIF SpecRelation → TraceabilityLink
- ReqIF SpecHierarchy → Parent-child relationships
- ReqIF AttributeDefinition → CustomField

### Word Import

**Process**:
1. User uploads Word document (.docx)
2. System parses document structure using Open XML SDK
3. System identifies requirements based on heading levels
4. System extracts requirement text from paragraphs and tables
5. System creates hierarchical requirement structure
6. System creates requirements in transaction

**Parsing Rules**:
- Heading 1 → Project level
- Heading 2 → Module level
- Heading 3 → Requirement
- Heading 4 → Sub-requirement
- Tables parsed for structured requirement attributes

### CSV Export

**Process**:
1. User selects requirements to export (or all in project)
2. User selects fields to include
3. System queries database for requirements
4. System generates CSV with selected fields
5. System returns CSV file for download

**Fields**:
- All standard requirement fields
- Custom fields as separate columns
- Traceability link counts
- Coverage status

### JSON Export

**Process**:
1. User selects requirements to export
2. System queries database for requirements and links
3. System serializes to JSON using stable schema
4. System returns JSON file for download

**Schema**:
- Follows REST API JSON structure
- Includes nested traceability links
- Includes audit trail if requested
- Versioned schema for backward compatibility

### PDF Export

**Process**:
1. User selects requirements and report template
2. System queries database for requirements
3. System generates HTML from template
4. System converts HTML to PDF using headless Chrome
5. System uploads PDF to S3
6. System returns download URL

**Templates**:
- Requirements list with hierarchy
- Traceability matrix
- Compliance gap report
- Custom templates with project branding

### ReqIF Export

**Process**:
1. User selects requirements to export
2. System queries database for requirements and links
3. System maps requirements to ReqIF SpecObjects
4. System maps traceability links to ReqIF SpecRelations
5. System generates ReqIF XML
6. System returns ReqIF file for download

**Mapping**:
- Requirement → ReqIF SpecObject
- TraceabilityLink → ReqIF SpecRelation
- Parent-child relationships → ReqIF SpecHierarchy
- CustomField → ReqIF AttributeDefinition

## Integration Architecture (Optional/Mocked)

For local development, external integrations are optional and can be mocked. The system provides mock implementations that simulate external system behavior without requiring actual API connections.

### Mock Integration Behavior

**Mock External Items**:
- Create mock Jira issues, GitHub issues, or Linear issues
- Simulate status changes
- No actual API calls to external systems
- Data stored locally in database

**Link Creation**:
1. User enters external item reference (e.g., "JIRA-123")
2. System creates mock external item with default metadata
3. System creates traceability link with mock metadata
4. No external API validation required

**Status Synchronization**:
- Manual status updates through UI
- No automatic synchronization
- Simulates external system behavior for testing

### Production Integration (Future)

When deploying to production, real integrations can be enabled:

**Jira Integration**:
- OAuth 2.0 authentication
- Jira REST API v3
- Webhook subscriptions for status updates

**GitHub Integration**:
- OAuth 2.0 with GitHub Apps
- GitHub REST API v3
- Webhook subscriptions for issue/PR updates

**Linear Integration**:
- OAuth 2.0 authentication
- Linear REST API
- Webhook subscriptions for issue updates

## Error Handling

### Error Categories

**Validation Errors** (HTTP 400):
- Missing required fields
- Invalid enum values
- Invalid data types
- Business rule violations (e.g., cannot approve deprecated requirement)

**Authentication Errors** (HTTP 401):
- Missing or invalid authentication token
- Expired token

**Authorization Errors** (HTTP 403):
- Insufficient permissions for operation
- Attempting to access another organization's data

**Not Found Errors** (HTTP 404):
- Requirement not found
- Project not found
- User not found

**Conflict Errors** (HTTP 409):
- Optimistic locking conflict (version mismatch)
- Duplicate display ID
- Circular dependency in requirement hierarchy

**Rate Limit Errors** (HTTP 429):
- Too many requests

**Server Errors** (HTTP 500):
- Database connection failure
- External service unavailable
- Unexpected exceptions

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid requirement status",
    "details": [
      {
        "field": "status",
        "message": "Status must be one of: draft, in_review, approved, deprecated"
      }
    ],
    "requestId": "uuid"
  }
}
```

### Error Handling Strategies

**Retry Logic**:
- Transient database errors: retry up to 3 times with exponential backoff
- External API calls: retry up to 3 times with exponential backoff
- Webhook deliveries: retry up to 5 times with exponential backoff

**Circuit Breaker**:
- External integrations use circuit breaker pattern
- Open circuit after 5 consecutive failures
- Half-open after 30 seconds to test recovery
- Close circuit after 3 successful requests

**Graceful Degradation**:
- If Elasticsearch is down, fall back to PostgreSQL full-text search
- If Redis is down, skip caching and query database directly
- If external system is down, show cached status with staleness indicator

**Transaction Rollback**:
- Database transactions rolled back on error
- Audit entries still created for failed operations (with error details)

**Error Logging**:
- All errors logged with stack trace and context
- Errors include request ID for tracing
- Sensitive data (tokens, passwords) redacted from logs

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Requirement Data Round-Trip

*For any* requirement with valid field values (title, description, type, status, priority, tags, custom fields), creating the requirement and then retrieving it should return all the same field values.

**Validates: Requirements 1.3-1.12, 2.1-2.3, 4.1-4.3**

### Property 2: Internal ID Uniqueness

*For any* set of created requirements, all internal identifiers must be unique across the entire system.

**Validates: Requirements 1.1**

### Property 3: Display ID Stability

*For any* requirement, moving it to a different location in the hierarchy should preserve its Display_ID unchanged.

**Validates: Requirements 1.2, 3.3**

### Property 4: Display ID Non-Reuse

*For any* requirement that is deleted or deprecated, its Display_ID must never be assigned to any future requirement.

**Validates: Requirements 18.1-18.3**

### Property 5: Hierarchical Tree Structure Invariant

*For any* requirement tree, all parent-child relationships must form a valid tree structure with no cycles and all nodes reachable from the root.

**Validates: Requirements 3.1-3.2**

### Property 6: File Attachment Round-Trip

*For any* file attached to a requirement, downloading the file should return content identical to the uploaded content.

**Validates: Requirements 5.1-5.3**

### Property 7: Comment Persistence and Ordering

*For any* sequence of comments added to a requirement, retrieving the comments should return them in chronological order with correct author and timestamp metadata.

**Validates: Requirements 6.1-6.4**

### Property 8: Template Field Pre-Population

*For any* requirement template with defined field values, creating a requirement from that template should pre-populate all template fields with the template's values.

**Validates: Requirements 7.1-7.3**

### Property 9: Traceability Link Bidirectionality

*For any* traceability link created from source requirement A to target B, querying links from A should include the link to B, and querying links to B should include the link from A.

**Validates: Requirements 8.1-8.7**

### Property 10: Traceability Matrix Completeness

*For any* project, the traceability matrix must include all requirements in the project with their correct coverage status.

**Validates: Requirements 9.1-9.2**

### Property 11: Orphaned Requirement Detection

*For any* requirement, it should be identified as orphaned if and only if it has zero downstream traceability links.

**Validates: Requirements 10.1-10.3**

### Property 12: Export Format Round-Trip

*For any* set of requirements exported to JSON or ReqIF format, importing the exported file should recreate requirements with identical field values and hierarchy structure.

**Validates: Requirements 31.1-31.3, 33.1-33.3**

### Property 13: Export Content Completeness

*For any* requirements exported to CSV, PDF, or traceability matrix format, the exported file must contain all specified fields and metadata (project name, baseline, timestamp, user).

**Validates: Requirements 11.1-11.2, 11.4, 30.1-30.3, 32.1-32.3**

### Property 14: Impact Analysis Completeness

*For any* requirement, impact analysis must identify all requirements and external items that have traceability links (direct or transitive) from the requirement.

**Validates: Requirements 12.1-12.4**

### Property 15: Broken Link Detection

*For any* traceability link to an external item, the link should be identified as broken if and only if the external item is deleted or the external system reports it as closed/not found.

**Validates: Requirements 13.1-13.4**

### Property 16: Audit Trail Completeness

*For any* change to a requirement field, requirement status, or traceability link, an audit entry must be created containing timestamp, actor, change description, previous value, and new value.

**Validates: Requirements 14.1-14.5**

### Property 17: Audit Entry Immutability

*For any* audit entry, attempting to modify or delete it after creation must fail, leaving the audit entry unchanged.

**Validates: Requirements 14.6**

### Property 18: Revision History Restoration

*For any* requirement with multiple versions, restoring to a previous version should set all field values to match that historical version exactly.

**Validates: Requirements 15.1-15.3**

### Property 19: Baseline Snapshot Accuracy

*For any* baseline created at time T, the baseline must capture the exact state of all requirements as they existed at time T.

**Validates: Requirements 16.1-16.2**

### Property 20: Baseline Immutability After Locking

*For any* locked baseline, attempting to modify the baseline or any requirement snapshot within it must fail, leaving the baseline unchanged.

**Validates: Requirements 16.3-16.5**

### Property 21: Baseline Comparison Accuracy

*For any* two baselines or a baseline compared to current state, the comparison must correctly identify all added, modified, and deleted requirements with accurate field-level differences.

**Validates: Requirements 17.1-17.4**

### Property 22: Workflow State Transition Enforcement

*For any* requirement in a project with a defined approval workflow, state transitions must only occur through allowed workflow actions, and each transition must move the requirement to the correct next state.

**Validates: Requirements 19.1-19.4, 20.1-20.6**

### Property 23: Electronic Signature Tamper Detection

*For any* electronic signature, recomputing the signature hash from the stored signature data (user ID, timestamp, requirement ID, meaning) must match the stored hash, and any modification to the signature data must cause hash mismatch.

**Validates: Requirements 21.1-21.5**

### Property 24: Search Result Relevance

*For any* search query, all returned requirements must contain the search terms in at least one of their text fields (title, description, tags, custom fields).

**Validates: Requirements 23.1-23.4**

### Property 25: Filter Result Accuracy

*For any* filter criteria (status, type, priority, tag, assignee, custom field, coverage status), all returned requirements must match all specified filter criteria, and no matching requirements should be excluded.

**Validates: Requirements 24.1-24.8**

### Property 26: Saved View Persistence

*For any* saved view with filter and sort configuration, loading the view should restore exactly the same filter criteria and sort order that were saved.

**Validates: Requirements 25.1-25.4**

### Property 27: Dependency Graph Completeness

*For any* project, the dependency graph must include all requirements and all traceability links between them, with correct link types displayed.

**Validates: Requirements 26.1-26.4**

### Property 28: CSV Import Validation

*For any* CSV file with valid requirement data, importing should create requirements with field values matching the CSV data, and invalid CSV data should be rejected with specific validation errors.

**Validates: Requirements 27.1-27.5**

### Property 29: ReqIF Import Structure Preservation

*For any* ReqIF file with hierarchical requirements, importing should create requirements that preserve the hierarchy structure and all attribute mappings.

**Validates: Requirements 28.1-28.5**

### Property 30: Word Import Structure Preservation

*For any* Word document with structured headings, importing should create requirements that preserve the hierarchy based on heading levels.

**Validates: Requirements 29.1-29.5**

### Property 31: REST API CRUD Consistency

*For any* requirement, creating it via REST API, retrieving it, updating it, and retrieving again should show the updated values, and the API responses must conform to the versioned JSON schema.

**Validates: Requirements 34.1-34.8, 36.1-36.4**

### Property 32: REST API Nested Resource Loading

*For any* requirement retrieved with the `include` parameter, the response must contain all requested nested resources (links, comments, attachments) with correct data and relationships.

**Validates: Requirements 34.1-34.8**

### Property 33: API Authentication Enforcement

*For any* API request without valid authentication (API token or OAuth token), the request must be rejected with HTTP 401, and all authenticated requests must be attributed to the correct actor in audit entries.

**Validates: Requirements 37.1-37.5**

### Property 34: Implementation Status Completeness

*For any* requirement, the implementation status endpoint must return requirement details, approval status, all linked implementation items with their states, and coverage status.

**Validates: Requirements 39.1-39.3**

### Property 35: Clarification Request Creation

*For any* clarification request created via API, a comment must be created on the requirement, assigned to the requirement owner, and the owner must be notified.

**Validates: Requirements 40.1-40.4**

### Property 36: Batch Operation Atomicity

*For any* batch API operation (bulk fetch, bulk link creation), either all items must succeed or all must fail together, and partial failures must return detailed error information for each failed item.

**Validates: Requirements 41.1-41.4**

### Property 37: Role-Based Access Control Enforcement

*For any* user with a specific role (Viewer, Author, Reviewer, Approver, Administrator), attempting actions outside their role permissions must be rejected with HTTP 403, and actions within permissions must succeed.

**Validates: Requirements 42.1-42.7**

### Property 38: External Integration Link Synchronization (Optional)

*For any* traceability link to an external item (Jira, GitHub, Linear), the displayed status should match the mock status when using mock integrations, or the current status in the external system when using real integrations.

**Validates: Requirements 50.1-50.5, 51.1-51.5, 52.1-52.4**

### Property 39: Compliance Gap Report Accuracy

*For any* project, compliance gap reports must correctly identify all requirements without approved status, without test coverage, with failing tests, or changed since the last baseline.

**Validates: Requirements 53.1-53.5**

## Testing Strategy

### Unit Testing

**Scope**:
- Individual service methods
- Data validation logic
- Business rule enforcement
- Utility functions

**Framework**: Jest for Node.js/TypeScript

**Coverage Target**: 80% code coverage

**Examples**:
- Test requirement creation with valid data
- Test requirement creation with missing required fields
- Test display ID uniqueness validation
- Test approval workflow state transitions
- Test electronic signature hash generation

### Integration Testing

**Scope**:
- API endpoint behavior
- Database operations
- External service integrations
- Authentication and authorization

**Framework**: Jest with Supertest for API testing

**Examples**:
- Test REST API requirement CRUD operations
- Test REST API nested resource loading with `include` parameter
- Test REST API filtering, sorting, and pagination
- Test Jira integration link creation
- Test webhook delivery
- Test multi-tenancy isolation

### Property-Based Testing

Property-based testing will be used to verify universal properties across all inputs. Each property test will run a minimum of 100 iterations with randomized inputs.

**Framework**: fast-check for TypeScript

**Configuration**:
- Minimum 100 iterations per test
- Each test tagged with reference to design property
- Tag format: `Feature: requirements-management-traceability, Property {number}: {property_text}`

**Dual Testing Approach**:
- Unit tests verify specific examples, edge cases, and error conditions
- Property tests verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage
- Unit tests should focus on concrete scenarios and integration points
- Property tests should focus on universal correctness guarantees

### End-to-End Testing

**Scope**:
- Complete user workflows
- UI interactions
- Cross-service operations

**Framework**: Playwright for browser automation

**Examples**:
- Create requirement → add traceability link → generate matrix
- Import CSV → validate → create requirements
- Create baseline → lock → compare with current state
- Approve requirement → capture signature → verify audit trail

### Performance Testing

**Scope**:
- Load testing for performance targets
- Stress testing for scalability limits
- Endurance testing for memory leaks

**Framework**: k6 for load testing

**Scenarios**:
- 1000 concurrent users browsing requirements
- Bulk import of 10,000 requirements
- Traceability matrix generation for 2,000 requirements
- API rate limit enforcement

### Security Testing

**Scope**:
- Authentication bypass attempts
- Authorization boundary violations
- SQL injection attempts
- XSS attempts
- CSRF protection

**Framework**: OWASP ZAP for automated security scanning

**Manual Testing**:
- Penetration testing by security team
- Multi-tenancy isolation verification
- Audit trail tamper resistance verification

