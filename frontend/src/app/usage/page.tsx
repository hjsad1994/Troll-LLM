'use client'

import { useState } from 'react'
import { formatNumber } from '@/lib/api'

interface UsageData {
  key: string
  tier: string
  rpm_limit: number
  tokens_used: number
  requests_count: number
  is_active: boolean
  last_used_at: string | null
  message: string | null
}

export default function UsagePage() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<UsageData | null>(null)
  const [error, setError] = useState('')

  async function checkUsage() {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const resp = await fetch(`/api/usage?key=${encodeURIComponent(apiKey)}`)
      const result = await resp.json()

      if (!resp.ok) {
        setError(result.error || 'Invalid API key')
        return
      }

      setData(result)
    } catch {
      setError('Failed to check usage. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago'

    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-sky-400 mb-8">🔑 F-Proxy Usage</h1>

        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkUsage()}
            placeholder="Enter your API key (sk-xxx-xxx)"
            className="input flex-1 font-mono text-sm"
            autoFocus
          />
          <button
            onClick={checkUsage}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '...' : 'Check'}
          </button>
        </div>

        {error && (
          <div className="card p-6 text-center">
            <p className="text-red-400 text-lg">❌ {error}</p>
          </div>
        )}

        {data && (
          <div className="card p-6">
            {/* Status */}
            <div className={`flex items-center gap-2 text-lg font-medium mb-4 ${
              !data.is_active ? 'text-red-400' : 'text-green-400'
            }`}>
              {!data.is_active ? '🚫' : '✅'}
              {!data.is_active ? 'API Key Revoked' : 'API Key Valid'}
            </div>

            {/* Tier & RPM */}
            <div className="text-slate-400 mb-6">
              Plan: <span className={`badge ml-2 ${data.tier === 'pro' ? 'badge-pro' : 'badge-dev'}`}>
                {data.tier.toUpperCase()}
              </span>
              <strong className="ml-3 text-sky-400">{data.rpm_limit} RPM</strong>
            </div>

            {/* Token Usage */}
            <div className="text-center text-2xl font-bold mb-6 text-sky-400">
              {formatNumber(data.tokens_used)} tokens used
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-5 border-t border-dark-border">
              <div className="bg-dark-bg p-3 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Total Requests</div>
                <div className="font-medium">{formatNumber(data.requests_count)}</div>
              </div>
              <div className="bg-dark-bg p-3 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">Last Used</div>
                <div className="font-medium">{data.last_used_at ? formatDate(data.last_used_at) : 'Never'}</div>
              </div>
            </div>

            {/* Message */}
            {data.message && (
              <div className="mt-4 p-3 rounded-lg text-sm bg-red-100 text-red-800">
                {data.message}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-slate-500 text-sm mt-8">
          <a href="/" className="text-sky-400 hover:underline">← Back to Admin</a>
        </p>
      </div>
    </div>
  )
}
