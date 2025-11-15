# Component Library

Documentation for design system components.

## Layout Components

### DashboardLayout

Main wrapper component for all dashboard pages.

**Location**: `src/components/layout/dashboard-layout.tsx`

**Props**:
- `children`: ReactNode - Page content
- `breadcrumb?`: string - Breadcrumb text shown in navbar

**Usage**:
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

### DesignSystemSidebar

Fixed sidebar navigation component.

**Location**: `src/components/design-system/sidebar.tsx`

**Features**:
- 256px width, fixed position
- Background: `slate-50`
- Logo: "SaaSOPE" in `blue-600`
- Navigation items with active/hover states
- Journey step indicators

### DesignSystemNavbar

Top navigation bar component.

**Location**: `src/components/design-system/navbar.tsx`

**Features**:
- Fixed position, 64px height
- Backdrop blur effect
- Breadcrumb on left
- Company name, token balance, user info, logout on right

## UI Components

### Button

Reusable button component with multiple variants.

**Location**: `src/components/ui/button.tsx`

**Variants**:
- `default` - Primary blue button
- `secondary` - Gray background
- `outline` - Outlined button
- `destructive` - Red destructive action
- `ghost` - Transparent background
- `link` - Text link style

**Sizes**:
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Square icon button

**Usage**:
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="default">
  Click me
</Button>
```

### Card

Container component for content.

**Location**: `src/components/ui/card.tsx`

**Sub-components**:
- `CardHeader` - Card header section
- `CardTitle` - Card title
- `CardDescription` - Card description
- `CardContent` - Card main content
- `CardFooter` - Card footer section

**Usage**:
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### MetricCard

Specialized card for displaying dashboard metrics.

**Location**: `src/components/design-system/metric-card.tsx`

**Props**:
- `label`: string - Metric label
- `value`: string | number - Metric value
- `change?`: object - Change indicator
  - `value`: string - Change value (e.g., "+12.5%")
  - `type`: 'positive' | 'negative' | 'neutral'
  - `label?`: string - Additional label
- `icon?`: LucideIcon - Optional icon
- `className?`: string - Additional classes

**Usage**:
```tsx
import { MetricCard } from '@/components/design-system/metric-card';
import { Users } from 'lucide-react';

<MetricCard
  label="Total Clients"
  value={142}
  change={{
    value: "+12.5%",
    type: "positive",
    label: "from last month"
  }}
  icon={Users}
/>
```

## Component Patterns

### Page Structure

```tsx
<DashboardLayout breadcrumb="Page Name">
  {/* Page Header */}
  <div className="mb-8">
    <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
      Page Title
    </h1>
    <p className="text-base text-slate-600">
      Page description
    </p>
  </div>

  {/* Content */}
  <div className="space-y-6">
    {/* Your content */}
  </div>
</DashboardLayout>
```

### Metrics Grid

```tsx
<div className="grid grid-cols-4 gap-6 mb-8">
  <MetricCard label="Metric 1" value={100} />
  <MetricCard label="Metric 2" value={200} />
  <MetricCard label="Metric 3" value={300} />
  <MetricCard label="Metric 4" value={400} />
</div>
```

### Content Grid

```tsx
<div className="grid grid-cols-2 gap-6">
  <Card>
    <CardContent className="p-8">
      Content 1
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-8">
      Content 2
    </CardContent>
  </Card>
</div>
```

