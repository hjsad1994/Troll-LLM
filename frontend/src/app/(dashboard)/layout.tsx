'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import LoginForm from '@/components/LoginForm'
import CriticalCreditsBanner from '@/components/CriticalCreditsBanner'
import { getUserProfile, getDetailedUsage } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

// localStorage keys for banner dismiss persistence
const BANNER_DISMISS_KEY = 'trollllm_banner_dismissed'
const SESSION_ID_KEY = 'trollllm_session_id'

interface BannerDismissState {
  dismissed: boolean
  dismissedAtBalance: number
  sessionId: string
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

function getBannerDismissState(): BannerDismissState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BANNER_DISMISS_KEY)
    if (!stored) return null
    const state: BannerDismissState = JSON.parse(stored)
    // Check if same session
    if (state.sessionId !== getSessionId()) {
      // New session - clear dismiss state
      localStorage.removeItem(BANNER_DISMISS_KEY)
      return null
    }
    return state
  } catch {
    return null
  }
}

function saveBannerDismissState(balance: number): void {
  if (typeof window === 'undefined') return
  const state: BannerDismissState = {
    dismissed: true,
    dismissedAtBalance: balance,
    sessionId: getSessionId()
  }
  localStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify(state))
}

function clearBannerDismissState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BANNER_DISMISS_KEY)
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [estimatedRequests, setEstimatedRequests] = useState<number | null>(null)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
  const [creditDataLoading, setCreditDataLoading] = useState(true)
  const [showPaymentToast, setShowPaymentToast] = useState(false)

  // Load dismiss state from localStorage on mount and when balance changes
  useEffect(() => {
    const storedState = getBannerDismissState()
    if (storedState && storedState.dismissed) {
      // Check if balance dropped lower than when dismissed (AC4: re-appear at lower threshold)
      if (balance !== null && balance < storedState.dismissedAtBalance) {
        // Balance dropped further - reset dismiss state, show banner again
        clearBannerDismissState()
        setIsBannerDismissed(false)
      } else {
        // Same or higher balance - keep dismissed
        setIsBannerDismissed(true)
      }
    }
  }, [balance])

  // Handle dismiss with localStorage persistence
  const handleBannerDismiss = () => {
    setIsBannerDismissed(true)
    if (balance !== null) {
      saveBannerDismissState(balance)
    }
  }

  // Handle payment success - show toast and trigger immediate fetch
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      // Show success toast
      setShowPaymentToast(true)

      // Clear URL param (clean URL)
      router.replace('/dashboard', { scroll: false })

      // Auto-dismiss toast after 4 seconds
      const toastTimer = setTimeout(() => setShowPaymentToast(false), 4000)

      return () => clearTimeout(toastTimer)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!isLoggedIn) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchCreditData = async () => {
      try {
        const [profile, usageData] = await Promise.all([
          getUserProfile(),
          getDetailedUsage('7d').catch(() => null)
        ])

        const totalCredits = (profile.credits || 0) + (profile.refCredits || 0)
        setBalance(totalCredits)

        if (usageData && usageData.requestCount > 0 && usageData.creditsBurned > 0) {
          const avgCost = usageData.creditsBurned / usageData.requestCount
          const estimated = totalCredits / avgCost
          setEstimatedRequests(Math.floor(estimated))
        } else {
          setEstimatedRequests(null)
        }
      } catch (error) {
        console.error('Failed to fetch credit data:', error)
      } finally {
        setCreditDataLoading(false)
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
        {/* Critical Credits Banner - conditionally rendered */}
        {!creditDataLoading && balance !== null && balance < 2 && !isBannerDismissed && (
          <CriticalCreditsBanner
            balance={balance}
            estimatedRequests={estimatedRequests}
            onDismiss={handleBannerDismiss}
          />
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pt-[72px] lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
