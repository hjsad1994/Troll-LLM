'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWithAuth, formatNumber } from '@/lib/api'

interface Stats {
  totalKeys: number
  totalFactoryKeys: number
  totalProxies: number
  healthStatus: string
  healthIcon: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalKeys: 0,
    totalFactoryKeys: 0,
    totalProxies: 0,
    healthStatus: 'Unknown',
    healthIcon: '⏳',
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadDashboard()
  }, [])
  
  async function loadDashboard() {
    try {
      const [keysResp, factoryResp, proxiesResp, statusResp] = await Promise.all([
        fetchWithAuth('/admin/keys'),
        fetchWithAuth('/admin/factory-keys'),
        fetchWithAuth('/admin/proxies'),
        fetch('/api/status'),
      ])
      
      const keysData = keysResp.ok ? await keysResp.json() : { total: 0 }
      const factoryData = factoryResp.ok ? await factoryResp.json() : { total: 0 }
      const proxiesData = proxiesResp.ok ? await proxiesResp.json() : { total: 0 }
      const statusData = statusResp.ok ? await statusResp.json() : { status: 'unknown' }
      
      const icons: Record<string, string> = { healthy: '✅', degraded: '⚠️', down: '❌', unknown: '❓' }
      
      setStats({
        totalKeys: keysData.total || 0,
        totalFactoryKeys: factoryData.total || 0,
        totalProxies: proxiesData.total || 0,
        healthStatus: statusData.status || 'Unknown',
        healthIcon: icons[statusData.status] || '❓',
      })
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const statCards = [
    { icon: '🔑', value: stats.totalKeys, label: 'User Keys' },
    { icon: '🏭', value: stats.totalFactoryKeys, label: 'Factory Keys' },
    { icon: '🌐', value: stats.totalProxies, label: 'Proxies' },
    { icon: stats.healthIcon, value: stats.healthStatus, label: 'System Health' },
  ]
  
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
      </header>
      
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
