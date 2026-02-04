'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, getModelStats, ModelStats } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'

interface Stats {
  totalKeys: number
  totalFactoryKeys: number
  totalProxies: number
  healthStatus: string
  healthyCount: number
  totalCount: number
}

interface Metrics {
  totalRequests: number
  tokensUsed: number
  avgLatencyMs: number
  successRate: number
  inputTokens?: number
  outputTokens?: number
  requestsToday?: number
  requestsThisWeek?: number
}

interface UserStats {
  total_users: number
  active_users: number
  total_credits_used: number
  total_credits: number
  total_ref_credits: number
  total_creditsNew: number
  total_creditsNewUsed: number
  total_input_tokens: number
  total_output_tokens: number
}

interface UserKey {
  _id?: string
  id?: string
  name: string
  tokensUsed: number
  isActive: boolean
}

interface FactoryKey {
  _id?: string
  id?: string
  apiKey?: string
  status: string
  tokensUsed: number
  requestsCount: number
  provider?: string
}

interface OpenHandsKey {
  _id: string
  status: string
  tokensUsed: number
  requestsCount: number
  totalSpend?: number
}

interface OpenHandsBackupStats {
  total: number
  available: number
  used: number
}

interface Proxy {
  _id: string
  name: string
  type: string
  host: string
  port: number
  status: string
  lastLatencyMs?: number
}

interface RecentLog {
  _id: string
  timestamp: string
  model: string
  latencyMs: number
  success: boolean
  tokensUsed?: number
}

function formatLargeNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatUSD(num: number | undefined | null): string {
  if (num == null) return '$0.00'
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(2) + 'K'
  return '$' + num.toFixed(2)
}

function formatCredits(num: number | undefined | null): string {
  if (num == null) return '$0'
  // Format with dot as thousand separator (European style)
  // Example: 1110 -> $1.110, 25000 -> $25.000
  const formatted = Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return '$' + formatted
}

function getHealthColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-400'
    case 'degraded': return 'text-amber-400'
    case 'down': return 'text-red-400'
    default: return 'text-neutral-400'
  }
}

