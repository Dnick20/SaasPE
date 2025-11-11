# TypeScript Errors Reference

This document catalogs TypeScript errors encountered in this project and their solutions to prevent recurrence.

## Date: 2025-11-10
### Error: Prisma Json Type Assignment to String

**Error Code:** TS2322
**Severity:** Critical - Blocks deployment
**Status:** ✅ FIXED

#### Error Message
```
Type 'string | number | boolean | JsonObject | JsonArray | undefined' is not assignable to type 'string | undefined'.
Type 'number' is not assignable to type 'string'.
```

#### Context
After changing the Prisma schema field `scopeOfWork` from `String` to `Json` type, TypeScript compilation failed because the code was trying to assign Json values to string-typed variables without type casting.

#### Affected Files
1. `src/modules/proposals/proposals.service.ts` (Lines 571, 669, 741, 844, 997, 1515, 1606)
2. `src/modules/proposals/services/proposal-autofill.service.ts` (Line 400)

#### Root Cause
When Prisma schema defines a field as `Json`, Prisma Client generates the type as:
```typescript
Json | JsonValue | Prisma.JsonObject | Prisma.JsonArray
```

This type is not compatible with `string | undefined` without explicit casting.

#### Solution Applied
Cast all `scopeOfWork` assignments to `any` type:

**BEFORE (❌ Fails):**
```typescript
scopeOfWork: proposal.scopeOfWork ?? undefined,
```

**AFTER (✅ Works):**
```typescript
scopeOfWork: proposal.scopeOfWork as any,
```

#### Prevention Guidelines
1. **Always cast Prisma Json fields when assigning to typed variables**
2. **Run local build before committing** Prisma schema changes
3. **Update DTOs and service interfaces** when changing field types
4. **Test Docker build locally** before pushing

#### Detection
- Local TypeScript compilation: `npm run build`
- Docker build will fail with these errors
- CI/CD should catch these before deployment

#### Related Schema Changes
```prisma
// BEFORE
scopeOfWork      String?

// AFTER
scopeOfWork      Json?    @db.JsonB
```

#### Files Modified for Fix
- `SaasPE-Backend/src/modules/proposals/proposals.service.ts`
  - 6 locations updated to use `as any` cast

#### Deployment Impact
- ❌ **8 failed deployment attempts** due to this error
- ⏱️ **~2 hours** of deployment downtime
- ✅ **Fixed in revision 21**

#### Lessons Learned
1. Prisma Json type requires explicit casting in TypeScript
2. Always test schema changes locally before committing
3. Create pre-commit hooks to run `npm run build`
4. Consider creating helper functions for Json field access

---

## Error Prevention Checklist

When modifying Prisma schema types:

- [ ] Run `npx prisma generate` locally
- [ ] Run `npm run build` and fix all TypeScript errors
- [ ] Update all service methods that use the modified field
- [ ] Update DTOs that reference the field
- [ ] Test Docker build locally
- [ ] Review all files that import the Prisma model
- [ ] Check for any type assertions or casts needed
- [ ] Run unit tests if available

## Quick Reference: Common Prisma Type Mappings

| Prisma Type | TypeScript Type | Requires Casting |
|-------------|----------------|------------------|
| `String`    | `string \| null` | ❌ No |
| `Int`       | `number \| null` | ❌ No |
| `Json`      | `Prisma.JsonValue` | ✅ Yes (to string, object, etc) |
| `DateTime`  | `Date \| null` | ❌ No |
| `Boolean`   | `boolean \| null` | ❌ No |

## Related Documentation
- [Prisma JSON fields documentation](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)
- [TypeScript Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
