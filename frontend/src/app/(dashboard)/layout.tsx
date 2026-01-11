'use client'

import { ReactNode, useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import LoginForm from '@/components/LoginForm'
import { getUserProfile } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

// Separate component that uses useSearchParams
function PaymentSuccessHandler({ onPaymentSuccess }: { onPaymentSuccess: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      onPaymentSuccess()
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router, onPaymentSuccess])

  return null
}

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  const { t } = useLanguage()
  const [balance, setBalance] = useState<number | null>(null)
  const [showPaymentToast, setShowPaymentToast] = useState(false)

  // Handle payment success
  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentToast(true)
    setTimeout(() => setShowPaymentToast(false), 4000)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchCreditData = async () => {
      try {
        const profile = await getUserProfile()
        const totalCredits = (profile.credits || 0) + (profile.refCredits || 0)
        setBalance(totalCredits)
      } catch (error) {
        console.error('Failed to fetch credit data:', error)
      }
    }

    const startPolling = () => {
      if (intervalId) return // Already polling
      fetchCreditData() // Immediate fetch when starting/resuming
      intervalId = setInterval(fetchCreditData, 30000)
    }

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - pause polling to conserve resources
        stopPolling()
      } else {
        // Tab is visible - resume polling with immediate fetch
        startPolling()
      }
    }

    // Initial start (only if page is visible)
    if (!document.hidden) {
      startPolling()
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoggedIn])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center">
        <div className="text-[var(--theme-text-muted)] text-xl">{t.dashboardLayout?.loading || 'Loading...'}</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <LoginForm />
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black relative">
      {/* Payment Success Handler - wrapped in Suspense */}
      <Suspense fallback={null}>
        <PaymentSuccessHandler onPaymentSuccess={handlePaymentSuccess} />
      </Suspense>

      {/* Payment Success Toast */}
      {showPaymentToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{t.dashboardLayout?.creditsAdded || 'Credits added!'}</span>
          </div>
        </div>
      )}

      {/* Background grid pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.25)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>
      <div className="relative z-20">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col relative z-10">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pt-[72px] lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>
}
