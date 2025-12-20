'use client'

import Link from 'next/link'
import { formatEstimatedRequests } from './CreditsStatusWidget'
import { useLanguage } from '@/components/LanguageProvider'

interface CriticalCreditsBannerProps {
  balance: number
  estimatedRequests: number | null
  onDismiss: () => void
}

export default function CriticalCreditsBanner({
  balance,
  estimatedRequests,
  onDismiss
}: CriticalCreditsBannerProps) {
  const { t } = useLanguage()

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Warning icon */}
          <span className="text-red-600 dark:text-red-400 text-lg" aria-hidden="true">
            ⚠️
          </span>

          {/* Message */}
          <p className="text-sm text-red-800 dark:text-red-200">
            <span className="font-medium">{t.criticalBanner?.creditsLow || 'Credits running low!'}</span>
            {' '}{t.criticalBanner?.balance || 'Balance'}: ${balance.toFixed(2)}
            {estimatedRequests !== null && (
              <span className="text-red-600 dark:text-red-400">
                {' '}• {formatEstimatedRequests(estimatedRequests)} {t.criticalBanner?.requestsRemaining || 'requests remaining'}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Top-up CTA */}
          <Link
            href="/checkout"
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            {t.criticalBanner?.topUpNow || 'Top-up Now'}
          </Link>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-red-950"
            aria-label={t.criticalBanner?.dismiss || 'Dismiss critical credits alert'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
