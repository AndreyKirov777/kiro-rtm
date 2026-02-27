#!/bin/bash

# Script to create a new migration file
# Usage: ./scripts/create-migration.sh migration-name

if [ -z "$1" ]; then
  echo "Error: Migration name is required"
  echo "Usage: ./scripts/create-migration.sh migration-name"
  exit 1
fi

cd "$(dirname "$0")/.." || exit

# Create migration using node-pg-migrate
npm run migrate create "$1"

echo "Migration created successfully!"
