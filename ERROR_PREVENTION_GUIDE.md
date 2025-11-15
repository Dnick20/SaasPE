# Error Prevention Guide for AI Agents & Developers

This guide provides rules and best practices to prevent common errors when building and deploying code in this project.

## 🚨 Critical Rules - Never Skip These

### 1. Always Build Before Committing Schema Changes
**Rule:** When modifying `prisma/schema.prisma`, ALWAYS run a full TypeScript build.

```bash
# Required steps after schema change:
cd SaasPE-Backend
npx prisma generate
npm run build

# If build fails, fix ALL errors before committing
```

**Why:** Prisma type changes (especially `String` → `Json`) break TypeScript compilation in subtle ways that only appear during build.

**Example:**
```typescript
// ❌ WRONG - Will break when field changes from String to Json
scopeOfWork: proposal.scopeOfWork ?? undefined

// ✅ CORRECT - Works with both String and Json types
scopeOfWork: proposal.scopeOfWork as any
```

---

### 2. Type Casting for Prisma Json Fields
**Rule:** Always cast Prisma `Json` type fields when assigning to variables.

**Pattern to Follow:**
```typescript
// When a Prisma field is Json type:
coverPageData: proposal.coverPageData as any,
scopeOfWork: proposal.scopeOfWork as any,
deliverables: proposal.deliverables as any,
timeline: proposal.timeline as any,
```

**Detection:**
```bash
# Error message that indicates you need this fix:
# "Type 'JsonValue' is not assignable to type 'string | undefined'"
```

---

### 3. Test Docker Build Locally
**Rule:** Before pushing code, test the Docker production build locally.

```bash
cd SaasPE-Backend
docker build -f Dockerfile.production --platform linux/amd64 .
```

**Why:** Production builds use different TypeScript settings and can catch errors that local `npm run build` misses.

---

### 4. Update All Affected Files After Schema Changes
**Rule:** When changing a Prisma field type, search for ALL usages and update them.

**Checklist:**
```bash
# Search for all usages of the field:
cd SaasPE-Backend
grep -r "scopeOfWork" src/

# Files to check:
# - src/modules/proposals/proposals.service.ts
# - src/modules/proposals/services/*.ts
# - src/modules/proposals/dto/*.dto.ts
# - Any file that imports the Prisma model
```

---

## 📋 Pre-Commit Checklist

Before committing code changes:

- [ ] Run `npm run build` successfully
- [ ] Run `npm test` if tests exist
- [ ] Check `git diff` for unintended changes
- [ ] Verify no `console.log` or debug code remains
- [ ] If Prisma schema changed:
  - [ ] Ran `npx prisma generate`
  - [ ] Updated all service files using changed fields
  - [ ] Added type casts for Json fields
  - [ ] Tested Docker build locally

---

## 🔍 Common Error Patterns & Solutions

### Error Pattern 1: Json Type Assignment
**Symptom:**
```
TS2322: Type 'JsonValue' is not assignable to type 'string'
```

**Solution:**
```typescript
// Add 'as any' cast
field: model.field as any
```

---

### Error Pattern 2: Missing DTO Fields
**Symptom:**
```
Client Error: property [fieldName] should not exist
```

**Solution:**
```typescript
// Add missing field to DTO:
@ApiPropertyOptional({ description: 'Field description' })
@IsOptional()
@IsString() // or appropriate validator
fieldName?: string;
```

---

### Error Pattern 3: Prisma Client Not Generated
**Symptom:**
```
Cannot find module '@prisma/client'
```

**Solution:**
```bash
npx prisma generate
```

---

## 🤖 Rules for AI Code Generators

### When Modifying Database Models:

1. **ALWAYS run build after schema changes**
   - Don't assume the build will pass
   - Check for type errors in all files that use the model

2. **Cast Json fields to `any`**
   - Never assign Prisma Json types directly to typed variables
   - Use `as any` for maximum compatibility

