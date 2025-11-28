'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, isLoggedIn } = useAuth()
  const router = useRouter()
  const [showAccessDenied, setShowAccessDenied] = useState(false)

  useEffect(() => {
    if (!loading && isLoggedIn && user?.role !== 'admin') {
      setShowAccessDenied(true)
      const timer = setTimeout(() => {
        router.replace('/dashboard')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [loading, isLoggedIn, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  if (user?.role !== 'admin') {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-4">You don't have permission to access this page.</p>
            <p className="text-slate-500 text-sm">Redirecting to dashboard...</p>
          </div>
        </div>
      )
    }
    return null
  }

  return <>{children}</>
}
