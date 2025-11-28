'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api'

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
    case 'healthy': return 'from-emerald-500 to-green-600'
    case 'degraded': return 'from-amber-500 to-orange-600'
    case 'down': return 'from-red-500 to-rose-600'
    default: return 'from-slate-500 to-slate-600'
  }
}

function getLatencyColor(ms: number): string {
  if (ms < 1000) return 'text-emerald-400'
  if (ms < 3000) return 'text-amber-400'
  return 'text-red-400'
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Healthy' },
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
    rate_limited: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Rate Limited' },
    exhausted: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Exhausted' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Error' },
    unhealthy: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Unhealthy' },
    unknown: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Unknown' },
  }
  const config = statusConfig[status] || statusConfig.unknown
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '****'
  return key.slice(0, 8) + '...' + key.slice(-4)
}

export default function AdminDashboard() {
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

  const loadDashboard = useCallback(async () => {
    try {
      const [keysResp, factoryResp, proxiesResp, statusResp, metricsResp] = await Promise.all([
        fetchWithAuth('/admin/keys').catch(() => null),
        fetchWithAuth('/admin/factory-keys').catch(() => null),
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
    loadDashboard()
    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  // Calculate some derived metrics
  const activeKeys = userKeys.filter(k => k.isActive).length
  const healthyFactoryKeys = factoryKeys.filter(k => k.status === 'healthy').length
  const healthyProxies = proxies.filter(p => p.status === 'healthy').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Comprehensive monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboard()}
            className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-all border border-slate-600/50"
          >
            Refresh
          </button>
          <div className="text-xs text-slate-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>
      </header>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-600/5 border border-sky-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">User Keys</p>
              <p className="text-2xl font-bold text-white">{loading ? '-' : stats.totalKeys}</p>
              <p className="text-xs text-sky-400">{activeKeys} active</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Factory Keys</p>
              <p className="text-2xl font-bold text-white">{loading ? '-' : stats.totalFactoryKeys}</p>
              <p className="text-xs text-violet-400">{healthyFactoryKeys} healthy</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Proxies</p>
              <p className="text-2xl font-bold text-white">{loading ? '-' : stats.totalProxies}</p>
              <p className="text-xs text-emerald-400">{healthyProxies} online</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getHealthColor(stats.healthStatus)} opacity-30 flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">System Status</p>
              <p className={`text-2xl font-bold capitalize bg-gradient-to-r ${getHealthColor(stats.healthStatus)} bg-clip-text text-transparent`}>
                {loading ? '-' : stats.healthStatus}
              </p>
              <p className="text-xs text-slate-400">{stats.healthyCount}/{stats.totalCount} services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Requests - Large Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">API Requests</p>
              <div className="flex gap-4 text-xs">
                <span className="text-slate-500">Today: <span className="text-white font-medium">{formatLargeNumber(metrics.requestsToday || 0)}</span></span>
                <span className="text-slate-500">Week: <span className="text-white font-medium">{formatLargeNumber(metrics.requestsThisWeek || 0)}</span></span>
              </div>
            </div>
            <p className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {loading ? '...' : formatLargeNumber(metrics.totalRequests)}
            </p>
            <p className="text-slate-500 text-sm mt-1">total requests processed</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Success Rate</p>
                <p className="text-xl font-semibold text-emerald-400">{metrics.successRate}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Avg Latency</p>
                <p className={`text-xl font-semibold ${getLatencyColor(metrics.avgLatencyMs)}`}>
                  {metrics.avgLatencyMs.toLocaleString()}ms
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Error Rate</p>
                <p className="text-xl font-semibold text-red-400">{(100 - metrics.successRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Token Usage</p>
            <p className="text-4xl font-bold mt-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {loading ? '...' : formatLargeNumber(metrics.totalTokens)}
            </p>
            <p className="text-slate-500 text-sm">total tokens consumed</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Input Tokens
                </span>
                <span className="text-white font-medium">{formatLargeNumber(metrics.inputTokens || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Output Tokens
                </span>
                <span className="text-white font-medium">{formatLargeNumber(metrics.outputTokens || 0)}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-cyan-500"
                  style={{ width: metrics.totalTokens > 0 ? `${((metrics.inputTokens || 0) / metrics.totalTokens) * 100}%` : '50%' }}
                />
                <div
                  className="h-full bg-blue-500"
                  style={{ width: metrics.totalTokens > 0 ? `${((metrics.outputTokens || 0) / metrics.totalTokens) * 100}%` : '50%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Keys Table */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">User API Keys</h3>
            </div>
            <Link href="/keys" className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="p-4">
            {userKeys.length > 0 ? (
              <div className="space-y-3">
                {userKeys.map((key) => {
                  const usagePercent = key.totalTokens > 0 ? (key.tokensUsed / key.totalTokens) * 100 : 0
                  return (
                    <div key={key._id || key.id} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{key.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            key.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {key.tier}
                          </span>
                        </div>
                        {getStatusBadge(key.isActive ? 'active' : 'unhealthy')}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{formatLargeNumber(key.tokensUsed)} / {formatLargeNumber(key.totalTokens)} tokens</span>
                        <span>{usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No user keys configured</p>
                <Link href="/keys" className="text-sky-400 text-sm hover:underline mt-2 inline-block">
                  Create your first key
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Factory Keys Table */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Factory Keys (Upstream)</h3>
            </div>
            <Link href="/factory-keys" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="p-4">
            {factoryKeys.length > 0 ? (
              <div className="space-y-3">
                {factoryKeys.map((key) => (
                  <div key={key._id || key.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-300">{maskApiKey(key.apiKey || '')}</span>
                        {key.provider && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-600/50 text-slate-300">
                            {key.provider}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(key.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{formatLargeNumber(key.tokensUsed)} tokens used</span>
                      <span>{key.requestsCount.toLocaleString()} requests</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No factory keys configured</p>
                <Link href="/factory-keys" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
                  Add your first key
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proxies Section */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Proxy Servers</h3>
          </div>
          <Link href="/proxies" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            View all
          </Link>
        </div>
        <div className="p-4">
          {proxies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proxies.map((proxy) => (
                <div key={proxy._id} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{proxy.name}</span>
                    {getStatusBadge(proxy.status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type</span>
                      <span className="text-slate-200 uppercase">{proxy.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address</span>
                      <span className="text-slate-200 font-mono text-xs">{proxy.host}:{proxy.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latency</span>
                      <span className={getLatencyColor(proxy.lastLatencyMs || 0)}>
                        {proxy.lastLatencyMs ? `${proxy.lastLatencyMs}ms` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No proxies configured</p>
              <Link href="/proxies" className="text-emerald-400 text-sm hover:underline mt-2 inline-block">
                Add your first proxy
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
        </div>
        <div className="p-4">
          {recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Model</th>
                    <th className="text-left py-3 px-4">Latency</th>
                    <th className="text-left py-3 px-4">Tokens</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log._id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-slate-700/50 px-2 py-1 rounded">{log.model}</span>
                      </td>
                      <td className={`py-3 px-4 ${getLatencyColor(log.latencyMs)}`}>
                        {log.latencyMs}ms
                      </td>
                      <td className="py-3 px-4 text-slate-300">
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
            <div className="text-center py-8 text-slate-500">
              <p>No recent activity</p>
              <p className="text-xs mt-1">API requests will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/keys"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all hover:-translate-y-0.5"
          >
            Create User Key
          </Link>
          <Link
            href="/factory-keys"
            className="px-5 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-all border border-slate-600/50"
          >
            Add Factory Key
          </Link>
          <Link
            href="/proxies"
            className="px-5 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-all border border-slate-600/50"
          >
            Configure Proxy
          </Link>
          <a
            href="/api/status"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-all border border-slate-600/50"
          >
            Health Check API
          </a>
        </div>
      </div>
    </div>
  )
}
