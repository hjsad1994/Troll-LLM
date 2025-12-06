'use client'

import { useEffect, useState, useCallback } from 'react'
import { getUserProfile, getFullApiKey, rotateApiKey, getBillingInfo, getCreditsUsage, getModelsHealth, UserProfile, BillingInfo, CreditsUsage, ModelHealth } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'

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

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState('0')

  useEffect(() => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) {
      setDisplayed(value)
      return
    }

    let start = 0
    const duration = 1500
    const increment = num / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= num) {
        setDisplayed(value)
        clearInterval(timer)
      } else {
        setDisplayed(num < 100 ? start.toFixed(1) : Math.floor(start).toString())
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{displayed}{suffix}</span>
}

export default function UserDashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [creditsUsage, setCreditsUsage] = useState<CreditsUsage | null>(null)
  const [modelsHealth, setModelsHealth] = useState<ModelHealth[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [usagePeriod, setUsagePeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [showFullApiKey, setShowFullApiKey] = useState(false)
  const [fullApiKey, setFullApiKey] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [providerCopied, setProviderCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t.dashboard.greeting.morning
    if (hour < 18) return t.dashboard.greeting.afternoon
    return t.dashboard.greeting.evening
  }

  const loadUserData = useCallback(async () => {
    try {
      const [profile, billing, credits] = await Promise.all([
        getUserProfile().catch(() => null),
        getBillingInfo().catch(() => null),
        getCreditsUsage().catch(() => null),
      ])
      if (profile) setUserProfile(profile)
      if (billing) setBillingInfo(billing)
      if (credits) setCreditsUsage(credits)
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadModelsHealth = useCallback(async () => {
    try {
      setModelsLoading(true)
      const data = await getModelsHealth()
      setModelsHealth(data.models)
    } catch (err) {
      console.error('Failed to load models health:', err)
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserData()
    loadModelsHealth()
  }, [loadUserData, loadModelsHealth])

  // Auto-refresh models health every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadModelsHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadModelsHealth])

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
      <div className="relative max-w-5xl mx-auto space-y-8 sm:space-y-12">
        {/* Header - Compact */}
        <header className="flex items-center justify-between gap-4 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--theme-text)]">
              {user?.username || 'User'}
            </h1>
            {userProfile && (
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                userProfile.plan === 'enterprise'
                  ? 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20'
                  : userProfile.plan === 'pro-troll'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : userProfile.plan === 'pro'
                      ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20'
                      : userProfile.plan === 'dev'
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[var(--theme-text-muted)] border border-slate-200 dark:border-white/10'
              }`}>
                {userProfile.plan === 'pro-troll' ? 'Pro Troll' : userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)}
              </span>
            )}
          </div>
          <span className="text-[var(--theme-text-subtle)] text-sm hidden sm:block">{getTimeGreeting()}</span>
        </header>

        {/* Main Grid */}
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

                <p className="text-[var(--theme-text-subtle)] text-xs">
                  Created {new Date(userProfile.apiKeyCreatedAt).toLocaleDateString()}
                </p>

                {/* AI Provider Section */}
                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--theme-text)]">{t.dashboard.aiProvider.title}</span>
                    <span className="text-xs text-[var(--theme-text-subtle)] hidden sm:inline">({t.dashboard.aiProvider.subtitle})</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-2.5 sm:p-3">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono truncate">
                        https://chat.trollllm.xyz
                      </code>
                      <button
                        onClick={handleCopyProvider}
                        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-[var(--theme-text)] text-slate-700 dark:text-[var(--theme-bg)] border border-slate-300 dark:border-transparent text-xs font-medium hover:bg-slate-50 dark:hover:opacity-90 transition-colors"
                      >
                        {providerCopied ? t.dashboard.aiProvider.copied : t.dashboard.aiProvider.copy}
                      </button>
                    </div>
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
                  billingInfo.plan === 'enterprise' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400' :
                  billingInfo.plan === 'pro-troll' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400' :
                  billingInfo.plan === 'pro' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                  'bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-[var(--theme-text-muted)]'
                }`}>
                  {billingInfo.plan === 'pro-troll' ? 'Pro Troll' : billingInfo.plan.charAt(0).toUpperCase() + billingInfo.plan.slice(1)}
                </span>
              )}
            </div>

            {userProfile ? (
              <div className="space-y-4 sm:space-y-6">
                {/* Credits Display */}
                <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-4 mb-3 sm:mb-4">
                    <div>
                      <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.credits.available}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${(userProfile.credits || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.credits.refCredits}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">
                        ${(userProfile.refCredits || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 sm:pt-4 border-t border-slate-300 dark:border-white/10">
                    <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs">{t.dashboard.credits.used}</p>
                    <p className="text-slate-800 dark:text-[var(--theme-text)] font-medium">{formatLargeNumber((userProfile.totalInputTokens || 0) + (userProfile.totalOutputTokens || 0))}</p>
                  </div>
                </div>

                {/* Plan Expiration Warning */}
                {billingInfo?.isExpiringSoon && billingInfo.daysUntilExpiration !== null && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Plan expires in {billingInfo.daysUntilExpiration} day{billingInfo.daysUntilExpiration > 1 ? 's' : ''}</p>
                      <p className="text-[var(--theme-text-subtle)] text-xs">Contact admin to renew your plan</p>
                    </div>
                  </div>
                )}

                {/* Plan Period Section - for paid plans */}
                {userProfile.plan !== 'free' && (
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <svg className="w-4 h-4 text-slate-500 dark:text-[var(--theme-text-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700 dark:text-[var(--theme-text)]">{t.dashboard.planPeriod.title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)] mb-1">{t.dashboard.planPeriod.started}</p>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-[var(--theme-text)]">
                          {billingInfo?.planStartDate ? formatDateDMY(billingInfo.planStartDate) : t.dashboard.planPeriod.notSet}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)] mb-1">{t.dashboard.planPeriod.expires}</p>
                        <p className={`text-xs sm:text-sm font-medium ${
                          billingInfo?.isExpiringSoon
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-[var(--theme-text)]'
                        }`}>
                          {billingInfo?.planExpiresAt ? formatDateDMY(billingInfo.planExpiresAt) : t.dashboard.planPeriod.notSet}
                          {billingInfo?.daysUntilExpiration !== null && billingInfo?.daysUntilExpiration !== undefined && (
                            <span className={`ml-1 sm:ml-2 text-xs ${
                              billingInfo.isExpiringSoon
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-slate-500 dark:text-[var(--theme-text-subtle)]'
                            }`}>
                              ({billingInfo.daysUntilExpiration} {t.dashboard.planPeriod.days})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Models Health Status - Compact */}
        <div className="p-3 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-white">{t.dashboard.modelsHealth.title}</span>
              <span className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)]">
                (<span className="text-emerald-600 dark:text-emerald-400">{modelsHealth.filter(m => m.isHealthy).length}</span>/<span className="text-slate-600 dark:text-slate-400">{modelsHealth.length}</span>)
              </span>
            </div>
            <button
              onClick={loadModelsHealth}
              disabled={modelsLoading}
              className="px-2 py-1 text-xs text-slate-500 dark:text-[var(--theme-text-subtle)] hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              {modelsLoading ? '...' : '↻'}
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {modelsLoading && modelsHealth.length === 0 ? (
              <span className="text-xs text-slate-500 dark:text-[var(--theme-text-subtle)]">{t.dashboard.modelsHealth.loading}</span>
            ) : (
              modelsHealth.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs ${
                    model.isHealthy
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                  }`}
                  title={`${model.name} - ${model.isHealthy ? t.dashboard.modelsHealth.healthy : t.dashboard.modelsHealth.unhealthy}${model.latencyMs ? ` (${model.latencyMs}ms)` : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${model.isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  <span>{model.name}</span>
                  <span className={`text-[10px] font-medium ${model.isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({model.isHealthy ? t.dashboard.modelsHealth.healthy : t.dashboard.modelsHealth.unhealthy})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credits Usage Card */}
        <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.creditsUsage.title}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{t.dashboard.creditsUsage.subtitle}</p>
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

          <div className="p-4 sm:p-6 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-center">
            <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs sm:text-sm mb-2">
              {usagePeriod === '1h' ? t.dashboard.creditsUsage.last1h : usagePeriod === '24h' ? t.dashboard.creditsUsage.last24h : usagePeriod === '7d' ? t.dashboard.creditsUsage.last7d : t.dashboard.creditsUsage.last30d}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">
              ${(creditsUsage ? creditsUsage[`last${usagePeriod}`] : 0).toFixed(2)}
            </p>
          </div>
        </div>

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
    </div>
  )
}
