'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUserProfile, getDetailedUsage } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

export type CreditsStatusType = 'ok' | 'low' | 'critical'

interface CreditsStatus {
  balance: number
  status: CreditsStatusType
  color: string
  bgColor: string
  borderColor: string
  label: string
}

// Format large numbers with K/M suffix for compact display
function formatEstimatedRequests(num: number): string {
  if (num >= 1000000) return `~${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `~${(num / 1000).toFixed(1)}K`
  return `~${Math.round(num)}`
}

function getCreditsStatus(balance: number): CreditsStatus {
  if (balance > 5) {
    return {
      balance,
      status: 'ok',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      label: 'OK'
    }
  }
  if (balance >= 2) {
    return {
      balance,
      status: 'low',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      label: 'Low'
    }
  }
  return {
    balance,
    status: 'critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Critical'
  }
}

interface CreditsStatusWidgetProps {
  balance?: number
  estimatedRequests?: number | null
  avgCostPerRequest?: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export default function CreditsStatusWidget({
  balance: propBalance,
  estimatedRequests: propEstimatedRequests,
  avgCostPerRequest: propAvgCost,
  showLabel = true,
  size = 'md',
  onClick
}: CreditsStatusWidgetProps) {
  const { t } = useLanguage()
  const [balance, setBalance] = useState<number | null>(propBalance ?? null)
  const [estimatedRequests, setEstimatedRequests] = useState<number | null>(propEstimatedRequests ?? null)
  const [avgCostPerRequest, setAvgCostPerRequest] = useState<number | null>(propAvgCost ?? null)
  const [loading, setLoading] = useState(propBalance === undefined)
  const [error, setError] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (propBalance !== undefined) {
      setBalance(propBalance)
      setLoading(false)
      // Use prop values if provided
      if (propEstimatedRequests !== undefined) {
        setEstimatedRequests(propEstimatedRequests)
      }
      if (propAvgCost !== undefined) {
        setAvgCostPerRequest(propAvgCost)
      }
      return
    }

    const fetchData = async () => {
      try {
        setError(false) // Reset error before retry attempt
        // Fetch balance and usage data in parallel
        const [profile, usageData] = await Promise.all([
          getUserProfile(),
          getDetailedUsage('7d').catch(() => null) // Gracefully handle usage fetch failure
        ])

        const totalCredits = (profile.credits || 0) + (profile.refCredits || 0)
        setBalance(totalCredits)

        // Calculate estimated requests from 7-day usage data
        if (usageData && usageData.requestCount > 0 && usageData.creditsBurned > 0) {
          const avgCost = usageData.creditsBurned / usageData.requestCount
          setAvgCostPerRequest(avgCost)
          const estimated = totalCredits / avgCost
          setEstimatedRequests(Math.floor(estimated))
        } else {
          // No usage history - leave as null (will be handled in display)
          setEstimatedRequests(null)
          setAvgCostPerRequest(null)
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error)
        setError(true) // Set error flag instead of fake balance
        // Keep previous balance if available, don't reset to 0
        if (balance === null) {
          // Only reset estimates if no previous data
          setEstimatedRequests(null)
          setAvgCostPerRequest(null)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [propBalance, propEstimatedRequests, propAvgCost])

  // Size classes need to be defined before loading check to use in loading/error states
  const sizeClasses = {
    sm: {
      dot: 'w-2.5 h-2.5',
      text: 'text-xs',
      padding: 'px-2 py-1',
      gap: 'gap-1.5'
    },
    md: {
      dot: 'w-3 h-3',
      text: 'text-sm',
      padding: 'px-2.5 py-1.5',
      gap: 'gap-2'
    },
    lg: {
      dot: 'w-4 h-4',
      text: 'text-base',
      padding: 'px-3 py-2',
      gap: 'gap-2.5'
    }
  }

  const sizes = sizeClasses[size]

  // Get translated status label
  const getStatusLabel = (statusType: CreditsStatusType) => {
    switch (statusType) {
      case 'ok': return t.creditsStatus.statusOk
      case 'low': return t.creditsStatus.statusLow
      case 'critical': return t.creditsStatus.statusCritical
    }
  }

  // Loading state - with proper accessibility and responsive sizing
  if (loading) {
    return (
      <div
        className={`flex items-center ${sizes.gap} ${sizes.padding} rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700`}
        role="status"
        aria-live="polite"
        aria-label={t.creditsStatus.loadingAria}
      >
        <div className={`${sizes.dot} rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse`} />
        {showLabel && (
          <span className={`${sizes.text} text-slate-400 animate-pulse`}>
            {t.creditsStatus.loading}
          </span>
        )}
      </div>
    )
  }

  // Error state - with proper accessibility and muted styling
  if (error && !loading) {
    return (
      <div
        className={`flex items-center ${sizes.gap} ${sizes.padding} rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600`}
        role="alert"
        aria-live="polite"
        aria-label={t.creditsStatus.unableToLoadAria}
      >
        <div className={`${sizes.dot} rounded-full bg-slate-400 dark:bg-slate-500`} />
        {showLabel && (
          <span className={`${sizes.text} text-slate-500 dark:text-slate-400`}>
            {t.creditsStatus.unableToLoad}
          </span>
        )}
      </div>
    )
  }

  const status = getCreditsStatus(balance ?? 0)
  const translatedStatusLabel = getStatusLabel(status.status)

  const StatusIndicator = () => (
    <div
      className={`relative ${sizes.dot} rounded-full`}
      aria-hidden="true"
    >
      <div className={`absolute inset-0 rounded-full transition-colors duration-150 ${
        status.status === 'ok' ? 'bg-emerald-500' :
        status.status === 'low' ? 'bg-amber-500' :
        'bg-red-500'
      }`} />
      {status.status === 'critical' && (
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
      )}
    </div>
  )

  // Build aria-label with estimated requests if available
  const ariaLabel = estimatedRequests !== null
    ? `${t.creditsStatus.status}: ${translatedStatusLabel}. ${t.creditsStatus.creditsBalance}: $${balance?.toFixed(2)}. ~${estimatedRequests} ${t.creditsStatus.requestsRemaining}.`
    : `${t.creditsStatus.status}: ${translatedStatusLabel}. ${t.creditsStatus.creditsBalance}: $${balance?.toFixed(2)}`

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`flex items-center ${sizes.gap} ${sizes.padding} rounded-lg ${status.bgColor} border ${status.borderColor} cursor-pointer hover:opacity-80 transition-opacity relative`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <StatusIndicator />
      {showLabel && (
        <>
          <span className={`${sizes.text} font-medium ${status.color}`}>
            ${balance?.toFixed(2)}
          </span>
          {/* Estimated requests - hidden on mobile */}
          {estimatedRequests !== null && (
            <span className={`${sizes.text} ${status.color} opacity-70 hidden md:inline`}>
              {formatEstimatedRequests(estimatedRequests)} req
            </span>
          )}
          <span className={`${sizes.text} ${status.color} opacity-70 hidden sm:inline md:hidden`}>
            {translatedStatusLabel}
          </span>
        </>
      )}

      {/* Enhanced Tooltip with estimated requests */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{t.creditsStatus.creditsBalance}</span>
            <span className="text-slate-300">${balance?.toFixed(4)}</span>
            <span className={`${
              status.status === 'ok' ? 'text-emerald-400' :
              status.status === 'low' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {t.creditsStatus.status}: {translatedStatusLabel}
            </span>
            {/* Estimated requests in tooltip */}
            {estimatedRequests !== null && (
              <>
                <div className="border-t border-slate-700 my-1" />
                <span className="text-slate-300">
                  {formatEstimatedRequests(estimatedRequests)} {t.creditsStatus.requestsRemaining}
                </span>
                {avgCostPerRequest !== null && (
                  <span className="text-slate-400 text-[10px]">
                    {t.creditsStatus.avgPerReq}: ${avgCostPerRequest.toFixed(4)}/req
                  </span>
                )}
                <span className="text-slate-500 text-[10px]">
                  {t.creditsStatus.basedOnLast7Days}
                </span>
              </>
            )}
            {estimatedRequests === null && (
              <>
                <div className="border-t border-slate-700 my-1" />
                <span className="text-slate-400 text-[10px]">
                  {t.creditsStatus.noUsageHistory}
                </span>
              </>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>
      )}
    </div>
  )

  if (onClick) {
    return content
  }

  return (
    <Link href="/checkout">
      {content}
    </Link>
  )
}

// Export status helper for use in other components
export { getCreditsStatus, formatEstimatedRequests }
