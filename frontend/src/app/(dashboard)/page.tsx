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

export default function Dashboard() {
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

      const keysData = keysResp?.ok ? await keysResp.json() : { total: 0 }
      const factoryData = factoryResp?.ok ? await factoryResp.json() : { total: 0 }
      const proxiesData = proxiesResp?.ok ? await proxiesResp.json() : { total: 0 }
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
      })

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            AI Proxy Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>
      </header>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Requests - Large Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Requests</p>
            <p className="text-6xl font-bold mt-2 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {loading ? '...' : formatLargeNumber(metrics.totalRequests)}
            </p>
            <div className="mt-6 flex items-center gap-8">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Success Rate</p>
                <p className="text-2xl font-semibold text-white">{metrics.successRate}%</p>
              </div>
              <div className="h-12 w-px bg-slate-700" />
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Avg Latency</p>
                <p className={`text-2xl font-semibold ${getLatencyColor(metrics.avgLatencyMs)}`}>
                  {metrics.avgLatencyMs.toLocaleString()}ms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-8">
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getHealthColor(stats.healthStatus)} opacity-20 rounded-full blur-2xl`} />
          <div className="relative">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">System Health</p>
            <p className={`text-4xl font-bold mt-2 capitalize bg-gradient-to-r ${getHealthColor(stats.healthStatus)} bg-clip-text text-transparent`}>
              {loading ? '...' : stats.healthStatus}
            </p>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Proxies Online</span>
                <span className="text-white font-medium">{stats.healthyCount}/{stats.totalCount}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getHealthColor(stats.healthStatus)} transition-all duration-500`}
                  style={{ width: stats.totalCount > 0 ? `${(stats.healthyCount / stats.totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Token Consumption</p>
            <p className="text-5xl font-bold mt-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {loading ? '...' : formatLargeNumber(metrics.totalTokens)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs uppercase tracking-wider">tokens used</p>
            <p className="text-slate-300 text-sm mt-1">across all API requests</p>
          </div>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href="/keys" className="group">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-6 hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">User Keys</p>
                <p className="text-4xl font-bold text-white mt-1">{loading ? '-' : stats.totalKeys}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-sky-400 to-sky-500" />
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4 group-hover:text-sky-400 transition-colors">
              Manage API keys →
            </p>
          </div>
        </Link>

        <Link href="/factory-keys" className="group">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-6 hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Factory Keys</p>
                <p className="text-4xl font-bold text-white mt-1">{loading ? '-' : stats.totalFactoryKeys}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-400 to-violet-500" />
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4 group-hover:text-violet-400 transition-colors">
              Upstream providers →
            </p>
          </div>
        </Link>

        <Link href="/proxies" className="group">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-6 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Proxies</p>
                <p className="text-4xl font-bold text-white mt-1">{loading ? '-' : stats.totalProxies}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-emerald-500" />
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4 group-hover:text-emerald-400 transition-colors">
              Network routing →
            </p>
          </div>
        </Link>
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
        </div>
      </div>
    </div>
  )
}
