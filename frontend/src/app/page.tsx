'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchWithAuth, formatNumber } from '@/lib/api'

interface Stats {
  totalKeys: number
  totalFactoryKeys: number
  totalProxies: number
  healthStatus: string
  healthIcon: string
}

interface Metrics {
  totalRequests: number
  totalTokens: number
  avgLatencyMs: number
  successRate: number
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalKeys: 0,
    totalFactoryKeys: 0,
    totalProxies: 0,
    healthStatus: 'Unknown',
    healthIcon: '⏳',
  })
  const [metrics, setMetrics] = useState<Metrics>({
    totalRequests: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    successRate: 0,
  })
  const [loading, setLoading] = useState(true)
  
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
      const statusData = statusResp?.ok ? await statusResp.json() : { status: 'unknown' }
      const metricsData = metricsResp?.ok ? await metricsResp.json() : {}
      
      const icons: Record<string, string> = { healthy: '✅', degraded: '⚠️', down: '❌', unknown: '❓' }
      
      setStats({
        totalKeys: keysData.total || 0,
        totalFactoryKeys: factoryData.total || 0,
        totalProxies: proxiesData.total || 0,
        healthStatus: statusData.status || 'Unknown',
        healthIcon: icons[statusData.status] || '❓',
      })
      
      setMetrics({
        totalRequests: metricsData.total_requests || 0,
        totalTokens: metricsData.total_tokens || 0,
        avgLatencyMs: metricsData.avg_latency_ms || 0,
        successRate: metricsData.success_rate || 0,
      })
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [loadDashboard])
  
  const statCards = [
    { icon: '🔑', value: stats.totalKeys, label: 'User Keys' },
    { icon: '🏭', value: stats.totalFactoryKeys, label: 'Factory Keys' },
    { icon: '🌐', value: stats.totalProxies, label: 'Proxies' },
    { icon: stats.healthIcon, value: stats.healthStatus, label: 'System Health' },
  ]
  
  const metricsCards = [
    { icon: '📊', value: formatLargeNumber(metrics.totalRequests), label: 'Total Requests' },
    { icon: '🎫', value: formatLargeNumber(metrics.totalTokens), label: 'Total Tokens' },
    { icon: '⚡', value: `${metrics.avgLatencyMs}ms`, label: 'Avg Latency' },
    { icon: '✅', value: `${metrics.successRate}%`, label: 'Success Rate' },
  ]
  
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
      </header>
      
      {/* System Metrics */}
      <h2 className="text-lg font-semibold text-slate-200 mb-4">System Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {metricsCards.map((card, i) => (
          <div key={i} className="card p-6 flex items-center gap-4 bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="text-4xl">{card.icon}</div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-100">
                {loading ? '-' : card.value}
              </span>
              <span className="text-slate-400 text-sm">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Resource Stats */}
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Resources</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="card p-6 flex items-center gap-4">
            <div className="text-4xl">{card.icon}</div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-100">
                {loading ? '-' : typeof card.value === 'number' ? formatNumber(card.value) : card.value}
              </span>
              <span className="text-slate-400 text-sm">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/keys" className="btn btn-primary">+ New User Key</Link>
          <Link href="/factory-keys" className="btn btn-secondary">+ New Factory Key</Link>
          <Link href="/proxies" className="btn btn-secondary">+ New Proxy</Link>
        </div>
      </div>
    </div>
  )
}
