'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import LoginForm from '@/components/LoginForm'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth()

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
