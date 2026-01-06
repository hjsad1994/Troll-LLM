'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'

interface Payment {
  id: string
  userId: string
  username?: string
  credits: number
  amount: number
  currency: string
  status: 'pending' | 'success' | 'failed' | 'expired'
  orderCode?: string
  createdAt: string
  completedAt?: string
  profitVND?: number
}

interface PaymentStats {
  totalAmount: number
  successCount: number
  pendingCount: number
  failedCount: number
  totalProfit?: number
}

interface Pagination {
  page: number
  totalPages: number
  total: number
  limit: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Success' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pending' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
    expired: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: 'Expired' },
  }
  const config = statusConfig[status] || statusConfig.expired
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-current/20`}>
      {config.label}
    </span>
  )
}


export default function AdminBillingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({ totalAmount: 0, successCount: 0, pendingCount: 0, failedCount: 0 })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'all' | '1h' | '2h' | '3h' | '24h' | '7d' | '30d' | 'custom'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  const loadPayments = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      let url = `/admin/payments?page=${page}&limit=20&period=${period}`
      if (period === 'custom' && fromDate) {
        url += `&from=${fromDate}`
        if (toDate) {
          url += `&to=${toDate}`
        }
      }
      const resp = await fetchWithAuth(url)
      if (!resp.ok) throw new Error('Failed to load payments')

      const data = await resp.json()
      // Filter out pending payments
      const filteredPayments = data.payments.filter((p: Payment) => p.status !== 'pending')
      setPayments(filteredPayments)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to load payments:', err)
    } finally {
      setLoading(false)
    }
  }, [period, fromDate, toDate])

  useEffect(() => {
    if (isAdmin) {
      loadPayments(1)
    }
  }, [isAdmin, loadPayments])

  const handlePageChange = (newPage: number) => {
    loadPayments(newPage)
  }

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
              Billing
            </h1>
            <p className="text-gray-500 dark:text-neutral-500 mt-2">View all user payment orders</p>
          </div>
          <button
            onClick={() => loadPayments(pagination.page)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Refresh
          </button>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80">
            <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80">
            <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Successful</p>
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.successCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80">
            <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Failed/Expired</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{stats.failedCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80">
            <p className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">{formatCurrency(stats.totalProfit || 0)}</p>
          </div>
        </section>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-500 dark:text-neutral-500 text-sm mr-2">Period:</span>
          {(['all', '1h', '2h', '3h', '24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p)
                setFromDate('')
                setToDate('')
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-indigo-500 dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {p === 'all' ? 'All Time' : p === '1h' ? '1 Hour' : p === '2h' ? '2 Hours' : p === '3h' ? '3 Hours' : p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 'custom'
                ? 'bg-indigo-500 dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Date Range Filter */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-neutral-500">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-neutral-500">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/20"
              />
            </div>
            <button
              onClick={() => loadPayments(1)}
              disabled={!fromDate}
              className="px-4 py-2 rounded-lg bg-indigo-500 dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-indigo-600 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}

        {/* Payments Table */}
        <section className="rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-neutral-900/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Orders</h3>
            <span className="text-sm text-gray-500 dark:text-neutral-500">{pagination.total} total</span>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-neutral-500">Loading...</div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No payments found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-neutral-500 text-xs uppercase tracking-wider border-b border-gray-300 dark:border-white/10">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-right py-3 px-4">Credits</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-right py-3 px-4">Profit</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Order Code</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-neutral-800/50">
                      <td className="py-3 px-4">
                        <span className="text-gray-900 dark:text-white font-medium">{payment.username || payment.userId}</span>
                      </td>
                      <td className="py-3 px-4">
                        ${payment.credits}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${(payment.profitVND || 0) > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-neutral-500'}`}>
                          {(payment.profitVND || 0) > 0 ? formatCurrency(payment.profitVND || 0) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-white/10 px-2 py-1 rounded text-gray-700 dark:text-neutral-300">
                          {payment.orderCode || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-neutral-400">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-neutral-400">
                        {payment.completedAt ? formatDate(payment.completedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-300 dark:border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-neutral-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
