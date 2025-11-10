# Design Tokens Reference

Complete reference for all design system tokens.

## Colors

### Neutral (Slate)
- `slate-50`: #F8FAFC - Light backgrounds
- `slate-100`: #F1F5F9 - Hover backgrounds
- `slate-200`: #E2E8F0 - Borders, dividers
- `slate-300`: #CBD5E1 - Subtle borders
- `slate-400`: #94A3B8 - Disabled text
- `slate-500`: #64748B - Secondary text
- `slate-600`: #475569 - Secondary text (darker)
- `slate-700`: #334155 - Text, icons
- `slate-800`: #1E293B - Dark text
- `slate-900`: #0F172A - Primary text

### Primary (Blue)
- `blue-50`: #EFF6FF - Active backgrounds
- `blue-500`: #3B82F6 - Secondary blue
- `blue-600`: #2563EB - Primary actions, links
- `blue-700`: #1D4ED8 - Hover states

### Semantic Colors

**Success (Emerald)**
- `emerald-100`: #D1FAE5 - Success backgrounds
- `emerald-600`: #059669 - Success text, positive indicators

**Warning (Amber)**
- `amber-100`: #FEF3C7 - Warning backgrounds
- `amber-600`: #D97706 - Warning text

**Error (Red)**
- `red-100`: #FEE2E2 - Error backgrounds
- `red-600`: #DC2626 - Error text, destructive actions

**Info (Sky)**
- `sky-100`: #E0F2FE - Info backgrounds
- `sky-600`: #0284C7 - Info text

## Typography

### Font Family
- **Primary**: Inter (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Font Weights
- `400` - Normal
- `500` - Medium
- `600` - Semibold
- `700` - Bold

### Type Scale
- **Display**: 48px (bold)
- **H1**: 36px (bold, letter-spacing: -0.01em)
- **H2**: 30px (semibold)
- **H3**: 24px (semibold)
- **Body**: 16px (regular, line-height: 1.5)
- **Small**: 14px (regular)
- **XS**: 12px (regular)

## Spacing

- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px
- `3xl`: 40px
- `4xl`: 48px

## Shadows

- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` - Subtle elevation
- `shadow-md`: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` - Standard cards
- `shadow-lg`: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` - Elevated cards

## Border Radius

- `sm`: 6px - Buttons
- `md`: 8px - Cards
- `lg`: 12px - Large containers

## Transitions

- **Base**: 200ms (`duration-200`)
- **Fast**: 150ms (`duration-150`)
- **Slow**: 300ms (`duration-300`)

## Layout Constants

- `sidebar-width`: 256px
- `navbar-height`: 64px
- `container-max-width`: 1440px

## Usage Examples

### Tailwind Classes
```tsx
<div className="bg-slate-50 text-slate-900 p-8 rounded-md shadow-sm">
  Content
</div>
```

### CSS Variables
```css
.my-component {
  background: var(--slate-50);
  color: var(--slate-900);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

