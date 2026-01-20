'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, updateUserCreditsNew, addUserCreditsNew, AdminUser } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function getDaysRemaining(purchasedAt: string | undefined, expiresAt: string | undefined, expiredText: string): { text: string; daysRemaining: number | null; subscriptionDays: number | null; status: 'expired' | 'warning' | 'ok' | 'none' } {
  if (!expiresAt || !purchasedAt) return { text: '-', daysRemaining: null, subscriptionDays: null, status: 'none' }

  const purchased = new Date(purchasedAt)
  const exp = new Date(expiresAt)
  const now = new Date()

  // Calculate total subscription days from purchasedAt to expiresAt
  const totalDiff = exp.getTime() - purchased.getTime()
  const subscriptionDays = Math.round(totalDiff / (1000 * 60 * 60 * 24))

  // Calculate remaining days
  const remainingDiff = exp.getTime() - now.getTime()
  if (remainingDiff <= 0) return { text: expiredText, daysRemaining: 0, subscriptionDays, status: 'expired' }

  const daysRemaining = Math.ceil(remainingDiff / (1000 * 60 * 60 * 24))
  const status = daysRemaining <= 3 ? 'warning' : 'ok'
  return { text: `${daysRemaining}/${subscriptionDays}`, daysRemaining, subscriptionDays, status }
}

function getExpiresColor(status: 'expired' | 'warning' | 'ok' | 'none'): string {
  switch (status) {
    case 'expired': return 'text-red-500'
    case 'warning': return 'text-amber-500 dark:text-amber-400'
    case 'ok': return 'text-emerald-600 dark:text-emerald-400'
    default: return 'text-slate-400'
  }
}

type RoleFilter = 'all' | 'admin' | 'user'
type StatusFilter = 'all' | 'active' | 'inactive'
type SortColumn = 'creditsNew' | 'creditsNewUsed' | 'expires' | 'lastLogin' | null
type SortDirection = 'asc' | 'desc'

