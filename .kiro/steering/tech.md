# Technology Stack

## Architecture

Monorepo with separate frontend and backend workspaces using npm workspaces.

## Frontend

- **Framework**: React 18 with TypeScript
- **Build tool**: react-scripts (Create React App)
- **HTTP client**: Axios
- **Routing**: react-router-dom
- **Testing**: Jest, React Testing Library

## Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **Database**: PostgreSQL 15
- **Migration tool**: node-pg-migrate
- **Database client**: pg (node-postgres)
- **Testing**: Jest with ts-jest
- **Property-based testing**: fast-check
- **Development**: ts-node-dev with hot reload

## Development Environment

- **Containerization**: Docker Compose
- **Services**: PostgreSQL, backend API (port 4000), frontend (port 3000)
- **Database**: `rmt_dev` database with `rmt_user`

## Code Quality

- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **TypeScript**: Strict mode enabled with comprehensive compiler checks

## Common Commands

### Root Level
```bash
npm run dev              # Start all services via Docker Compose
npm run build            # Build all workspaces
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:property    # Property-based tests only
npm run test:coverage    # Tests with coverage report
npm run db:migrate       # Run database migrations
```

### Backend Only
```bash
npm run dev:backend      # Start backend dev server (port 4000)
npm run db:migrate       # Run pending migrations
npm run db:migrate:down  # Rollback last migration
npm run db:migrate:redo  # Rollback and re-run last migration
npm run db:reset         # Reset database (all down, then all up)
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Frontend Only
```bash
npm run dev:frontend     # Start frontend dev server (port 3000)
npm start                # Alternative to dev:frontend
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

## Testing Conventions

- **Unit tests**: `*.test.ts` or `*.unit.test.ts`
- **Integration tests**: `*.integration.test.ts`
- **Property-based tests**: `*.property.test.ts`
- **Coverage threshold**: 70% for branches, functions, lines, statements

## Database Migrations

- **Tool**: node-pg-migrate
- **Location**: `backend/migrations/`
- **Naming**: Timestamped with descriptive kebab-case names
- **Tracking table**: `pgmigrations`
- **Always provide**: Both `up` and `down` migrations
- **Never modify**: Existing migrations after they're committed

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Source maps**: Enabled for debugging
- **Unused code detection**: Enabled (noUnusedLocals, noUnusedParameters)

## Environment Variables

Backend requires:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: API server port (default 4000)
- `FRONTEND_URL`: CORS configuration
- `UPLOAD_DIR`: File upload directory

Frontend requires:
- `REACT_APP_API_URL`: Backend API URL
