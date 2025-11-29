'use client'

// TEMPORARILY DISABLED - request history feature
export default function RequestHistoryPage() {
  return (
    <div className="min-h-screen bg-black -m-8 p-8">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="p-12 rounded-xl border border-white/5 bg-white/[0.02] text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Feature Temporarily Disabled</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Request History is currently under maintenance. Please check back later.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ORIGINAL CODE - TEMPORARILY DISABLED
import { useEffect, useState, useCallback } from 'react'
import { getRequestHistory, RequestLogEntry, RequestHistoryResponse } from '@/lib/api'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString()
}

function formatTokens(num: number | undefined): string {
  if (num === undefined || num === null) return '-'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatCost(cost: number | undefined): string {
  if (cost === undefined || cost === null || cost === 0) return '-'
  if (cost < 0.000001) return '<$0.000001'
  return '$' + cost.toFixed(6)
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '-'
  if (ms >= 1000) return (ms / 1000).toFixed(2) + 's'
  return ms + 'ms'
}

function StatusBadge({ statusCode, isSuccess }: { statusCode: number; isSuccess: boolean }) {
  const bgColor = isSuccess ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${bgColor}`}>
      {statusCode}
    </span>
  )
}

function RequestHistoryPageOriginal() {
  const [data, setData] = useState<RequestHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const limit = 20

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getRequestHistory({ page, limit })
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load request history')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black -m-8 p-8">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-8">
        <header className="pt-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Request History</h1>
              <p className="text-slate-500 text-sm">View your API request logs and costs</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {data && data.requests.length === 0 ? (
          <div className="p-12 rounded-xl border border-white/5 bg-white/[0.02] text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No requests yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Start making API calls to see your request history here. Each request will show detailed token usage and cost information.
            </p>
          </div>
        ) : data && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-sm">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} of {data.total} requests
              </p>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            <div className="rounded-xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Model</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Input</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Output</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cache W/H</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.requests.map((req: RequestLogEntry) => (
                      <tr key={req._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-mono whitespace-nowrap">
                          {req.model || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right whitespace-nowrap">
                          {formatTokens(req.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right whitespace-nowrap">
                          {formatTokens(req.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right whitespace-nowrap">
                          {(req.cacheWriteTokens || 0) > 0 || (req.cacheHitTokens || 0) > 0
                            ? `${formatTokens(req.cacheWriteTokens)}/${formatTokens(req.cacheHitTokens)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-400 text-right whitespace-nowrap font-medium">
                          {formatCost(req.creditsCost)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <StatusBadge statusCode={req.statusCode} isSuccess={req.isSuccess} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right whitespace-nowrap">
                          {formatLatency(req.latencyMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (data.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-indigo-500 text-white'
                            : 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages || loading}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
*/