3. **Update DTOs to match model changes**
   - If adding a field to the model, add it to relevant DTOs
   - If changing a field type, update validators

4. **Search for all usages of changed fields**
   - Use grep or IDE search
   - Check service files, DTOs, and controllers
   - Update ALL occurrences

5. **Test before declaring success**
   - Run `npm run build`
   - Run Docker build if possible
   - Don't mark a task complete until build passes

---

## 🛡️ Defensive Coding Practices

### 1. Use Type Guards
```typescript
// Instead of direct assignment:
if (proposal.scopeOfWork) {
  data.scopeOfWork = proposal.scopeOfWork as any;
}
```

### 2. Create Helper Functions
```typescript
// For repeated Json field access:
function toJsonSafe(value: Prisma.JsonValue): any {
  return value as any;
}

// Usage:
scopeOfWork: toJsonSafe(proposal.scopeOfWork)
```

### 3. Document Type Casts
```typescript
// Add comment explaining why cast is needed:
// Cast to any because Prisma Json type is not compatible with string
scopeOfWork: proposal.scopeOfWork as any,
```

---

## 🎯 Specific to This Project

### Critical Files to Check After Schema Changes:

1. **proposals.service.ts** (Lines 550-600, 660-690, 730-760, 830-860, 980-1010, 1500-1530, 1590-1620)
   - Contains multiple proposal object constructions
   - Always check ALL proposal builders

2. **proposal-autofill.service.ts** (Lines 390-410)
   - Builds proposal objects with existing sections
   - Check existingSections object

3. **pdf-renderer.service.ts**
   - May use proposal fields for rendering
   - Check ProposalData interface

4. **word-exporter.service.ts**
   - May use proposal fields for export
   - Check ProposalData interface

5. **gdocs-exporter.service.ts**
   - May use proposal fields for Google Docs export
   - Check ProposalData interface

---

## 📚 Learning Resources

### Prisma Json Fields
- [Official Docs](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)
- Key takeaway: Json fields are typed as `Prisma.JsonValue` which is a union type

### TypeScript Type Assertions
- [Official Docs](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- Key takeaway: Use `as any` when TypeScript's type system is too strict

---

## 🔄 Recovery Steps When Build Fails

If you encounter a build failure:

1. **Identify the error type**
   ```bash
   npm run build 2>&1 | grep error
   ```

2. **Common fixes by error type:**
   - `JsonValue not assignable`: Add `as any` cast
   - `property should not exist`: Add field to DTO
   - `Cannot find module`: Run `npx prisma generate`

3. **Find all occurrences:**
   ```bash
   grep -r "fieldName" src/ | grep -v node_modules
   ```

4. **Fix systematically:**
   - Fix one file at a time
   - Run build after each fix
   - Document the pattern for future reference

5. **Test the fix:**
   ```bash
   npm run build
   docker build -f Dockerfile.production .
   ```

---

## ✅ Success Indicators

You know you've prevented errors when:

- [ ] `npm run build` completes without errors
- [ ] Docker build completes successfully
- [ ] No TypeScript errors in IDE
- [ ] All tests pass
- [ ] Deployment succeeds without rollback

---

## 🚀 Quick Command Reference

```bash
# Full pre-commit check
cd SaasPE-Backend
npx prisma generate && \
npm run build && \
npm test

# Search for field usages
grep -rn "fieldName" src/ --include="*.ts"

# Check for Json type fields
grep "Json" prisma/schema.prisma

# Test Docker build
docker build -f Dockerfile.production --platform linux/amd64 -t test-build .
```

---

## 📝 Update This Guide

When you encounter a new error pattern:

1. Add it to this guide
2. Include the error message
3. Provide the solution
4. Add detection steps
5. Update the checklist if needed

**Last Updated:** 2025-11-10
**Last Error Fixed:** Prisma Json type assignment (TS2322)
