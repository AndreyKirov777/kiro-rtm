#!/bin/bash

# Script to test database migrations
# This script will run migrations up and down to ensure they work correctly

set -e  # Exit on error

echo "=== Testing Database Migrations ==="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Loading environment variables from .env file..."
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  else
    echo "Error: .env file not found and DATABASE_URL not set"
    exit 1
  fi
fi

echo "Database URL: $DATABASE_URL"
echo ""

# Test migration up
echo "Step 1: Running migrations up..."
npm run db:migrate
echo "✓ Migrations up completed successfully"
echo ""

# Test migration down
echo "Step 2: Rolling back last migration..."
npm run db:migrate:down
echo "✓ Migration down completed successfully"
echo ""

# Test migration up again
echo "Step 3: Re-running migrations up..."
npm run db:migrate
echo "✓ Migrations up completed successfully"
echo ""

echo "=== All migration tests passed! ==="
