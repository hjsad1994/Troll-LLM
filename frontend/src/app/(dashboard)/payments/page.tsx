'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getUserPaymentStats,
  getPaymentHistoryPaginated,
  UserPaymentStats,
  PaymentHistoryPaginatedResponse,
  PaymentHistoryPaginatedItem
} from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

// Default translations fallback
const defaultTranslations = {
  title: 'Payment History',
  subtitle: 'View your payment history and statistics',
  stats: {
    totalCredits: 'Total Credits',
    totalPaid: 'Total Paid',
    totalOrders: 'Total Orders',
  },
  filters: {
    status: 'Status',
    all: 'All',
    success: 'Success',
    pending: 'Pending',
    failed: 'Failed',
    expired: 'Expired',
    from: 'From',
    to: 'To',
    clear: 'Clear',
  },
  table: {
    orderCode: 'Order Code',
    credits: 'Credits',
    amount: 'Amount',
    status: 'Status',
    created: 'Created',
    completed: 'Completed',
  },
  empty: {
    title: 'No payments yet',
    description: 'Your payment history will appear here after you make a purchase.',
  },
  pagination: {
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
  },
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' VND'
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    expired: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }

  const labels: Record<string, string> = {
    success: 'Success',
    pending: 'Pending',
    failed: 'Failed',
    expired: 'Expired',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.expired}`}>
      {labels[status] || status}
    </span>
  )
}

export default function PaymentHistoryPage() {
  const { t } = useLanguage()
  const pt = (t as any).paymentHistory || defaultTranslations

  const [stats, setStats] = useState<UserPaymentStats | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryPaginatedItem[]>([])
  const [allPaymentsForStats, setAllPaymentsForStats] = useState<PaymentHistoryPaginatedItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [statusFilter, setStatusFilter] = useState('success')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [statsLoading, setStatsLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate filtered stats from payments
  const filteredStats = useMemo(() => {
    // Only calculate when there's a date filter active
    if (!fromDate && !toDate) return null
    
    const totalCredits = allPaymentsForStats.reduce((sum, p) => sum + p.credits, 0)
    const totalVND = allPaymentsForStats.reduce((sum, p) => sum + p.amount, 0)
    const successCount = allPaymentsForStats.length
    return { totalCredits, totalVND, successCount }
  }, [allPaymentsForStats, fromDate, toDate])

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const data = await getUserPaymentStats()
      setStats(data)
    } catch (err: any) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadPayments = useCallback(async (pageNum: number = 1) => {
    try {
      setTableLoading(true)
      setError(null)
      
      // Load paginated data for table
      const data = await getPaymentHistoryPaginated({
        page: pageNum,
        limit: 20,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setPayments(data.payments)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)

      // Load all payments for stats calculation (when filtered)
      if (fromDate || toDate) {
        const allData = await getPaymentHistoryPaginated({
          page: 1,
          limit: 1000, // Get all for stats
          status: statusFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        })
        setAllPaymentsForStats(allData.payments)
      } else {
        setAllPaymentsForStats([])
      }
    } catch (err: any) {
      console.error('Failed to load payments:', err)
      setError(err.message || 'Failed to load payment history')
    } finally {
      setTableLoading(false)
    }
  }, [statusFilter, fromDate, toDate])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadPayments(1)
  }, [statusFilter, fromDate, toDate])

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
  }

  const handlePrevPage = () => {
    if (page > 1) {
      loadPayments(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      loadPayments(page + 1)
    }
  }

  const startIndex = (page - 1) * 20 + 1
  const endIndex = Math.min(page * 20, total)

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="opacity-0 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {pt.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {pt.subtitle}
          </p>
        </header>

        {/* Stats Cards - 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-0 animate-fade-in-up animation-delay-100">
          {/* Total Credits */}
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{pt.stats.totalCredits}</p>
            </div>
            {statsLoading || tableLoading ? (
              <div className="h-9 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${filteredStats?.totalCredits ?? stats?.totalCredits ?? 0}
              </p>
            )}
          </div>

          {/* Total VND */}
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{pt.stats.totalPaid}</p>
            </div>
            {statsLoading || tableLoading ? (
              <div className="h-9 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {formatVND(filteredStats?.totalVND ?? stats?.totalVND ?? 0)}
              </p>
            )}
          </div>

          {/* Total Orders */}
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{pt.stats.totalOrders || 'Tổng đơn hàng'}</p>
            </div>
            {statsLoading || tableLoading ? (
              <div className="h-9 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredStats?.successCount ?? stats?.successCount ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none opacity-0 animate-fade-in-up animation-delay-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg">
              <button
                onClick={handleClearFilters}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !fromDate && !toDate
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)
                  setFromDate(yesterday.toISOString().split('T')[0])
                  setToDate(today.toISOString().split('T')[0])
                }}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all"
              >
                24h
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const weekAgo = new Date(today)
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  setFromDate(weekAgo.toISOString().split('T')[0])
                  setToDate(today.toISOString().split('T')[0])
                }}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all"
              >
                7d
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const monthAgo = new Date(today)
                  monthAgo.setDate(monthAgo.getDate() - 30)
                  setFromDate(monthAgo.toISOString().split('T')[0])
                  setToDate(today.toISOString().split('T')[0])
                }}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all"
              >
                30d
              </button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-[140px] px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit-fields-wrapper]:flex [&::-webkit-datetime-edit-fields-wrapper]:items-center"
              />
              <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center">—</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-[140px] px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit-fields-wrapper]:flex [&::-webkit-datetime-edit-fields-wrapper]:items-center"
              />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none overflow-hidden opacity-0 animate-fade-in-up animation-delay-300">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => loadPayments(page)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : tableLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{pt.empty.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{pt.empty.description}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {pt.table.orderCode}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {pt.table.credits}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {pt.table.amount}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {pt.table.completed}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-slate-900 dark:text-white">
                            {payment.orderCode}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            ${payment.credits}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatVND(payment.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDateTime(payment.completedAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {startIndex}-{endIndex} {pt.pagination.of} {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pt.pagination.previous}
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {pt.pagination.page} {page} {pt.pagination.of} {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pt.pagination.next}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
