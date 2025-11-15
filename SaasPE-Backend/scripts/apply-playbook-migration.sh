#!/bin/bash
# Script to apply playbook versioning fields migration

set -e

echo "Applying playbook versioning fields migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set it in your .env file or export it"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database

# Apply migration using psql
psql "$DATABASE_URL" -f scripts/apply-playbook-migration.sql

echo "Migration applied successfully!"
echo "Verifying migration..."

# Verify columns exist
psql "$DATABASE_URL" -c "
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Playbook' 
AND column_name IN ('version', 'isTemplate', 'createdBy')
ORDER BY column_name;
"

echo "Migration complete!"

