'use client'

import { useEffect, useState, useCallback } from 'react'
import { getReferralInfo, getReferralStats, getReferredUsers, ReferralInfo, ReferralStats, ReferredUser } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function ReferralPage() {
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [info, statsData, usersData] = await Promise.all([
        getReferralInfo(),
        getReferralStats(),
        getReferredUsers(),
      ])
      setReferralInfo(info)
      setStats(statsData)
      setReferredUsers(usersData.users)
    } catch (err) {
      console.error('Failed to load referral data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCopy = async () => {
    if (!referralInfo?.referralLink) return
    try {
      await navigator.clipboard.writeText(referralInfo.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[var(--theme-text)] rounded-full animate-spin" />
          <p className="text-[var(--theme-text-subtle)] text-sm">{t.dashboard.referral.loading}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="relative max-w-5xl mx-auto space-y-8 sm:space-y-12">
        {/* Header */}
        <header className="pt-6 md:pt-8 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[var(--theme-text-subtle)] text-sm">Referral Program</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-2">
            {t.dashboard.referral.title}
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-base sm:text-lg">
            {t.dashboard.referral.subtitle}
          </p>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Referral Link Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.referral.yourLink}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm truncate">{t.dashboard.referral.shareDescription}</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-3 sm:p-4">
                <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono break-all">
                  {referralInfo?.referralLink || '-'}
                </code>
              </div>

              <button
                onClick={handleCopy}
                className="w-full py-2.5 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium text-sm hover:bg-indigo-700 dark:hover:opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.dashboard.referral.copied}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t.dashboard.referral.copy}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-300">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">Statistics</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">Your referral performance</p>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.referral.totalReferrals}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[var(--theme-text)]">{stats?.totalReferrals || 0}</p>
                  <p className="text-xs text-[var(--theme-text-subtle)] mt-1">{t.dashboard.referral.usersRegistered}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.referral.successful}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.successfulReferrals || 0}</p>
                  <p className="text-xs text-[var(--theme-text-subtle)] mt-1">{t.dashboard.referral.usersPaid}</p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-300 dark:border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.referral.totalEarned}</p>
                  <p className="text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400">${stats?.totalRefCreditsEarned || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-[var(--theme-text-subtle)] text-xs uppercase tracking-wider mb-1">{t.dashboard.referral.currentBalance}</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">${stats?.currentRefCredits || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.referral.howItWorks}</h3>
              <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">Simple steps to earn rewards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">1</span>
                <span className="font-medium text-[var(--theme-text)] text-sm">{t.dashboard.referral.step1Title}</span>
              </div>
              <p className="text-xs text-[var(--theme-text-subtle)] pl-10">{t.dashboard.referral.step1Desc}</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm font-semibold text-violet-600 dark:text-violet-400">2</span>
                <span className="font-medium text-[var(--theme-text)] text-sm">{t.dashboard.referral.step2Title}</span>
              </div>
              <p className="text-xs text-[var(--theme-text-subtle)] pl-10">{t.dashboard.referral.step2Desc}</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-sm font-semibold text-pink-600 dark:text-pink-400">3</span>
                <span className="font-medium text-[var(--theme-text)] text-sm">{t.dashboard.referral.step3Title}</span>
              </div>
              <p className="text-xs text-[var(--theme-text-subtle)] pl-10">{t.dashboard.referral.step3Desc}</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">$</span>
                <span className="font-medium text-[var(--theme-text)] text-sm">{t.dashboard.referral.step4Title}</span>
              </div>
              <div className="pl-10 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">Dev: $25</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">Pro: $50</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">Pro Troll: $100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Referred Users Table */}
        <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none opacity-0 animate-fade-in-up animation-delay-500">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)]">{t.dashboard.referral.referredUsers}</h3>
                <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{referredUsers.length} {t.dashboard.referral.usersRegistered}</p>
              </div>
            </div>
          </div>

          {referredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[var(--theme-text)] font-medium mb-1">{t.dashboard.referral.noReferrals}</p>
              <p className="text-[var(--theme-text-subtle)] text-sm">{t.dashboard.referral.shareToEarn}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-subtle)] uppercase tracking-wider">{t.dashboard.referral.tableUser}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-subtle)] uppercase tracking-wider">{t.dashboard.referral.tableStatus}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-subtle)] uppercase tracking-wider">{t.dashboard.referral.tablePlan}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-subtle)] uppercase tracking-wider">{t.dashboard.referral.tableBonus}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-subtle)] uppercase tracking-wider">{t.dashboard.referral.tableDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {referredUsers.map((user, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm text-[var(--theme-text)]">{user.username}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                          user.status === 'paid'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[var(--theme-text-muted)]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'paid' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {user.status === 'paid' ? t.dashboard.referral.statusPaid : t.dashboard.referral.statusRegistered}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.plan ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            user.plan === 'pro-troll'
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                              : user.plan === 'pro'
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            {user.plan === 'pro-troll' ? 'PRO TROLL' : user.plan.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-[var(--theme-text-subtle)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.bonusEarned > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">+${user.bonusEarned}</span>
                        ) : (
                          <span className="text-[var(--theme-text-subtle)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--theme-text-subtle)]">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="pb-6 sm:pb-8" />
      </div>
    </div>
  )
}
