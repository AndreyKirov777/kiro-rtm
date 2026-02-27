# Project Structure

## Root Directory

```
.
├── backend/              # Node.js/Express API server
├── frontend/             # React/TypeScript web app
├── uploads/              # File storage (auto-created)
├── .kiro/                # Kiro configuration and specs
├── docker-compose.yml    # Multi-service development environment
└── package.json          # Workspace root with shared scripts
```

## Backend Structure

```
backend/
├── src/
│   ├── config/           # Configuration (database, etc.)
│   ├── repositories/     # Data access layer
│   │   ├── *.ts          # Repository implementations
│   │   ├── *.test.ts     # Unit/integration tests
│   │   └── *.property.test.ts  # Property-based tests
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # Application entry point
├── migrations/           # Database migrations (node-pg-migrate)
│   ├── *.js              # Migration files (timestamped)
│   └── docs/             # Migration documentation and tests
├── scripts/              # Utility scripts (migration testing, etc.)
├── docs/                 # Backend documentation
├── jest.config.js        # Jest test configuration
├── tsconfig.json         # TypeScript compiler configuration
└── package.json          # Backend dependencies and scripts
```

## Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.test.tsx      # Application tests
│   ├── index.tsx         # React entry point
│   ├── setupTests.ts     # Test environment setup
│   └── *.css             # Styling
├── public/
│   └── index.html        # HTML template
├── tsconfig.json         # TypeScript configuration
└── package.json          # Frontend dependencies and scripts
```

## Kiro Directory

```
.kiro/
├── specs/                # Feature specifications
│   └── {feature-name}/   # Individual feature specs
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/             # AI assistant guidance documents
    ├── product.md        # Product overview
    ├── tech.md           # Technology stack
    └── structure.md      # This file
```

## Key Conventions

### Repository Pattern

The backend uses a repository pattern for data access:
- `*Repository.ts`: Repository interface and implementation
- `*Repository.test.ts`: Unit and integration tests
- `*Repository.property.test.ts`: Property-based tests using fast-check

### Database Migrations

- Located in `backend/migrations/`
- Named with timestamp prefix: `{timestamp}_{description}.js`
- Always include both `up` and `down` functions
- Documentation in `backend/migrations/docs/`
- Never modify existing migrations after commit

### Testing Organization

- **Unit tests**: Test individual functions/classes in isolation
- **Integration tests**: Test database interactions and API endpoints
- **Property-based tests**: Test invariants and properties using fast-check
- All test files colocated with source files

### TypeScript

- Strict mode enabled across all workspaces
- Explicit return types preferred for public APIs
- Interfaces for data contracts
- Types for internal structures

### Configuration Files

- `.env`: Local environment variables (not committed)
- `.env.example`: Template for required environment variables
- `tsconfig.json`: TypeScript compiler options
- `jest.config.js`: Test runner configuration
- `.eslintrc.json`: Linting rules

## Import Patterns

Backend imports use relative paths:
```typescript
import { DatabaseConfig } from './config/database';
import { RequirementRepository } from './repositories/RequirementRepository';
import { Requirement } from './types';
```

## Naming Conventions

- **Files**: PascalCase for classes/components, camelCase for utilities
- **Directories**: kebab-case
- **Database tables**: snake_case
- **TypeScript**: PascalCase for types/interfaces, camelCase for variables/functions
- **Constants**: UPPER_SNAKE_CASE
- **Migrations**: kebab-case descriptions

## Documentation

- API documentation: `backend/docs/`
- Migration guide: `backend/docs/MIGRATIONS.md`
- Migration-specific docs: `backend/migrations/docs/`
- Product requirements: `PRD-Requirements-Management-Traceability.md`
- Setup instructions: `SETUP.md`
