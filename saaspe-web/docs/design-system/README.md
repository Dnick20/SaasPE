# SaaSOPE Design System

This directory contains documentation for the SaaSOPE premium design system implementation.

## Overview

The SaaSOPE design system provides a consistent, professional visual language across the entire application. It's based on the premium design demo and implemented using CSS custom properties, Tailwind CSS, and React components.

## Quick Links

- [Design Tokens](./tokens.md) - Complete reference for colors, typography, spacing, shadows
- [Components](./components.md) - Component library documentation
- [Migration Guide](./migration.md) - Guide for migrating existing pages

## Design System Foundation

### Location
- **Design Tokens**: `src/styles/design-tokens.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Global Styles**: `src/app/globals.css`

### Core Principles

1. **Consistency**: All components follow the same design patterns
2. **Accessibility**: WCAG AA compliant colors and interactions
3. **Professional**: Clean, minimal, confident aesthetic
4. **Scalable**: Design tokens make updates easy and consistent

## Component Library

### Layout Components
- `DashboardLayout` - Main layout wrapper with sidebar and navbar
- `DesignSystemSidebar` - Fixed sidebar navigation
- `DesignSystemNavbar` - Top navigation bar

### UI Components
- `Button` - Primary, secondary, outline variants
- `Card` - Container component with hover effects
- `MetricCard` - Dashboard metric display component

## Usage

### Creating a New Page

```tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function MyPage() {
  return (
    <DashboardLayout breadcrumb="My Page">
      {/* Your content */}
    </DashboardLayout>
  );
}
```

### Using Design Tokens

Design tokens are available as:
- **CSS Variables**: `var(--slate-900)`, `var(--blue-600)`, etc.
- **Tailwind Classes**: `bg-slate-50`, `text-blue-600`, `shadow-sm`, etc.

## Resources

- Design Demo: `public/design-demo/index.html`
- Agent Documentation: `.ai-framework/agents/01-documentation/design-system-manager.md`
- Component Templates: `.ai-framework/templates/design-system/`

