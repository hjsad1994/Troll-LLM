'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'
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
  totalTokens: number
  avgLatencyMs: number
  successRate: number
  inputTokens?: number
  outputTokens?: number
  requestsToday?: number
  requestsThisWeek?: number
}

interface UserKey {
  _id?: string
  id?: string
  name: string
  tier: string
  tokensUsed: number
  totalTokens: number
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

function formatLargeNumber(num: number): string {
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
    totalTokens: 0,
    avgLatencyMs: 0,
    successRate: 0,
  })
  const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [factoryKeys, setFactoryKeys] = useState<FactoryKey[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  const loadDashboard = useCallback(async () => {
    try {
      const [keysResp, factoryResp, proxiesResp, statusResp, metricsResp] = await Promise.all([
        fetchWithAuth('/admin/keys').catch(() => null),
        fetchWithAuth('/admin/troll-keys').catch(() => null),
        fetchWithAuth('/admin/proxies').catch(() => null),
        fetch('/api/status').catch(() => null),
        fetchWithAuth('/admin/metrics').catch(() => null),
      ])

      const keysData = keysResp?.ok ? await keysResp.json() : { total: 0, keys: [] }
      const factoryData = factoryResp?.ok ? await factoryResp.json() : { total: 0, keys: [] }
      const proxiesData = proxiesResp?.ok ? await proxiesResp.json() : { total: 0, proxies: [] }
      const statusData = statusResp?.ok ? await statusResp.json() : { status: 'unknown', summary: { healthy: 0, total: 0 } }
      const metricsData = metricsResp?.ok ? await metricsResp.json() : {}

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
        totalTokens: metricsData.total_tokens || 0,
        avgLatencyMs: metricsData.avg_latency_ms || 0,
        successRate: metricsData.success_rate || 0,
        inputTokens: metricsData.input_tokens || 0,
        outputTokens: metricsData.output_tokens || 0,
        requestsToday: metricsData.requests_today || 0,
        requestsThisWeek: metricsData.requests_this_week || 0,
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
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadDashboard()
      const interval = setInterval(loadDashboard, 30000)
      return () => clearInterval(interval)
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
    <div className="min-h-screen bg-black">
      {/* Background grid pattern - same as homepage */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Admin Dashboard
            </h1>
            <p className="text-neutral-500 mt-2">System monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => loadDashboard()}
              className="px-4 py-2 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
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

        {/* Stats Grid - 4 columns like homepage stats */}
        <section className="py-8 border-y border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {loading ? '-' : stats.totalKeys}
              </div>
              <div className="text-neutral-600 text-sm uppercase tracking-wider">User Keys</div>
              <div className="text-neutral-400 text-xs mt-1">{activeKeys} active</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {loading ? '-' : stats.totalFactoryKeys}
              </div>
              <div className="text-neutral-600 text-sm uppercase tracking-wider">Troll-Keys</div>
              <div className="text-neutral-400 text-xs mt-1">{healthyFactoryKeys} healthy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {loading ? '-' : stats.totalProxies}
              </div>
              <div className="text-neutral-600 text-sm uppercase tracking-wider">Proxies</div>
              <div className="text-emerald-400 text-xs mt-1">{healthyProxies} online</div>
            </div>
            <div className="text-center">
              <div className={`text-4xl md:text-5xl font-bold mb-2 capitalize ${getHealthColor(stats.healthStatus)}`}>
                {loading ? '-' : stats.healthStatus}
              </div>
              <div className="text-neutral-600 text-sm uppercase tracking-wider">System Status</div>
              <div className="text-neutral-500 text-xs mt-1">{stats.healthyCount}/{stats.totalCount} services</div>
            </div>
          </div>
        </section>

        {/* Main Metrics - Feature cards style */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* API Requests Card */}
          <div className="md:col-span-2 p-6 rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm hover:bg-neutral-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">API Requests</h3>
              </div>
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>Today: <span className="text-white">{formatLargeNumber(metrics.requestsToday || 0)}</span></span>
                <span>Week: <span className="text-white">{formatLargeNumber(metrics.requestsThisWeek || 0)}</span></span>
              </div>
            </div>
            <p className="text-5xl font-bold bg-gradient-to-r from-neutral-300 to-neutral-500 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(metrics.totalRequests)}
            </p>
            <p className="text-neutral-500 text-sm mb-6">total requests processed</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-white/10 bg-neutral-800/60">
                <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Success Rate</p>
                <p className="text-xl font-semibold text-emerald-400">{metrics.successRate}%</p>
              </div>
              <div className="p-3 rounded-lg border border-white/10 bg-neutral-800/60">
                <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Avg Latency</p>
                <p className={`text-xl font-semibold ${getLatencyColor(metrics.avgLatencyMs)}`}>
                  {metrics.avgLatencyMs.toLocaleString()}ms
                </p>
              </div>
              <div className="p-3 rounded-lg border border-white/10 bg-neutral-800/60">
                <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Error Rate</p>
                <p className="text-xl font-semibold text-red-400">{(100 - metrics.successRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Token Usage Card */}
          <div className="p-6 rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Token Usage</h3>
            </div>
            <p className="text-4xl font-bold bg-gradient-to-r from-neutral-300 to-neutral-500 bg-clip-text text-transparent mb-1">
              {loading ? '...' : formatLargeNumber(metrics.totalTokens)}
            </p>
            <p className="text-neutral-500 text-sm mb-4">total tokens consumed</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  Input
                </span>
                <span className="text-white font-medium">{formatLargeNumber(metrics.inputTokens || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                  Output
                </span>
                <span className="text-white font-medium">{formatLargeNumber(metrics.outputTokens || 0)}</span>
              </div>
              <div className="h-2 bg-neutral-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-white"
                  style={{ width: metrics.totalTokens > 0 ? `${((metrics.inputTokens || 0) / metrics.totalTokens) * 100}%` : '50%' }}
                />
                <div
                  className="h-full bg-neutral-500"
                  style={{ width: metrics.totalTokens > 0 ? `${((metrics.outputTokens || 0) / metrics.totalTokens) * 100}%` : '50%' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data Tables Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* User Keys */}
          <div className="rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">User API Keys</h3>
              <Link href="/keys" className="text-sm text-neutral-400 hover:text-white transition-colors">
                View all
              </Link>
            </div>
            <div className="p-4">
              {userKeys.length > 0 ? (
                <div className="space-y-3">
                  {userKeys.map((key) => {
                    const usagePercent = key.totalTokens > 0 ? (key.tokensUsed / key.totalTokens) * 100 : 0
                    return (
                      <div key={key._id || key.id} className="p-3 rounded-lg border border-white/10 bg-neutral-800/60">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{key.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              key.tier === 'pro'
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-white/5 text-neutral-400 border-white/10'
                            }`}>
                              {key.tier}
                            </span>
                          </div>
                          {getStatusBadge(key.isActive ? 'active' : 'unhealthy')}
                        </div>
                        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                          <span>{formatLargeNumber(key.tokensUsed)} / {formatLargeNumber(key.totalTokens)}</span>
                          <span>{usagePercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-white'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p>No user keys configured</p>
                  <Link href="/keys" className="text-neutral-400 text-sm hover:text-white mt-2 inline-block">
                    Create your first key
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Troll-Keys */}
          <div className="rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Troll-Keys</h3>
              <Link href="/troll-keys" className="text-sm text-neutral-400 hover:text-white transition-colors">
                View all
              </Link>
            </div>
            <div className="p-4">
              {factoryKeys.length > 0 ? (
                <div className="space-y-3">
                  {factoryKeys.map((key) => (
                    <div key={key._id || key.id} className="p-3 rounded-lg border border-white/10 bg-neutral-800/60">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-neutral-300">{maskApiKey(key.apiKey || '')}</span>
                          {key.provider && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-neutral-400 border border-white/10">
                              {key.provider}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(key.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span>{formatLargeNumber(key.tokensUsed)} tokens</span>
                        <span>{key.requestsCount.toLocaleString()} requests</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p>No Troll-Keys configured</p>
                  <Link href="/troll-keys" className="text-neutral-400 text-sm hover:text-white mt-2 inline-block">
                    Add your first key
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Proxies Section */}
        <section className="rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Proxy Servers</h3>
            <Link href="/proxies" className="text-sm text-neutral-400 hover:text-white transition-colors">
              View all
            </Link>
          </div>
          <div className="p-4">
            {proxies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proxies.map((proxy) => (
                  <div key={proxy._id} className="p-4 rounded-lg border border-white/10 bg-neutral-800/60">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{proxy.name}</span>
                      {getStatusBadge(proxy.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Type</span>
                        <span className="text-neutral-300 uppercase">{proxy.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Address</span>
                        <span className="text-neutral-300 font-mono text-xs">{proxy.host}:{proxy.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Latency</span>
                        <span className={getLatencyColor(proxy.lastLatencyMs || 0)}>
                          {proxy.lastLatencyMs ? `${proxy.lastLatencyMs}ms` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>No proxies configured</p>
                <Link href="/proxies" className="text-neutral-400 text-sm hover:text-white mt-2 inline-block">
                  Add your first proxy
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="p-4">
            {recentLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-white/10">
                      <th className="text-left py-3 px-4">Time</th>
                      <th className="text-left py-3 px-4">Model</th>
                      <th className="text-left py-3 px-4">Latency</th>
                      <th className="text-left py-3 px-4">Tokens</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log) => (
                      <tr key={log._id} className="border-b border-white/10 hover:bg-neutral-800/50">
                        <td className="py-3 px-4 text-neutral-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-neutral-800 border border-white/10 px-2 py-1 rounded text-neutral-300">{log.model}</span>
                        </td>
                        <td className={`py-3 px-4 ${getLatencyColor(log.latencyMs)}`}>
                          {log.latencyMs}ms
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {log.tokensUsed ? formatLargeNumber(log.tokensUsed) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {log.success ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Success
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>No recent activity</p>
                <p className="text-xs mt-1">API requests will appear here</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-8 border-t border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/keys"
              className="px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors"
            >
              Create User Key
            </Link>
            <Link
              href="/troll-keys"
              className="px-6 py-3 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Add Troll-Key
            </Link>
            <Link
              href="/proxies"
              className="px-6 py-3 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Configure Proxy
            </Link>
            <a
              href="/api/status"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Health Check API
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
