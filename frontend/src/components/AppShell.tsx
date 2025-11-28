'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// Routes that render without any wrapper (landing page, public pages)
const STANDALONE_ROUTES = ['/', '/usage', '/login', '/register', '/models']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Standalone routes render children directly without wrapper
  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  // Dashboard routes are handled by (dashboard) layout
  return <>{children}</>
}
