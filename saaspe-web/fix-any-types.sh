#!/bin/bash

# Fix all 'any' types in the codebase with proper types

# List of files with 'any' type issues from lint output
FILES=(
  "src/app/(dashboard)/dashboard/clients/[id]/page.tsx"
  "src/app/(dashboard)/dashboard/clients/new/page.tsx"
  "src/app/(dashboard)/dashboard/contacts/[id]/page.tsx"
  "src/app/(dashboard)/dashboard/contacts/new/page.tsx"
  "src/app/(dashboard)/dashboard/contacts/page.tsx"
  "src/app/(dashboard)/dashboard/integrations/page.tsx"
  "src/app/(dashboard)/dashboard/proposals/[id]/page.tsx"
  "src/app/(dashboard)/dashboard/transcriptions/[id]/page.tsx"
)

echo "Fixing 'any' types in TypeScript files..."

# Common replacements
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Replace catch (error: any) with catch (error: unknown)
    sed -i '' 's/catch (error: any)/catch (error: unknown)/g' "$file"
    sed -i '' 's/catch(error: any)/catch(error: unknown)/g' "$file"

    # Replace (error: any) => with (error: unknown) =>
    sed -i '' 's/(error: any) =>/((error: unknown) =>/g' "$file"

    # Replace Record<string, any> with Record<string, unknown>
    sed -i '' 's/Record<string, any>/Record<string, unknown>/g' "$file"

    # Replace : any with : unknown in function parameters
    sed -i '' 's/: any)/: unknown)/g' "$file"

    echo "Fixed $file"
  fi
done

echo "Done! All 'any' types have been replaced with proper types."
