# Migration Guide

Guide for migrating existing pages to the new design system.

## Step-by-Step Migration Process

### 1. Wrap Page in DashboardLayout

**Before**:
```tsx
export default function MyPage() {
  return (
    <div>
      {/* Content */}
    </div>
  );
}
```

**After**:
```tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function MyPage() {
  return (
    <DashboardLayout breadcrumb="My Page">
      {/* Content */}
    </DashboardLayout>
  );
}
```

### 2. Update Colors

Replace hardcoded colors with design tokens:

**Before**:
```tsx
<div className="bg-gray-50 text-gray-900 border-gray-200">
```

**After**:
```tsx
<div className="bg-slate-50 text-slate-900 border-slate-200">
```

**Common Replacements**:
- `gray-*` → `slate-*`
- `bg-blue-600` → `bg-blue-600` (same, but verify it's the correct blue)
- Custom hex colors → Design tokens

### 3. Update Typography

**Before**:
```tsx
<h1 className="text-3xl font-bold">Title</h1>
```

**After**:
```tsx
<h1 className="text-4xl font-bold text-slate-900 tracking-tight">Title</h1>
```

**Font Sizes**:
- Page titles: `text-4xl` (36px)
- Section titles: `text-2xl` (24px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)

### 4. Replace Custom Buttons

**Before**:
```tsx
<button className="bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>
```

**After**:
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
```

### 5. Replace Custom Cards

**Before**:
```tsx
<div className="bg-white border rounded-lg p-6 shadow">
  Content
</div>
```

**After**:
```tsx
import { Card, CardContent } from '@/components/ui/card';

<Card>
  <CardContent className="p-8">
    Content
  </CardContent>
</Card>
```

### 6. Update Spacing

Replace arbitrary spacing with design system scale:

**Before**:
```tsx
<div className="p-6 gap-5">
```

**After**:
```tsx
<div className="p-8 gap-6">
```

**Spacing Scale**: xs (4px), sm (8px), md (12px), lg (16px), xl (24px), 2xl (32px), 3xl (40px), 4xl (48px)

### 7. Add Hover States and Transitions

**Before**:
```tsx
<div className="bg-white shadow">
```

**After**:
```tsx
<div className="bg-white shadow-sm transition-all duration-200 hover:shadow-md">
```

### 8. Update Page Header

Add proper page header with correct spacing:

```tsx
<div className="mb-8">
  <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
    Page Title
  </h1>
  <p className="text-base text-slate-600">
    Page description
  </p>
</div>
```

## Migration Checklist

- [ ] Page wrapped in `DashboardLayout`
- [ ] All colors replaced with design tokens
- [ ] Typography updated to use Inter and correct sizes
- [ ] Custom buttons replaced with `Button` component
- [ ] Custom cards replaced with `Card` component
- [ ] Spacing updated to design system scale
- [ ] Hover states added to interactive elements
- [ ] Transitions added (`transition-all duration-200`)
- [ ] Shadows updated (`shadow-sm`, `shadow-md`)
- [ ] Border radius updated (`rounded-sm`, `rounded-md`)
- [ ] Page header matches design system pattern

## Common Issues

### Issue: Colors look different
**Solution**: Verify you're using the correct design tokens. Check `src/styles/design-tokens.css` for exact values.

### Issue: Layout broken after adding DashboardLayout
**Solution**: Remove any existing layout wrappers. `DashboardLayout` handles sidebar and navbar positioning.

### Issue: Content hidden behind navbar
**Solution**: Ensure page header has proper top margin (80px) or use `DashboardLayout` which handles this.

### Issue: Buttons look wrong
**Solution**: Use `Button` component from `@/components/ui/button` instead of custom button styles.

## Examples

See the design demo at `public/design-demo/index.html` for visual reference.

Component examples are in:
- `src/components/design-system/` - Design system specific components
- `src/components/ui/` - Reusable UI components

