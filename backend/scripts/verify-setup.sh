#!/bin/bash

# Script to verify the migration system setup
# This checks that all required components are in place

set -e

echo "=== Verifying Migration System Setup ==="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules not found. Run 'npm install' first."
  exit 1
fi
echo "✓ Dependencies installed"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
  echo "❌ migrations directory not found"
  exit 1
fi
echo "✓ Migrations directory exists"

# Check if .migrate.json exists
if [ ! -f ".migrate.json" ]; then
  echo "❌ .migrate.json configuration file not found"
  exit 1
fi
echo "✓ Migration configuration file exists"

# Check if initial migration exists
if [ ! -f "migrations/1709000000000_initial-setup.js" ]; then
  echo "❌ Initial setup migration not found"
  exit 1
fi
echo "✓ Initial setup migration exists"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "⚠️  .env file not found. Copy .env.example to .env and configure DATABASE_URL"
  echo "   Example: cp .env.example .env"
else
  echo "✓ .env file exists"
  
  # Check if DATABASE_URL is set
  if grep -q "^DATABASE_URL=" .env; then
    echo "✓ DATABASE_URL is configured"
  else
    echo "⚠️  DATABASE_URL not found in .env file"
  fi
fi

# Check if Docker is running (optional)
if command -v docker &> /dev/null; then
  if docker info &> /dev/null; then
    echo "✓ Docker is running"
    
    # Check if postgres container is running
    if docker-compose ps | grep -q "postgres.*Up"; then
      echo "✓ PostgreSQL container is running"
    else
      echo "⚠️  PostgreSQL container is not running. Start it with 'docker-compose up -d postgres'"
    fi
  else
    echo "⚠️  Docker is installed but not running"
  fi
else
  echo "⚠️  Docker not found. Install Docker to use docker-compose setup"
fi

echo ""
echo "=== Setup Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Ensure PostgreSQL is running (docker-compose up -d postgres)"
echo "2. Configure DATABASE_URL in .env file"
echo "3. Run migrations: npm run db:migrate"