function getLatencyColor(ms: number): string {
  if (ms < 1000) return 'text-emerald-400'
  if (ms < 3000) return 'text-amber-400'
  return 'text-red-400'
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Healthy' },
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Active' },
    rate_limited: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Rate Limited' },
    exhausted: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Exhausted' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Error' },
    unhealthy: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Unhealthy' },
    unknown: { bg: 'bg-white/5', text: 'text-neutral-400', label: 'Unknown' },
  }
  const config = statusConfig[status] || statusConfig.unknown
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-current/20`}>
      {config.label}
    </span>
  )
}

function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '****'
  return key.slice(0, 8) + '...' + key.slice(-4)
}

function formatOpenhandsCredits(totalSpend: number | undefined): { remain: string; total: string; percentage: number } {
  const TOTAL = 10 // $10 per key
  const spent = totalSpend || 0
  const remain = Math.max(0, TOTAL - spent)
  return {
    remain: `$${remain.toFixed(2)}`,
    total: `$${TOTAL.toFixed(2)}`,
    percentage: (spent / TOTAL) * 100
  }
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [stats, setStats] = useState<Stats>({
    totalKeys: 0,
    totalFactoryKeys: 0,
    totalProxies: 0,
    healthStatus: 'unknown',
    healthyCount: 0,
    totalCount: 0,
  })
  const [metrics, setMetrics] = useState<Metrics>({
    totalRequests: 0,
    tokensUsed: 0,
    avgLatencyMs: 0,
    successRate: 0,
  })
const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [factoryKeys, setFactoryKeys] = useState<FactoryKey[]>([])
  const [openhandsKeys, setOpenhandsKeys] = useState<OpenHandsKey[]>([])
  const [openhandsBackupStats, setOpenhandsBackupStats] = useState<OpenHandsBackupStats>({ total: 0, available: 0, used: 0 })
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [userStats, setUserStats] = useState<UserStats>({ total_users: 0, active_users: 0, total_credits_used: 0, total_credits: 0, total_ref_credits: 0, total_creditsNew: 0, total_creditsNewUsed: 0, total_input_tokens: 0, total_output_tokens: 0 })
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [metricsPeriod, setMetricsPeriod] = useState<'1h' | '2h' | '3h' | '4h' | '8h' | '24h' | '3d' | '7d' | '30d' | 'all'>('8h')

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

const loadDashboard = useCallback(async (period: string = metricsPeriod) => {
    try {
      const [keysResp, factoryResp, proxiesResp, statusResp, metricsResp, userStatsResp, modelStatsResp, openhandsResp, backupKeysResp] = await Promise.all([
        fetchWithAuth('/admin/keys').catch(() => null),
        fetchWithAuth('/admin/troll-keys').catch(() => null),
        fetchWithAuth('/admin/proxies').catch(() => null),
        fetch('/api/status').catch(() => null),
        fetchWithAuth(`/admin/metrics?period=${period}`).catch(() => null),
        fetchWithAuth(`/admin/user-stats?period=${period}`).catch(() => null),
        getModelStats(period).catch(() => ({ models: [] })),
        fetchWithAuth('/admin/openhands/keys').catch(() => null),
        fetchWithAuth('/admin/openhands/backup-keys').catch(() => null),
      ])

      const keysData = keysResp?.ok ? await keysResp.json() : { total: 0, keys: [] }
      const factoryData = factoryResp?.ok ? await factoryResp.json() : { total: 0, keys: [] }
      const proxiesData = proxiesResp?.ok ? await proxiesResp.json() : { total: 0, proxies: [] }
      const statusData = statusResp?.ok ? await statusResp.json() : { status: 'unknown', summary: { healthy: 0, total: 0 } }
      const metricsData = metricsResp?.ok ? await metricsResp.json() : {}
      const userStatsData = userStatsResp?.ok ? await userStatsResp.json() : { total_users: 0, active_users: 0, total_credits_used: 0, total_credits: 0, total_ref_credits: 0, total_input_tokens: 0, total_output_tokens: 0 }
      const openhandsData = openhandsResp?.ok ? await openhandsResp.json() : { keys: [] }
      const backupKeysData = backupKeysResp?.ok ? await backupKeysResp.json() : { total: 0, available: 0, used: 0 }

      setStats({
        totalKeys: keysData.total || 0,
        totalFactoryKeys: factoryData.total || 0,
        totalProxies: proxiesData.total || 0,
        healthStatus: statusData.status || 'unknown',
        healthyCount: statusData.summary?.healthy || 0,
        totalCount: statusData.summary?.total || 0,
      })

      setMetrics({
        totalRequests: metricsData.total_requests || 0,
        tokensUsed: metricsData.tokens_used || 0,
        avgLatencyMs: metricsData.avg_latency_ms || 0,
        successRate: metricsData.success_rate || 0,
        inputTokens: metricsData.input_tokens || 0,
        outputTokens: metricsData.output_tokens || 0,
        requestsToday: metricsData.requests_today || 0,
        requestsThisWeek: metricsData.requests_this_week || 0,
      })

setUserStats(userStatsData)
      setModelStats(modelStatsResp.models || [])
      setOpenhandsKeys(openhandsData.keys || [])
      setOpenhandsBackupStats({
        total: backupKeysData.total || 0,
        available: backupKeysData.available || 0,
        used: backupKeysData.used || 0,
      })

      // Set detailed data for tables
      setUserKeys((keysData.keys || []).slice(0, 5))
      setFactoryKeys((factoryData.keys || []).slice(0, 5))
      setProxies((proxiesData.proxies || []).slice(0, 5))
      setRecentLogs(metricsData.recent_logs || [])

      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [metricsPeriod])

  // Reload when period changes
  useEffect(() => {
    if (isAdmin) {
      loadDashboard(metricsPeriod)
    }
  }, [metricsPeriod, isAdmin])

  useEffect(() => {
    if (isAdmin) {
      loadDashboard()
      const interval = setInterval(loadDashboard, 30000)
      return () => {
        clearInterval(interval)
      }
    }
  }, [loadDashboard, isAdmin])

  // Calculate some derived metrics
  const activeKeys = userKeys.filter(k => k.isActive).length
  const healthyFactoryKeys = factoryKeys.filter(k => k.status === 'healthy').length
  const healthyProxies = proxies.filter(p => p.status === 'healthy').length

  // Show loading while checking permissions
  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-neutral-500 mt-2">System monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => loadDashboard()}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-500">
              <span className={`relative flex h-2 w-2`}>
                {loading ? (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/75 opacity-75"></span>
                ) : null}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              </span>
              {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </header>

{/* Stats Grid - 4 columns */}
        <section className="py-8 border-y border-gray-300 dark:border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {loading ? '-' : (
                  <>
                    {openhandsKeys.length}
                    <span className="text-gray-400 dark:text-neutral-600 mx-1">/</span>
                    <span className="text-gray-500 dark:text-neutral-500">{openhandsKeys.length + openhandsBackupStats.available}</span>
                  </>
                )}
              </div>
              <div className="text-gray-500 dark:text-neutral-600 text-sm uppercase tracking-wider">OpenHands Keys</div>
              <div className="text-emerald-500 dark:text-emerald-400 text-xs mt-1">
                {openhandsKeys.filter(k => k.status === 'healthy').length} healthy · {openhandsBackupStats.available} backup
              </div>
            </div>
            <div className="text-center">
              {(() => {
                const totalSpent = openhandsKeys.reduce((sum, k) => sum + (k.totalSpend || 0), 0)
                const totalQuota = openhandsKeys.length * 10
                const remaining = totalQuota - totalSpent
                const percentage = totalQuota > 0 ? (totalSpent / totalQuota) * 100 : 0
                return loading ? (
                  <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">-</div>
                ) : (
                  <>
                    <div className="text-4xl md:text-5xl font-bold mb-2">
                      <span className={`${percentage >= 80 ? 'text-red-500' : percentage >= 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        ${remaining.toFixed(1)}
                      </span>
                      <span className="text-gray-400 dark:text-neutral-600 mx-1">/</span>
                      <span className="text-gray-500 dark:text-neutral-500">${totalQuota}</span>
                    </div>
                    <div className="text-gray-500 dark:text-neutral-600 text-sm uppercase tracking-wider">Quota</div>
                    <div className={`text-xs mt-1 ${percentage >= 80 ? 'text-red-400' : percentage >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ${totalSpent.toFixed(2)} used ({percentage.toFixed(0)}%)
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {loading ? '-' : stats.totalProxies}
              </div>
              <div className="text-gray-500 dark:text-neutral-600 text-sm uppercase tracking-wider">Proxies</div>
              <div className="text-emerald-500 dark:text-emerald-400 text-xs mt-1">{healthyProxies} online</div>
            </div>
            <div className="text-center">
              <div className={`text-4xl md:text-5xl font-bold mb-2 capitalize ${getHealthColor(stats.healthStatus)}`}>
                {loading ? '-' : stats.healthStatus}
              </div>
              <div className="text-gray-500 dark:text-neutral-600 text-sm uppercase tracking-wider">System Status</div>
              <div className="text-gray-500 dark:text-neutral-500 text-xs mt-1">{stats.healthyCount}/{stats.totalCount} services</div>
            </div>
          </div>
        </section>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-500 dark:text-neutral-500 text-sm mr-2">Period:</span>
{(['1h', '2h', '3h', '4h', '8h', '24h', '3d', '7d', '30d', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setMetricsPeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                metricsPeriod === period
                  ? 'bg-indigo-500 dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {period === 'all' ? 'All' : period}
            </button>
          ))}
        </div>

        {/* Main Metrics - Feature cards style */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* API Requests Card */}
          <div className="md:col-span-2 p-4 sm:p-6 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-neutral-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Requests</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                  {metricsPeriod === 'all' ? 'All' : metricsPeriod}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 dark:text-neutral-500">
                <span>Today: <span className="text-gray-900 dark:text-white">{formatLargeNumber(metrics.requestsToday || 0)}</span></span>
                <span>Week: <span className="text-gray-900 dark:text-white">{formatLargeNumber(metrics.requestsThisWeek || 0)}</span></span>
              </div>
            </div>
            <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-700 to-gray-500 dark:from-neutral-300 dark:to-neutral-500 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(metrics.totalRequests)}
            </p>
            <p className="text-gray-500 dark:text-neutral-500 text-sm mb-6">total requests processed</p>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Success</p>
                <p className="text-lg sm:text-xl font-semibold text-emerald-500 dark:text-emerald-400">{metrics.successRate}%</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Latency</p>
                <p className={`text-lg sm:text-xl font-semibold ${getLatencyColor(metrics.avgLatencyMs)}`}>
                  {(metrics.avgLatencyMs ?? 0) >= 1000 ? ((metrics.avgLatencyMs ?? 0) / 1000).toFixed(1) + 's' : (metrics.avgLatencyMs ?? 0).toLocaleString() + 'ms'}
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Error</p>
                <p className="text-lg sm:text-xl font-semibold text-red-500 dark:text-red-400">{(100 - metrics.successRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* User Stats Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-neutral-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Stats</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-purple-500 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(userStats.total_input_tokens + userStats.total_output_tokens)}
            </p>
            <p className="text-gray-500 dark:text-neutral-500 text-sm mb-4">total tokens</p>

            <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-3">
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                  <span className="hidden sm:inline">Total</span> Credits
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 font-medium">{formatUSD(userStats.total_credits)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400"></span>
                  Burned
                </span>
                <span className="text-orange-500 dark:text-orange-400 font-medium">{formatCredits(userStats.total_credits_used)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                  Ref
                </span>
                <span className="text-blue-500 dark:text-blue-400 font-medium">{formatUSD(userStats.total_ref_credits)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400"></span>
                  New Credits
                </span>
                <span className="text-teal-500 dark:text-teal-400 font-medium">{formatCredits(userStats.total_creditsNew)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400"></span>
                  New Burned
                </span>
                <span className="text-rose-500 dark:text-rose-400 font-medium">{formatCredits(userStats.total_creditsNewUsed)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                  Input
                </span>
                <span className="text-cyan-500 dark:text-cyan-400 font-medium">{formatLargeNumber(userStats.total_input_tokens)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"></span>
                  Output
                </span>
                <span className="text-purple-500 dark:text-purple-400 font-medium">{formatLargeNumber(userStats.total_output_tokens)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
                  Users
                </span>
                <span className="text-gray-900 dark:text-white font-medium">{userStats.total_users}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400"></span>
                  Active
                </span>
                <span className="text-violet-500 dark:text-violet-400 font-medium">{userStats.active_users || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Model Usage Section */}
        <section className="rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Usage</h3>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                {metricsPeriod === 'all' ? 'All' : metricsPeriod}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-500">{modelStats.length} models</span>
          </div>
          <div className="p-4">
            {modelStats.length > 0 ? (
              <>
                {/* Mobile Card Layout */}
                <div className="sm:hidden space-y-3">
                  {modelStats.map((model, index) => (
                    <div key={model.model} className={`p-3 rounded-lg border ${index === 0 ? 'border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5' : 'border-gray-200 dark:border-white/5 bg-white dark:bg-neutral-800/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-gray-700 dark:text-neutral-300 truncate max-w-[180px]">
                          {model.model}
                        </span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            TOP
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-neutral-500">Input</p>
                          <p className="text-cyan-600 dark:text-cyan-400 font-medium">{formatLargeNumber(model.inputTokens)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-neutral-500">Output</p>
                          <p className="text-purple-600 dark:text-purple-400 font-medium">{formatLargeNumber(model.outputTokens)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-neutral-500">Burned</p>
                          <p className="text-orange-600 dark:text-orange-400 font-medium">${model.creditsBurned.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-white/5 text-xs">
                        <span className="text-gray-500 dark:text-neutral-500">Total: <span className="text-gray-900 dark:text-white font-semibold">{formatLargeNumber(model.totalTokens)}</span></span>
                        <span className="text-gray-500 dark:text-neutral-500">Reqs: <span className="text-gray-600 dark:text-neutral-400">{model.requestCount.toLocaleString()}</span></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider border-b border-gray-300 dark:border-white/10">
                        <th className="text-left py-3 px-4">Model</th>
                        <th className="text-right py-3 px-4">Input</th>
                        <th className="text-right py-3 px-4">Output</th>
                        <th className="text-right py-3 px-4">Total</th>
                        <th className="text-right py-3 px-4">Burned</th>
                        <th className="text-right py-3 px-4">Reqs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelStats.map((model, index) => (
                        <tr key={model.model} className={`border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-neutral-800/50 ${index === 0 ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-gray-700 dark:text-neutral-300">
                              {model.model}
                            </span>
                            {index === 0 && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                TOP
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{formatLargeNumber(model.inputTokens)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{formatLargeNumber(model.outputTokens)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-gray-900 dark:text-white font-semibold">{formatLargeNumber(model.totalTokens)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-orange-600 dark:text-orange-400 font-medium">${model.creditsBurned.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-gray-600 dark:text-neutral-400">{model.requestCount.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>No model usage data</p>
                <p className="text-xs mt-1">API requests will appear here grouped by model</p>
              </div>
)}
          </div>
        </section>

        {/* OpenHands Keys Section */}
        <section className="rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">OpenHands Keys</h3>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                Credits
              </span>
            </div>
            <Link
              href="/admin/bindings"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Manage →
            </Link>
          </div>
          <div className="p-4">
            {openhandsKeys.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {openhandsKeys.map((key) => {
                  const credits = formatOpenhandsCredits(key.totalSpend)
                  return (
                    <div
                      key={key._id}
                      className={`p-3 rounded-lg border ${
                        key.status === 'healthy'
                          ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                          : 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-gray-600 dark:text-neutral-400 truncate max-w-[80px]">
                          {key._id}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          key.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></span>
                      </div>
                      <div className="text-center">
                        <span className={`text-lg font-bold ${
                          credits.percentage >= 95
                            ? 'text-red-600 dark:text-red-400'
                            : credits.percentage >= 80
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {credits.remain}
                        </span>
                        <span className="text-gray-400 dark:text-neutral-600 mx-1">/</span>
                        <span className="text-sm text-gray-500 dark:text-neutral-500">{credits.total}</span>
                      </div>
                      <div className="mt-1 text-center">
                        <span className="text-[10px] text-gray-500 dark:text-neutral-500">
                          {credits.percentage.toFixed(0)}% used
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>No OpenHands keys</p>
                <p className="text-xs mt-1">Configure keys in the Bindings page</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
