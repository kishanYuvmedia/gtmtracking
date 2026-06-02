#!/bin/bash
# Create the database and run migrations
# Adjust USER if your local postgres user differs

USER="${PGUSER:-postgres}"

echo "Creating database gtmtracking..."
createdb -U "$USER" gtmtracking 2>/dev/null || echo "Database may already exist"

echo "Running migrations..."
cd "$(dirname "$0")/.."
npx tsx src/database/migrate.ts

echo "Setup complete!"
