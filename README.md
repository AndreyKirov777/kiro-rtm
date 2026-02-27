# Requirements Management & Traceability Application

A full-stack web application for managing requirements throughout the software development lifecycle with bidirectional traceability, compliance features, and AI agent support.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)

### Start the Application

```bash
# Start all services (PostgreSQL, backend API, frontend)
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- PostgreSQL: localhost:5432

### Default Development Credentials

- Email: `admin@example.com`
- Password: Any password (mock auth accepts anything)

### Stop the Application

```bash
docker-compose down
```

## Development

### Install Dependencies

```bash
npm install
```

### Run Backend Only

```bash
npm run dev:backend
```

### Run Frontend Only

```bash
npm run dev:frontend
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Property-based tests
npm run test:property

# With coverage
npm run test:coverage
```

### Database Operations

```bash
# Run migrations
npm run db:migrate

# Load sample data
npm run db:seed
```

## Project Structure

```
.
├── backend/          # Node.js/Express API server
├── frontend/         # React/TypeScript web app
├── uploads/          # File storage (created automatically)
├── docker-compose.yml
└── README.md
```

## Technology Stack

- **Frontend**: React, TypeScript, Axios
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **Testing**: Jest, fast-check (property-based testing)
- **Development**: Docker Compose

## Features

- Requirements management with hierarchical organization
- Bidirectional traceability links
- Baseline management and comparison
- Approval workflows with electronic signatures
- Immutable audit trail
- Import/Export (CSV, JSON, PDF, ReqIF, Word)
- Full-text search and filtering
- REST API for AI agent integration
- Compliance reporting

## Documentation

- [API Documentation](./backend/docs/API.md)
- [Developer Guide](./backend/docs/DEVELOPER.md)
- [User Guide](./docs/USER_GUIDE.md)

## License

MIT
