# Component-Specific AI Agent Guidelines

**Parent:** See [../../AGENTS.md](../../AGENTS.md) and [../AGENTS.md](../AGENTS.md) for TypeScript/React conventions.

## Overview

React component library for TrollLLM dashboard with Tailwind CSS styling. Mix of client-side interactive components and server components.

---

## Component Inventory

- **Layout & Shell**
  - `AppShell.tsx` - Main layout wrapper
  - `Sidebar.tsx` - Navigation sidebar
  - `Header.tsx` - Top navigation bar
  - `DocsLayout.tsx` - Documentation pages layout

- **Providers (Context)**
  - `AuthProvider.tsx` - Auth state + routing guard
  - `ThemeProvider.tsx` - Dark/light theme management
  - `LanguageProvider.tsx` - i18n context wrapper

- **Guards**
  - `AdminGuard.tsx` - Admin-only route protection

- **UI Components**
  - `Modal.tsx` - Generic modal overlay
  - `ConfirmDialog.tsx` - Confirmation dialog
  - `Toast.tsx` - Notification toast
  - `ThemeToggle.tsx` - Dark/light theme switcher
  - `LanguageSwitcher.tsx` - Language selector
  - `CreditsStatusWidget.tsx` - User credits display

- **Forms & Input**
  - `LoginForm.tsx` - Login page redirect wrapper

- **Domain-Specific**
  - `PaymentModal.tsx` - Payment flow modal
  - `DashboardPaymentModal.tsx` - Dashboard payment UI
  - `MigrationBanner.tsx` - System migration notice

---

## Component Patterns

### Client Components
All interactive components use `'use client'` directive:
```typescript
'use client'

import { useState } from 'react'

export function InteractiveComponent() {
  const [state, setState] = useState(false)
  return <button onClick={() => setState(!state)}>Toggle</button>
}
```

### Props Typing
Inline interface for simple props, separate for complex:
```typescript
// Simple - inline
export function Modal({ isOpen, title }: { isOpen: boolean; title: string }) { ... }

// Complex - separate interface
interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}
```

### Context Providers
Pattern for global state:
```typescript
'use client'

const MyContext = createContext<MyContextType | undefined>(undefined)

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(...)
  return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>
}

export function useMyContext() {
  const ctx = useContext(MyContext)
  if (!ctx) throw new Error('useMyContext must be used within MyProvider')
  return ctx
}
```

### Tailwind Styling
Use Tailwind utility classes directly:
```typescript
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
  <div className="card p-8 w-full max-w-md">
    {/* Content */}
  </div>
</div>
```

---

## Conventions

### Naming
- Files: `PascalCase.tsx` (e.g., `ThemeProvider.tsx`, `ConfirmDialog.tsx`)
- Components: `PascalCase` matching filename
- Hooks: `use` prefix (e.g., `useTheme`, `useAuth`)
- Context: `[Name]Context` (e.g., `ThemeContext`, `AuthContext`)

### Exports
- **Default exports** for page components
- **Named exports** for reusable components
```typescript
// Reusable component
export function Button() { ... }

// Page component
export default function LoginPage() { ... }
```

### File Organization
- Top-level: General-purpose components
- Subdirectories: Domain-specific (e.g., `docs/DocsLayout.tsx`)

---

## Reusability

### Generic Components
`Modal`, `Toast`, `ConfirmDialog` - parameterized for reuse:
```typescript
<Modal isOpen={open} onClose={() => setOpen(false)} title="Settings">
  <FormContent />
</Modal>
```

### Provider Composition
Nest providers in root layout:
```typescript
<ThemeProvider>
  <LanguageProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </LanguageProvider>
</ThemeProvider>
```

### Guard Pattern
Wrap protected routes with guards:
```typescript
<AdminGuard>
  <AdminDashboard />
</AdminGuard>
```