export default function UsersNewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<{ total: number; activeUsers: number } | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [setAmounts, setSetAmounts] = useState<Record<string, string>>({})
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({})
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'set' | 'add'
    username: string
    amount: number
  } | null>(null)
  const [resetExpiration, setResetExpiration] = useState(false)

  const roleStats = useMemo(() => {
    const adminCount = users.filter(u => u.role === 'admin').length
    const userCount = users.filter(u => u.role !== 'admin').length
    return { admin: adminCount, user: userCount }
  }, [users])

  const filteredUsers = useMemo(() => {
    let result = users
    if (roleFilter !== 'all') {
      result = result.filter(u => roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin')
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => {
        const hasCredits = (u.creditsNew || 0) > 0
        return statusFilter === 'active' ? hasCredits : !hasCredits
      })
    }

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: number
        let bVal: number

        switch (sortColumn) {
          case 'creditsNew':
            aVal = a.creditsNew || 0
            bVal = b.creditsNew || 0
            break
          case 'creditsNewUsed':
            aVal = a.creditsNewUsed || 0
            bVal = b.creditsNewUsed || 0
            break
          case 'expires':
            const aExpires = getDaysRemaining(a.purchasedAtNew, a.expiresAtNew, '')
            const bExpires = getDaysRemaining(b.purchasedAtNew, b.expiresAtNew, '')
            aVal = aExpires.daysRemaining ?? (sortDirection === 'desc' ? -Infinity : Infinity)
            bVal = bExpires.daysRemaining ?? (sortDirection === 'desc' ? -Infinity : Infinity)
            break
          case 'lastLogin':
            aVal = a.lastActivity ? new Date(a.lastActivity).getTime() : (sortDirection === 'desc' ? -Infinity : Infinity)
            bVal = b.lastActivity ? new Date(b.lastActivity).getTime() : (sortDirection === 'desc' ? -Infinity : Infinity)
            break
          default:
            return 0
        }

        if (sortDirection === 'desc') {
          return bVal - aVal
        }
        return aVal - bVal
      })
    }

    return result
  }, [users, roleFilter, statusFilter, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const loadUsers = useCallback(async (searchTerm?: string) => {
    try {
      setLoading(true)
      const url = searchTerm ? `/admin/users?search=${encodeURIComponent(searchTerm)}` : '/admin/users'
      const resp = await fetchWithAuth(url)
      if (resp.ok) {
        const data = await resp.json()
        setUsers(data.users || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadUsers()
  }, [user, router, loadUsers])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(search || undefined)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, loadUsers])

  const handleSetCreditsNew = async (username: string) => {
    const amount = parseFloat(setAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert('Invalid amount. Must be a non-negative number.')
      return
    }
    setResetExpiration(false)
    setConfirmModal({ isOpen: true, type: 'set', username, amount })
  }

  const handleAddCreditsNew = async (username: string) => {
    const amount = parseFloat(addAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert('Invalid amount. Must be a positive number.')
      return
    }
    setResetExpiration(false)
    setConfirmModal({ isOpen: true, type: 'add', username, amount })
  }

  const executeCreditsNewAction = async () => {
    if (!confirmModal) return
    const { type, username, amount } = confirmModal
    setConfirmModal(null)
    setUpdating(username)
    try {
      if (type === 'set') {
        await updateUserCreditsNew(username, amount, resetExpiration)
        setSetAmounts(prev => ({ ...prev, [username]: '' }))
      } else {
        await addUserCreditsNew(username, amount, resetExpiration)
        setAddAmounts(prev => ({ ...prev, [username]: '' }))
      }
      await loadUsers(search || undefined)
    } catch (err: any) {
      alert(err.message || (type === 'set' ? 'Failed to set creditsNew' : 'Failed to add creditsNew'))
    } finally {
      setUpdating(null)
    }
  }

  if (user?.role !== 'admin') return null

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="relative max-w-6xl mx-auto space-y-6">
        <header className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                CreditsNew Management (OpenHands)
              </h1>
              <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">
                Manage OpenHands credits for all users
              </p>
            </div>
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === 'all'
                  ? 'border-purple-400 dark:border-purple-500 ring-2 ring-purple-400/20 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === 'active'
                  ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/20 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-emerald-300 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 hover:border-emerald-400 dark:hover:border-emerald-500/40'
              }`}
            >
              <p className="text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wider mb-1">Active (CreditsNew &gt; 0)</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {users.filter(u => (u.creditsNew || 0) > 0).length}
              </p>
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === 'inactive'
                  ? 'border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20 bg-slate-100 dark:bg-slate-500/10'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">No CreditsNew</p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                {users.filter(u => (u.creditsNew || 0) === 0).length}
              </p>
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
                roleFilter === 'admin'
                  ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-2 ring-rose-400/20'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Admin
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                roleFilter === 'admin'
                  ? 'bg-rose-200 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {roleStats.admin}
              </span>
            </button>
            <button
              onClick={() => setRoleFilter(roleFilter === 'user' ? 'all' : 'user')}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
                roleFilter === 'user'
                  ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-2 ring-purple-400/20'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              User
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                roleFilter === 'user'
                  ? 'bg-purple-200 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {roleStats.user}
              </span>
            </button>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-500 text-sm">
          {loading ? 'Loading...' : `${filteredUsers.length} users`}
        </p>

        {/* Desktop Table Layout */}
        <div className="rounded-xl border border-slate-300 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/60">
                <th className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">User</th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('creditsNew')}
                >
                  <span className="flex items-center gap-1">
                    CreditsNew
                    {sortColumn === 'creditsNew' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('creditsNewUsed')}
                >
                  <span className="flex items-center gap-1">
                    Used
                    {sortColumn === 'creditsNewUsed' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('expires')}
                >
                  <span className="flex items-center gap-1">
                    Expires
                    {sortColumn === 'expires' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('lastLogin')}
                >
                  <span className="flex items-center gap-1">
                    Last Activity
                    {sortColumn === 'lastLogin' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th className="text-right px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-purple-200 dark:border-purple-500/20 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
                      <span className="text-slate-600 dark:text-slate-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const username = u._id || 'unknown'
                  const creditsNew = u.creditsNew || 0
                  const creditsNewUsed = u.creditsNewUsed || 0
                  const isUpdating = updating === username

                  return (
                    <tr key={username} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400'
                          }`}>
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white text-sm font-medium">{username}</p>
                            <p className={`text-xs ${u.role === 'admin' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                              {u.role || 'user'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-sm ${creditsNew > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                          ${creditsNew.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-sm ${creditsNewUsed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                          ${creditsNewUsed.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const expires = getDaysRemaining(u.purchasedAtNew, u.expiresAtNew, 'Expired')
                          return (
                            <span className={`text-sm font-medium ${getExpiresColor(expires.status)}`}>
                              {expires.text}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatDateTime(u.lastActivity)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="$"
                              value={setAmounts[username] || ''}
                              onChange={(e) => setSetAmounts(prev => ({ ...prev, [username]: e.target.value }))}
                              className="w-14 px-1.5 py-1 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs focus:outline-none focus:border-amber-400"
                              disabled={isUpdating}
                            />
                            <button
                              onClick={() => handleSetCreditsNew(username)}
                              disabled={isUpdating || !setAmounts[username]}
                              className="px-1.5 py-1 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                            >
                              SET
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="$"
                              value={addAmounts[username] || ''}
                              onChange={(e) => setAddAmounts(prev => ({ ...prev, [username]: e.target.value }))}
                              className="w-14 px-1.5 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs focus:outline-none focus:border-emerald-400"
                              disabled={isUpdating}
                            />
                            <button
                              onClick={() => handleAddCreditsNew(username)}
                              disabled={isUpdating || !addAmounts[username]}
                              className="px-1.5 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              ADD
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                confirmModal.type === 'set'
                  ? 'bg-amber-100 dark:bg-amber-500/20'
                  : 'bg-emerald-100 dark:bg-emerald-500/20'
              }`}>
                {confirmModal.type === 'set' ? (
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {confirmModal.type === 'set' ? 'Set CreditsNew' : 'Add CreditsNew'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Please confirm this action
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">User</span>
                <span className="font-medium text-slate-900 dark:text-white">{confirmModal.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {confirmModal.type === 'set' ? 'New Balance' : 'Amount to Add'}
                </span>
                <span className={`text-xl font-bold ${
                  confirmModal.type === 'set'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  ${confirmModal.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {confirmModal.type === 'set'
                ? `This will set the CreditsNew balance to $${confirmModal.amount.toFixed(2)} for ${confirmModal.username}.`
                : `This will add $${confirmModal.amount.toFixed(2)} to the CreditsNew balance for ${confirmModal.username}.`
              }
            </p>

            <label className="flex items-center gap-3 p-3 mb-6 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={resetExpiration}
                onChange={(e) => setResetExpiration(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                Reset Expiration (7 days from now)
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeCreditsNewAction}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors ${
                  confirmModal.type === 'set'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {confirmModal.type === 'set' ? 'Set CreditsNew' : 'Add CreditsNew'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
