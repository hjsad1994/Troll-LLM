'use client'

import { useState } from 'react'
import { formatNumber } from '@/lib/api'

interface UsageData {
  key: string
  tier: string
  rpm_limit: number
  total_tokens: number
  tokens_used: number
  tokens_remaining: number
  usage_percent: number
  requests_count: number
  is_active: boolean
  is_exhausted: boolean
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

  const percent = data?.usage_percent || 0
  const progressClass = percent >= 90 ? 'danger' : percent > 70 ? 'warning' : ''

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
              !data.is_active ? 'text-red-400' : data.is_exhausted ? 'text-amber-400' : 'text-green-400'
            }`}>
              {!data.is_active ? '🚫' : data.is_exhausted ? '⚠️' : '✅'}
              {!data.is_active ? 'API Key Revoked' : data.is_exhausted ? 'Quota Exhausted' : 'API Key Valid'}
            </div>

            {/* Tier & RPM */}
            <div className="text-slate-400 mb-6">
              Plan: <span className={`badge ml-2 ${data.tier === 'pro' ? 'badge-pro' : 'badge-dev'}`}>
                {data.tier.toUpperCase()}
              </span>
              <strong className="ml-3 text-sky-400">{data.rpm_limit} RPM</strong>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="text-sm text-slate-400 mb-2">Token Usage</div>
              <div className="progress-bar h-7 relative">
                <div 
                  className={`progress-fill ${progressClass}`} 
                  style={{ width: `${Math.min(percent, 100)}%` }} 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-900">
                  {percent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>{formatNumber(data.tokens_used)} used</span>
                <span>{formatNumber(data.total_tokens)} total</span>
              </div>
            </div>

            {/* Remaining */}
            <div className={`text-center text-2xl font-bold mb-6 ${
              data.is_exhausted ? 'text-red-400' : percent > 70 ? 'text-amber-400' : 'text-green-400'
            }`}>
              {formatNumber(data.tokens_remaining)} tokens remaining
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
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                data.is_exhausted || !data.is_active 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
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
