'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { getUserProfile, getFullApiKey, rotateApiKey, getBillingInfo, getDetailedUsage, getRequestLogs, getPaymentHistory, updateDiscordId, migrateCredits, UserProfile, BillingInfo, DetailedUsage, RequestLogItem, RequestLogsResponse, PaymentHistoryItem } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import DashboardPaymentModal from '@/components/DashboardPaymentModal'
import MigrationBanner from '@/components/MigrationBanner'
import { PAYMENTS_ENABLED } from '@/lib/payments'

function formatLargeNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatDateDMY(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}:${seconds}`
}

function formatDateTimeUTC7(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  // Convert to UTC+7 by adding 7 hours offset
  const utc7Date = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  const day = utc7Date.getUTCDate().toString().padStart(2, '0')
  const month = (utc7Date.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = utc7Date.getUTCFullYear()
  const hours = utc7Date.getUTCHours().toString().padStart(2, '0')
  const minutes = utc7Date.getUTCMinutes().toString().padStart(2, '0')
  const seconds = utc7Date.getUTCSeconds().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

function getModelShortName(model: string): string {
  if (model.includes('opus')) return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('gpt-3')) return 'GPT-3.5'
  return model.split('/').pop() || model
}

export default function UserDashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [detailedUsage, setDetailedUsage] = useState<DetailedUsage | null>(null)
  const [requestLogs, setRequestLogs] = useState<RequestLogsResponse | null>(null)
  const [usagePeriod, setUsagePeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFullApiKey, setShowFullApiKey] = useState(false)
  const [fullApiKey, setFullApiKey] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [providerCopied, setProviderCopied] = useState(false)
  const [priorityProviderCopied, setPriorityProviderCopied] = useState(false)
  const [premiumProviderCopied, setPremiumProviderCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [usageLoading, setUsageLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsFilter, setLogsFilter] = useState<'all' | 'main' | 'openhands'>('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [discordIdInput, setDiscordIdInput] = useState('')
  const [discordIdSaving, setDiscordIdSaving] = useState(false)
  const [discordIdSaved, setDiscordIdSaved] = useState(false)
  const [discordIdError, setDiscordIdError] = useState<string | null>(null)
  const [discordConfirm, setDiscordConfirm] = useState<{ show: boolean; type: 'remove' | 'change'; newId?: string }>({ show: false, type: 'remove' })
  const { user } = useAuth()
  const { t, language } = useLanguage()

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t.dashboard.greeting.morning
    if (hour < 18) return t.dashboard.greeting.afternoon
    return t.dashboard.greeting.evening
  }

  const loadUserData = useCallback(async () => {
    try {
      const [profile, billing, usage, logs, payments] = await Promise.all([
        getUserProfile().catch(() => null),
        getBillingInfo().catch(() => null),
        getDetailedUsage(usagePeriod).catch(() => null),
        getRequestLogs(usagePeriod, 1, 50).catch(() => null),
        getPaymentHistory().catch(() => ({ payments: [] })),
      ])
      if (profile) setUserProfile(profile)
      if (billing) setBillingInfo(billing)
      if (usage) setDetailedUsage(usage)
      if (logs) setRequestLogs(logs)
      if (payments) setPaymentHistory(payments.payments.slice(0, 5))
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setLoading(false)
    }
  }, [usagePeriod])

  const loadDetailedUsageAndLogs = useCallback(async (period: '1h' | '24h' | '7d' | '30d') => {
    setUsageLoading(true)
    setLogsLoading(true)
    setCurrentPage(1)
    try {
      const [usage, logs] = await Promise.all([
        getDetailedUsage(period),
        getRequestLogs(period, 1, 50),
      ])
      setDetailedUsage(usage)
      setRequestLogs(logs)
    } catch (err) {
      console.error('Failed to load detailed usage:', err)
    } finally {
      setUsageLoading(false)
      setLogsLoading(false)
    }
  }, [])

  const loadMoreLogs = useCallback(async (page: number) => {
    setLogsLoading(true)
    try {
      const logs = await getRequestLogs(usagePeriod, page, 50)
      setRequestLogs(logs)
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }, [usagePeriod])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Sync discordIdInput with userProfile.discordId
  useEffect(() => {
    if (userProfile?.discordId !== undefined) {
      setDiscordIdInput(userProfile.discordId || '')
    }
  }, [userProfile?.discordId])

  useEffect(() => {
    if (!loading) {
      loadDetailedUsageAndLogs(usagePeriod)
    }
  }, [usagePeriod, loading, loadDetailedUsageAndLogs])

  const handleShowApiKey = async () => {
    if (showFullApiKey) {
      setShowFullApiKey(false)
      return
    }
    try {
      const key = await getFullApiKey()
      setFullApiKey(key)
      setShowFullApiKey(true)
      setTimeout(() => setShowFullApiKey(false), 30000)
    } catch (err) {
      console.error('Failed to get API key:', err)
    }
  }

  const handleCopyApiKey = async () => {
    try {
      const key = fullApiKey || await getFullApiKey()
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyProvider = async () => {
    try {
      await navigator.clipboard.writeText('https://chat.trollllm.xyz')
      setProviderCopied(true)
      setTimeout(() => setProviderCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyPriorityProvider = async () => {
    try {
      await navigator.clipboard.writeText('https://priority-chat.trollllm.xyz')
      setPriorityProviderCopied(true)
      setTimeout(() => setPriorityProviderCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyPremiumProvider = async () => {
    try {
      await navigator.clipboard.writeText('https://chat2.trollllm.xyz')
      setPremiumProviderCopied(true)
      setTimeout(() => setPremiumProviderCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRotateApiKey = async () => {
    setRotating(true)
    try {
      const result = await rotateApiKey()
      setNewApiKey(result.newApiKey)
      setFullApiKey(result.newApiKey)
      setShowFullApiKey(true)
      setShowRotateConfirm(false)
      await loadUserData()
    } catch (err) {
      console.error('Failed to rotate API key:', err)
    } finally {
      setRotating(false)
    }
  }

  const handleSaveDiscordId = async () => {
    setDiscordIdError(null)
    setDiscordIdSaved(false)

    // Validate format if not empty
    const trimmedId = discordIdInput.trim()
    if (trimmedId && !/^\d{17,19}$/.test(trimmedId)) {
      setDiscordIdError('Invalid Discord ID format (17-19 digits required)')
      return
    }

    // Show confirmation dialog
    const currentDiscordId = userProfile?.discordId || null
    if (!trimmedId) {
      setDiscordConfirm({ show: true, type: 'remove' })
      return
    } else if (currentDiscordId && trimmedId !== currentDiscordId) {
      setDiscordConfirm({ show: true, type: 'change', newId: trimmedId })
      return
    }

    // No confirmation needed for first-time setting
    await executeDiscordSave(trimmedId)
  }

  const executeDiscordSave = async (idToSave: string | null) => {
    setDiscordIdSaving(true)
    try {
      await updateDiscordId(idToSave)
      setDiscordIdSaved(true)
      setTimeout(() => setDiscordIdSaved(false), 2000)
    } catch (err: any) {
      console.error('Failed to save Discord ID:', err)
      setDiscordIdError(err.message || 'Failed to save Discord ID')
    } finally {
      setDiscordIdSaving(false)
    }
  }

  const handleDiscordConfirm = async () => {
    setDiscordConfirm({ show: false, type: 'remove' })
    const trimmedId = discordIdInput.trim()
    await executeDiscordSave(trimmedId || null)
  }

  const handleMigration = async () => {
    try {
      const result = await migrateCredits()
      // Reload user data after successful migration
      await loadUserData()
      // Show success message
      alert(result.message || 'Migration successful!')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[var(--theme-text)] rounded-full animate-spin" />
          <p className="text-[var(--theme-text-subtle)] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="relative max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* Migration Banner - Show only for non-migrated users */}
        {userProfile && !userProfile.migration && (
          <MigrationBanner
            currentCredits={userProfile.credits || 0}
            onMigrate={handleMigration}
          />
        )}

        {/* Header - Compact */}
        <header className="flex items-center justify-between gap-4 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--theme-text)]">
              {user?.username || 'User'}
            </h1>
            {userProfile && (
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                (userProfile.credits || 0) > 0
                  ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[var(--theme-text-muted)] border border-slate-200 dark:border-white/10'
              }`}>
                {(userProfile.credits || 0) > 0 ? 'Active' : 'Free'}
              </span>
            )}
          </div>
          <span className="text-[var(--theme-text-subtle)] text-sm hidden sm:block">{getTimeGreeting()}</span>
        </header>

        {/* Main Grid - API Key & Credits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* API Key Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.apiKey.title}</h3>
                  <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm truncate">{t.dashboard.apiKey.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
                <span className="text-emerald-400 text-xs">{t.dashboard.apiKey.active}</span>
              </div>
            </div>

            {userProfile ? (
              <div className="space-y-3 sm:space-y-4">
                {/* API Key Display */}
                <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono break-all min-w-0">
                      {showFullApiKey && fullApiKey ? fullApiKey : userProfile.apiKey}
                    </code>
                    <button
                      onClick={handleShowApiKey}
                      className="shrink-0 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-[var(--theme-text-subtle)] hover:text-slate-700 dark:hover:text-[var(--theme-text)] transition-colors"
                    >
                      {showFullApiKey ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {newApiKey && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-emerald-400 text-sm font-medium">{t.dashboard.apiKey.newKeyGenerated}</p>
                      <p className="text-[var(--theme-text-subtle)] text-xs">{t.dashboard.apiKey.newKeyCopy}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleCopyApiKey}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium text-sm hover:bg-indigo-700 dark:hover:opacity-90 transition-colors"
                  >
                    {copied ? t.dashboard.apiKey.copied : t.dashboard.apiKey.copyKey}
                  </button>
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="py-2.5 px-4 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {t.dashboard.apiKey.rotate}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[var(--theme-text-subtle)] text-xs">
                    Created {new Date(userProfile.apiKeyCreatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-violet-400 text-xs font-medium">{t.dashboard.rateLimit?.value || '600 RPM'}</span>
                  </div>
                </div>

                {/* AI Provider Section */}
                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--theme-text)]">{t.dashboard.aiProvider.title}</span>
                    <span className="text-xs text-[var(--theme-text-subtle)] hidden sm:inline">({t.dashboard.aiProvider.subtitle})</span>
                  </div>
                  <div className="space-y-2">
                    {/* Standard Endpoint - 1500 VND/$1 */}
                    <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 rounded-lg border border-amber-500/20 p-2.5 sm:p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {t.dashboard.aiProvider.standardEndpoint}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          {t.dashboard.aiProvider.standardRate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono truncate">
                          https://chat.trollllm.xyz
                        </code>
                        <button
                          onClick={handleCopyProvider}
                          className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 text-white border border-amber-500 text-xs font-medium hover:bg-amber-600 transition-colors"
                        >
                          {providerCopied ? t.dashboard.aiProvider.copied : t.dashboard.aiProvider.copy}
                        </button>
                      </div>
                      <p className="text-[var(--theme-text-subtle)] text-xs mt-2">
                        {t.dashboard.aiProvider.standardNote}
                      </p>
                    </div>
                    {/* Old Credits Endpoint - 2500 VND/$1 */}
                    <div className="bg-slate-50 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-2.5 sm:p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.dashboard.aiProvider.premiumEndpoint}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-500/20">
                          {t.dashboard.aiProvider.premiumRate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono truncate">
                          https://chat2.trollllm.xyz
                        </code>
                        <button
                          onClick={handleCopyPremiumProvider}
                          className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-[var(--theme-text)] text-slate-700 dark:text-[var(--theme-bg)] border border-slate-300 dark:border-transparent text-xs font-medium hover:bg-slate-50 dark:hover:opacity-90 transition-colors"
                        >
                          {premiumProviderCopied ? t.dashboard.aiProvider.copied : t.dashboard.aiProvider.copy}
                        </button>
                      </div>
                      <p className="text-[var(--theme-text-subtle)] text-xs mt-2">
                        {t.dashboard.aiProvider.premiumNote}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Discord Integration Section */}
                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <svg className="w-4 h-4 text-[#5865F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-sm font-medium text-[var(--theme-text)]">{t.dashboard.discordIntegration.title}</span>
                    <span className="text-xs text-[var(--theme-text-subtle)] hidden sm:inline">({t.dashboard.discordIntegration.subtitle})</span>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-2.5 sm:p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={discordIdInput}
                          onChange={(e) => {
                            setDiscordIdInput(e.target.value)
                            setDiscordIdError(null)
                          }}
                          placeholder={t.dashboard.discordIntegration.placeholder}
                          className="flex-1 bg-transparent text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none min-w-0"
                        />
                        <button
                          onClick={handleSaveDiscordId}
                          disabled={discordIdSaving}
                          className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            discordIdSaved
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white dark:bg-white/10 text-slate-700 dark:text-white border border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {discordIdSaving ? (
                            <div className="w-4 h-4 border-2 border-slate-300 dark:border-white/30 border-t-slate-600 dark:border-t-white rounded-full animate-spin" />
                          ) : discordIdSaved ? (
                            t.dashboard.discordIntegration.saved
                          ) : (
                            t.dashboard.discordIntegration.save
                          )}
                        </button>
                      </div>
                    </div>
                    {discordIdError && (
                      <p className="text-red-500 text-xs">{discordIdError}</p>
                    )}
                    <p className="text-[var(--theme-text-subtle)] text-xs">
                      {t.dashboard.discordIntegration.note}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-14 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-lg flex-1 animate-pulse" />
                  <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-lg w-24 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Credits Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.credits.title}</h3>
                  <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{t.dashboard.credits.subtitle}</p>
                </div>
              </div>
              {billingInfo && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                  (billingInfo.credits || 0) > 0 || (billingInfo.creditsNew || 0) > 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-[var(--theme-text-muted)]'
                }`}>
                  {(billingInfo.credits || 0) > 0 || (billingInfo.creditsNew || 0) > 0 ? 'Active' : 'Free'}
                </span>
              )}
            </div>

            {userProfile ? (
              <div className="space-y-4 sm:space-y-6">
                {/* Dual Credits Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* New Credits (creditsNew) - Purple */}
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-lg border border-violet-200 dark:border-violet-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
                        {t.dashboard.credits.standardCredits}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 mb-1">
                      ${(userProfile.creditsNew || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                      {t.dashboard.credits.standardRate}
                    </p>
                  </div>

                  {/* Old Credits (credits) - Gray */}
                  <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 rounded-lg border border-slate-200 dark:border-slate-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                        {t.dashboard.credits.premiumCredits}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ${(userProfile.credits || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {t.dashboard.credits.premiumRate}
                    </p>
                  </div>
                </div>

                {/* Tokens Used Analytics */}
                <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-3 sm:p-4">
                  <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs mb-1">Total Tokens Used (Analytics)</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-[var(--theme-text)]">
                    {formatLargeNumber((userProfile.totalInputTokens || 0) + (userProfile.totalOutputTokens || 0))}
                  </p>
                </div>

                {/* Credits Expiration Warning for creditsNew (OpenHands) */}
                {billingInfo?.isExpiringSoonNew && billingInfo.daysUntilExpirationNew !== null && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <svg className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-violet-400 text-sm font-medium">Standard credits expire in {billingInfo.daysUntilExpirationNew} day{billingInfo.daysUntilExpirationNew > 1 ? 's' : ''}</p>
                      <p className="text-[var(--theme-text-subtle)] text-xs">Purchase more credits to continue</p>
                    </div>
                  </div>
                )}

                {/* Credits Expiration Warning for credits (OhMyGPT) */}
                {billingInfo?.isExpiringSoon && billingInfo.daysUntilExpiration !== null && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Credits expire in {billingInfo.daysUntilExpiration} day{billingInfo.daysUntilExpiration > 1 ? 's' : ''}</p>
                      <p className="text-[var(--theme-text-subtle)] text-xs">Purchase more credits to continue</p>
                    </div>
                  </div>
                )}

                {/* Credits Period Section for creditsNew (OpenHands/Standard) */}
                {(billingInfo?.creditsNew || 0) > 0 && (
                  <div className="p-3 sm:p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-500/20">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">{t.dashboard.creditsValidity.standardTitle}</span>
                      </div>
                      {/* Expires Countdown for creditsNew */}
                      {billingInfo?.expiresAtNew && billingInfo?.daysUntilExpirationNew !== null && billingInfo?.daysUntilExpirationNew !== undefined ? (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          billingInfo.daysUntilExpirationNew <= 0
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : billingInfo.daysUntilExpirationNew <= 3
                              ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                        }`}>
                          {billingInfo.daysUntilExpirationNew <= 0
                            ? t.dashboard.creditsValidity.expired
                            : t.dashboard.creditsValidity.daysFormat.replace('{days}', String(billingInfo.daysUntilExpirationNew))
                          }
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                          {t.dashboard.creditsValidity.noExpiry}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">{t.dashboard.creditsValidity.purchased}</p>
                        <p className="text-xs sm:text-sm font-medium text-violet-700 dark:text-violet-300">
                          {billingInfo?.purchasedAtNew ? formatDateDMY(billingInfo.purchasedAtNew) : t.dashboard.creditsValidity.na}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">{t.dashboard.creditsValidity.expires}</p>
                        <p className={`text-xs sm:text-sm font-medium ${
                          billingInfo?.isExpiringSoonNew
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-violet-700 dark:text-violet-300'
                        }`}>
                          {billingInfo?.expiresAtNew ? formatDateTimeUTC7(billingInfo.expiresAtNew) : t.dashboard.creditsValidity.na}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Credits Period Section for credits (OhMyGPT/Premium) */}
                {billingInfo?.expiresAt && (
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500 dark:text-[var(--theme-text-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700 dark:text-[var(--theme-text)]">{t.dashboard.creditsValidity.premiumTitle}</span>
                      </div>
                      {/* Expires Countdown X/Y format */}
                      {billingInfo?.daysUntilExpiration !== null && billingInfo?.daysUntilExpiration !== undefined && (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          billingInfo.daysUntilExpiration <= 0
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : billingInfo.daysUntilExpiration <= 3
                              ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          {billingInfo.daysUntilExpiration <= 0
                            ? t.dashboard.creditsValidity.expired
                            : `${billingInfo.daysUntilExpiration}/${billingInfo.subscriptionDays || 7}`
                          }
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)] mb-1">{t.dashboard.creditsValidity.purchased}</p>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-[var(--theme-text)]">
                          {billingInfo?.purchasedAt ? formatDateDMY(billingInfo.purchasedAt) : t.dashboard.creditsValidity.na}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)] mb-1">{t.dashboard.creditsValidity.expires}</p>
                        <p className={`text-xs sm:text-sm font-medium ${
                          billingInfo?.isExpiringSoon
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-[var(--theme-text)]'
                        }`}>
                          {billingInfo?.expiresAt ? formatDateTimeUTC7(billingInfo.expiresAt) : t.dashboard.creditsValidity.na}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buy Credits Button */}
                {PAYMENTS_ENABLED ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium text-sm hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t.dashboardPayment?.buyCredits || 'Buy Credits'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium text-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {language === 'vi' ? 'Thanh toán tạm thời bảo trì' : 'Payments temporarily disabled'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                {/* Buy Credits Button - always visible */}
                {PAYMENTS_ENABLED ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium text-sm hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t.dashboardPayment?.buyCredits || 'Buy Credits'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium text-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {language === 'vi' ? 'Thanh toán tạm thời bảo trì' : 'Payments temporarily disabled'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Usage Card */}
        <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboardTest?.detailedUsage?.title || 'Detailed Usage'}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{t.dashboardTest?.detailedUsage?.subtitle || 'Token breakdown by period'}</p>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 self-start sm:self-auto overflow-x-auto">
              {(['1h', '24h', '7d', '30d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setUsagePeriod(period)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    usagePeriod === period
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {usageLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse mb-2" />
                  <div className="h-6 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.inputTokens || 'Input Tokens'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatLargeNumber(detailedUsage?.inputTokens)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.outputTokens || 'Output Tokens'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatLargeNumber(detailedUsage?.outputTokens)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.cacheWrite || 'Cache Write'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatLargeNumber(detailedUsage?.cacheWriteTokens)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.cacheHit || 'Cache Hit'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400">
                  {formatLargeNumber(detailedUsage?.cacheHitTokens)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.creditsBurned || 'Credits Burned'} ({usagePeriod})
                </p>
                <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                  ${(detailedUsage?.creditsBurned || 0).toFixed(4)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.totalCreditsUsed || 'Total Used'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                  ${(userProfile?.creditsUsed || 0).toFixed(4)}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">
                  {t.dashboardTest?.detailedUsage?.requests || 'Requests'}
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300">
                  {formatLargeNumber(detailedUsage?.requestCount)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Request Logs Table - Temporarily hidden */}
        {/* <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboardTest?.requestLogs?.title || 'Request Logs'}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">
                  {requestLogs ? `${requestLogs.total} requests` : 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setLogsFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  logsFilter === 'all'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLogsFilter('main')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  logsFilter === 'main'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Standard
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Time</th>
                  <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Model</th>
                  <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Upstream</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Input</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Output</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Cache Write</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Cache Hit</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Cost</th>
                  <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {logsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-3 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : !requestLogs?.requests || requestLogs.requests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                      No requests found in this period
                    </td>
                  </tr>
                ) : (
                  requestLogs.requests
                    .filter(log => {
                      if (logsFilter === 'all') return true;
                      if (logsFilter === 'openhands') return log.upstream === 'openhands';
                      return log.upstream !== 'openhands';
                    })
                    .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                          {getModelShortName(log.model)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {log.upstream === 'openhands' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Priority
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-blue-600 dark:text-blue-400">
                        {formatLargeNumber(log.inputTokens)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-purple-600 dark:text-purple-400">
                        {formatLargeNumber(log.outputTokens)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-cyan-600 dark:text-cyan-400">
                        {formatLargeNumber(log.cacheWriteTokens)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-teal-600 dark:text-teal-400">
                        {formatLargeNumber(log.cacheHitTokens)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-orange-600 dark:text-orange-400">
                        ${log.creditsCost.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-slate-600 dark:text-slate-400">
                        {log.latencyMs > 0 ? `${(log.latencyMs / 1000).toFixed(1)}s` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {requestLogs && requestLogs.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} of {requestLogs.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadMoreLogs(currentPage - 1)}
                  disabled={currentPage === 1 || logsLoading}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadMoreLogs(currentPage + 1)}
                  disabled={currentPage === requestLogs.totalPages || logsLoading}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div> */}
      </div>

      {/* Rotate API Key Modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[var(--theme-card)] p-4 sm:p-6 shadow-xl dark:shadow-none">
            <div className="flex items-start sm:items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.rotateModal.title}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{t.dashboard.rotateModal.warning}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 sm:mb-6">
              {[
                'Current key will be invalidated immediately',
                'All applications using this key will stop working',
                'You\'ll need to update the key everywhere'
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors order-2 sm:order-1"
              >
                {t.dashboard.rotateModal.cancel}
              </button>
              <button
                onClick={handleRotateApiKey}
                disabled={rotating}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {rotating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t.dashboard.rotateModal.rotating}
                  </>
                ) : (
                  t.dashboard.rotateModal.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <DashboardPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          loadUserData()
        }}
      />

      {/* Discord Confirm Modal */}
      {discordConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDiscordConfirm({ show: false, type: 'remove' })}
          />
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  discordConfirm.type === 'remove'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {discordConfirm.type === 'remove' ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--theme-text)]">
                    {discordConfirm.type === 'remove'
                      ? (t.dashboard.discordIntegration.confirmRemoveTitle || 'Xóa Discord ID?')
                      : (t.dashboard.discordIntegration.confirmChangeTitle || 'Đổi Discord ID?')
                    }
                  </h3>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-[var(--theme-text-subtle)] text-sm leading-relaxed">
                {discordConfirm.type === 'remove'
                  ? (t.dashboard.discordIntegration.confirmRemove)
                  : (t.dashboard.discordIntegration.confirmChange)
                }
              </p>
              {discordConfirm.type === 'change' && discordConfirm.newId && (
                <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <p className="text-xs text-[var(--theme-text-subtle)] mb-1">{t.dashboard.discordIntegration.newIdLabel || 'Discord ID mới:'}</p>
                  <p className="font-mono text-sm text-[var(--theme-text)]">{discordConfirm.newId}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setDiscordConfirm({ show: false, type: 'remove' })}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {t.dashboard.rotateModal.cancel || 'Hủy'}
              </button>
              <button
                onClick={handleDiscordConfirm}
                disabled={discordIdSaving}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  discordConfirm.type === 'remove'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-[#5865F2] text-white hover:bg-[#4752C4]'
                }`}
              >
                {discordIdSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  discordConfirm.type === 'remove'
                    ? (t.dashboard.discordIntegration.removeConfirmBtn || 'Xóa')
                    : (t.dashboard.discordIntegration.changeConfirmBtn || 'Đổi')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
