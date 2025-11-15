#!/bin/bash

# Fix error handlers to use proper typing with getErrorMessage utility

FILES=$(find src/app -name "*.tsx" -type f)

for file in $FILES; do
  # Replace error.response?.data?.message with proper error handling
  if grep -q "error.response?.data?.message" "$file"; then
    echo "Fixing $file..."

    # Add import if not present
    if ! grep -q "import.*getErrorMessage.*from.*@/lib/types/errors" "$file"; then
      # Add import after other imports
      sed -i '' "/^import.*from/a\\
import { getErrorMessage } from '@/lib/types/errors';
" "$file"
    fi

    # Replace the error message access
    sed -i '' 's/error\.response?\.data?\.message || /getErrorMessage(error) || /g' "$file"
    sed -i '' 's/error\.response?\.data?\.message/getErrorMessage(error)/g' "$file"
  fi
done

echo "Done fixing error handlers"
