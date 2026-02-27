# Setup Guide

This guide will help you set up the Requirements Management & Traceability application for local development.

## Prerequisites

- **Docker Desktop** (recommended) - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js 18+** (for local development without Docker) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

## Quick Start (Recommended)

The fastest way to get started is using Docker Compose:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd requirements-management-traceability
```

### 2. Start All Services

```bash
docker-compose up
```

This single command will:
- Start PostgreSQL database on port 5432
- Start the backend API on http://localhost:4000
- Start the frontend on http://localhost:3000
- Create the uploads directory automatically
- Set up all necessary environment variables

### 3. Access the Application

- **Frontend**: Open http://localhost:3000 in your browser
- **Backend API**: http://localhost:4000/api/v1
- **Health Check**: http://localhost:4000/health

### 4. Default Credentials

For local development, the application uses mock authentication:
- **Email**: `admin@example.com`
- **Password**: Any password (mock auth accepts anything)

### 5. Stop the Application

```bash
# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

## Alternative: Local Development Without Docker

If you prefer to run services locally without Docker:

### 1. Install PostgreSQL

Install PostgreSQL 15 locally and create a database:

```bash
createdb rmt_dev
createuser rmt_user -P  # Set password: rmt_password
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Variables

Create `.env` files from the examples:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` if your PostgreSQL connection differs from defaults.

### 4. Start Services Separately

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## Project Structure

```
requirements-management-traceability/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Main entry point
│   ├── migrations/         # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile.dev
├── frontend/               # React/TypeScript app
│   ├── src/
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile.dev
├── uploads/                # File storage (created automatically)
├── docker-compose.yml      # Docker orchestration
├── package.json            # Root package (monorepo)
└── README.md
```

## Development Workflow

### Running Tests

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

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Port Already in Use

If ports 3000, 4000, or 5432 are already in use:

```bash
# Find process using the port
lsof -i :4000

# Kill the process
kill -9 <PID>
```

Or modify the ports in `docker-compose.yml`.

### Database Connection Issues

1. Ensure PostgreSQL container is running:
   ```bash
   docker-compose ps
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection:
   ```bash
   docker-compose exec postgres pg_isready -U rmt_user -d rmt_dev
   ```

### Docker Issues

```bash
# Restart all services
docker-compose restart

# Rebuild containers
docker-compose up --build

# Reset everything (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

### Module Not Found Errors

```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Once the application is running:

1. Explore the API at http://localhost:4000/api/v1
2. Check the health endpoint at http://localhost:4000/health
3. Open the frontend at http://localhost:3000
4. Review the [API Documentation](./backend/docs/API.md) (to be created)
5. Read the [Developer Guide](./backend/docs/DEVELOPER.md) (to be created)

## Getting Help

- Check the [README.md](./README.md) for general information
- Review the [Design Document](./.kiro/specs/requirements-management-traceability/design.md)
- Check the [Requirements](./.kiro/specs/requirements-management-traceability/requirements.md)

## Environment Variables Reference

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://rmt_user:rmt_password@localhost:5432/rmt_dev | PostgreSQL connection string |
| JWT_SECRET | dev-secret-change-in-production | Secret for JWT signing |
| JWT_EXPIRATION | 24h | JWT token expiration time |
| UPLOAD_DIR | ./uploads | Directory for file uploads |
| MAX_FILE_SIZE_MB | 10 | Maximum file upload size |
| PORT | 4000 | Backend server port |
| NODE_ENV | development | Environment mode |
| FRONTEND_URL | http://localhost:3000 | Frontend URL for CORS |
| LOG_LEVEL | debug | Logging level |

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| REACT_APP_API_URL | http://localhost:4000 | Backend API URL |
