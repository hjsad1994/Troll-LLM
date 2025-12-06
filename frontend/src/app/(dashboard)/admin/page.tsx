'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, getModelStats, getModelsHealth, ModelStats, ModelHealth } from '@/lib/api'
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
  by_plan: Record<string, number>
  total_tokens_used: number
  total_credits: number
  total_input_tokens: number
  total_output_tokens: number
  total_credits_burned: number
}

interface UserKey {
  _id?: string
  id?: string
  name: string
  tier: string
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
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [userStats, setUserStats] = useState<UserStats>({ total_users: 0, by_plan: {}, total_tokens_used: 0, total_credits: 0, total_input_tokens: 0, total_output_tokens: 0, total_credits_burned: 0 })
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [modelsHealth, setModelsHealth] = useState<ModelHealth[]>([])
  const [modelsHealthLoading, setModelsHealthLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [metricsPeriod, setMetricsPeriod] = useState<'1h' | '3h' | '8h' | '24h' | '7d' | 'all'>('all')

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  const loadModelsHealth = useCallback(async () => {
    try {
      setModelsHealthLoading(true)
      const data = await getModelsHealth()
      setModelsHealth(data.models)
    } catch (err) {
      console.error('Failed to load models health:', err)
    } finally {
      setModelsHealthLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async (period: string = metricsPeriod) => {
    try {
      const [keysResp, factoryResp, proxiesResp, statusResp, metricsResp, userStatsResp, modelStatsResp] = await Promise.all([
        fetchWithAuth('/admin/keys').catch(() => null),
        fetchWithAuth('/admin/troll-keys').catch(() => null),
        fetchWithAuth('/admin/proxies').catch(() => null),
        fetch('/api/status').catch(() => null),
        fetchWithAuth(`/admin/metrics?period=${period}`).catch(() => null),
        fetchWithAuth(`/admin/user-stats?period=${period}`).catch(() => null),
        getModelStats(period).catch(() => ({ models: [] })),
      ])

      const keysData = keysResp?.ok ? await keysResp.json() : { total: 0, keys: [] }
      const factoryData = factoryResp?.ok ? await factoryResp.json() : { total: 0, keys: [] }
      const proxiesData = proxiesResp?.ok ? await proxiesResp.json() : { total: 0, proxies: [] }
      const statusData = statusResp?.ok ? await statusResp.json() : { status: 'unknown', summary: { healthy: 0, total: 0 } }
      const metricsData = metricsResp?.ok ? await metricsResp.json() : {}
      const userStatsData = userStatsResp?.ok ? await userStatsResp.json() : { total_users: 0, by_plan: {}, total_tokens_used: 0, total_credits: 0, total_input_tokens: 0, total_output_tokens: 0, total_credits_burned: 0 }

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
      loadModelsHealth()
      const interval = setInterval(loadDashboard, 30000)
      const healthInterval = setInterval(loadModelsHealth, 30000)
      return () => {
        clearInterval(interval)
        clearInterval(healthInterval)
      }
    }
  }, [loadDashboard, loadModelsHealth, isAdmin])

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

        {/* Models Health Status - Compact */}
        <div className="p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Models</span>
              <span className="text-xs text-gray-500 dark:text-neutral-500">
                (<span className="text-emerald-600 dark:text-emerald-400">{modelsHealth.filter(m => m.isHealthy).length}</span>/<span className="text-gray-600 dark:text-gray-400">{modelsHealth.length}</span>)
              </span>
            </div>
            <button
              onClick={loadModelsHealth}
              disabled={modelsHealthLoading}
              className="px-2 py-1 text-xs text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              {modelsHealthLoading ? '...' : '↻'}
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {modelsHealthLoading && modelsHealth.length === 0 ? (
              <span className="text-xs text-gray-500 dark:text-neutral-500">Loading...</span>
            ) : (
              modelsHealth.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs ${
                    model.isHealthy
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                  title={`${model.name} - ${model.isHealthy ? 'Up' : 'Down'}${model.latencyMs ? ` (${model.latencyMs}ms)` : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${model.isHealthy ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                  <span>{model.name}</span>
                  <span className={`text-[10px] font-medium ${model.isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({model.isHealthy ? 'Up' : 'Down'})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats Grid - 3 columns */}
        <section className="py-8 border-y border-gray-300 dark:border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {loading ? '-' : stats.totalFactoryKeys}
              </div>
              <div className="text-gray-500 dark:text-neutral-600 text-sm uppercase tracking-wider">Troll-Keys</div>
              <div className="text-gray-600 dark:text-neutral-400 text-xs mt-1">{healthyFactoryKeys} healthy</div>
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
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-neutral-500 text-sm mr-2">Period:</span>
          {(['1h', '3h', '8h', '24h', '7d', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setMetricsPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                metricsPeriod === period
                  ? 'bg-indigo-500 dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {period === 'all' ? 'All Time' : period === '1h' ? '1 Hour' : period === '3h' ? '3 Hours' : period === '8h' ? '8 Hours' : period === '24h' ? '24 Hours' : '7 Days'}
            </button>
          ))}
        </div>

        {/* Main Metrics - Feature cards style */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* API Requests Card */}
          <div className="md:col-span-2 p-6 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-neutral-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Requests</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                  {metricsPeriod === 'all' ? 'All Time' : metricsPeriod === '1h' ? 'Last 1h' : metricsPeriod === '3h' ? 'Last 3h' : metricsPeriod === '8h' ? 'Last 8h' : metricsPeriod === '24h' ? 'Last 24h' : 'Last 7d'}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 dark:text-neutral-500">
                <span>Today: <span className="text-gray-900 dark:text-white">{formatLargeNumber(metrics.requestsToday || 0)}</span></span>
                <span>Week: <span className="text-gray-900 dark:text-white">{formatLargeNumber(metrics.requestsThisWeek || 0)}</span></span>
              </div>
            </div>
            <p className="text-5xl font-bold bg-gradient-to-r from-gray-700 to-gray-500 dark:from-neutral-300 dark:to-neutral-500 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(metrics.totalRequests)}
            </p>
            <p className="text-gray-500 dark:text-neutral-500 text-sm mb-6">total requests processed</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Success Rate</p>
                <p className="text-xl font-semibold text-emerald-500 dark:text-emerald-400">{metrics.successRate}%</p>
              </div>
              <div className="p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Avg Latency</p>
                <p className={`text-xl font-semibold ${getLatencyColor(metrics.avgLatencyMs)}`}>
                  {(metrics.avgLatencyMs ?? 0).toLocaleString()}ms
                </p>
              </div>
              <div className="p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800/60">
                <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Error Rate</p>
                <p className="text-xl font-semibold text-red-500 dark:text-red-400">{(100 - metrics.successRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* User Stats Card */}
          <div className="p-6 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-neutral-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Stats</h3>
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-gray-700 to-gray-500 dark:from-neutral-300 dark:to-neutral-500 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(userStats.total_input_tokens + userStats.total_output_tokens)}
            </p>
            <p className="text-gray-500 dark:text-neutral-500 text-sm mb-4">total tokens used by all users</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                  Input Tokens
                </span>
                <span className="text-cyan-500 dark:text-cyan-400 font-medium">{formatLargeNumber(userStats.total_input_tokens)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"></span>
                  Output Tokens
                </span>
                <span className="text-purple-500 dark:text-purple-400 font-medium">{formatLargeNumber(userStats.total_output_tokens)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                  Total Credits
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 font-medium">${userStats.total_credits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400"></span>
                  Credits Burned
                </span>
                <span className="text-orange-500 dark:text-orange-400 font-medium">${(userStats.total_credits_burned || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
                  Total Users
                </span>
                <span className="text-gray-900 dark:text-white font-medium">{userStats.total_users}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400"></span>
                  Dev Plan
                </span>
                <span className="text-violet-500 dark:text-violet-400 font-medium">{userStats.by_plan?.dev || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                  Pro Plan
                </span>
                <span className="text-amber-500 dark:text-amber-400 font-medium">{userStats.by_plan?.pro || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Model Usage Section */}
        <section className="rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Usage</h3>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                {metricsPeriod === 'all' ? 'All Time' : metricsPeriod === '1h' ? 'Last 1h' : metricsPeriod === '3h' ? 'Last 3h' : metricsPeriod === '8h' ? 'Last 8h' : metricsPeriod === '24h' ? 'Last 24h' : 'Last 7d'}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-500">{modelStats.length} models</span>
          </div>
          <div className="p-4">
            {modelStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider border-b border-gray-300 dark:border-white/10">
                      <th className="text-left py-3 px-4">Model</th>
                      <th className="text-right py-3 px-4">Input Tokens</th>
                      <th className="text-right py-3 px-4">Output Tokens</th>
                      <th className="text-right py-3 px-4">Total Tokens</th>
                      <th className="text-right py-3 px-4">Credits Burned</th>
                      <th className="text-right py-3 px-4">Requests</th>
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
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>No model usage data</p>
                <p className="text-xs mt-1">API requests will appear here grouped by model</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
