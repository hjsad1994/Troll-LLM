'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import Sidebar from './Sidebar'
import LoginForm from './LoginForm'

const PUBLIC_ROUTES = ['/usage']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isLoggedIn, loading } = useAuth()
  
  // Public routes don't need auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-slate-400 text-xl">Loading...</div>
      </div>
    )
  }
  
  if (!isLoggedIn) {
    return <LoginForm />
  }
  
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
