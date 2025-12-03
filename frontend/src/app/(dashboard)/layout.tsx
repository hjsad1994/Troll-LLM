'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import LoginForm from '@/components/LoginForm'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center">
        <div className="text-[var(--theme-text-muted)] text-xl">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <LoginForm />
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black relative">
      {/* Background grid pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.25)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>
      <div className="relative z-20">
        <Sidebar />
      </div>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative z-10 pt-[72px] lg:pt-8">
        {children}
      </main>
    </div>
  )
}
