# Repository Layer

This directory contains the data access layer for the RMT application. Repositories provide CRUD operations and abstract database interactions.

## RequirementRepository

The `RequirementRepository` class provides CRUD operations for requirements with the following features:

- **Connection Pooling**: Uses PostgreSQL connection pool for efficient concurrent access
- **Version Management**: Automatically increments version number on each update
- **Soft Delete**: Delete operation sets status to 'deprecated' rather than hard delete
- **Type Safety**: Full TypeScript support with proper type mappings

### Methods

- `create(requirement)` - Create a new requirement with auto-generated UUID
- `findById(id)` - Find a requirement by its UUID
- `findByProject(projectId)` - Find all requirements for a project
- `update(id, updates)` - Update a requirement and increment version
- `delete(id, updatedBy)` - Soft delete (deprecate) a requirement

### Usage Example

```typescript
import { RequirementRepository } from './repositories/RequirementRepository';

const repository = new RequirementRepository();

// Create a requirement
const requirement = await repository.create({
  displayId: 'REQ-001',
  projectId: 'project-uuid',
  parentId: null,
  title: 'User Authentication',
  description: 'System shall provide user authentication',
  type: 'system_requirement',
  status: 'draft',
  priority: 'high',
  tags: ['security'],
  customFields: {},
  createdBy: 'user-uuid',
  updatedBy: 'user-uuid',
});

// Update the requirement
const updated = await repository.update(requirement.id, {
  status: 'approved',
  updatedBy: 'user-uuid',
});

console.log(updated.version); // 2 (incremented from 1)
```

## Running Tests

The repository tests require a running PostgreSQL database. Follow these steps:

### 1. Start the Database

Using Docker Compose (recommended):

```bash
# From the project root
docker-compose up -d postgres
```

Or start PostgreSQL manually and ensure it's accessible at the connection string in `.env`.

### 2. Set Up Environment

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

### 3. Run Migrations

```bash
npm run db:migrate
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- RequirementRepository.test.ts

# Run with coverage
npm run test:coverage
```

## Test Coverage

The RequirementRepository tests cover:

- ✅ Creating requirements with auto-generated IDs
- ✅ Finding requirements by ID
- ✅ Finding requirements by project
- ✅ Updating requirements with version increment
- ✅ Soft deleting (deprecating) requirements
- ✅ Version management through multiple updates
- ✅ Connection pooling for concurrent operations
- ✅ Handling tags and custom fields (JSON)
- ✅ Proper error handling for non-existent records

## Requirements Validated

This implementation satisfies requirements 1.1-1.12:

- 1.1: Auto-generated unique internal identifier (UUID)
- 1.2: Stable Display_ID that never changes
- 1.3: Title storage
- 1.4: Rich-text description storage
- 1.5: Requirement type assignment
- 1.6: Status assignment
- 1.7: Priority assignment
- 1.8: Version number tracking
- 1.9: Project association
- 1.10: Parent-child relationships
- 1.11: Creation and update timestamps
- 1.12: Creator and updater tracking
