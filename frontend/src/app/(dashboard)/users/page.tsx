'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, updateUserCredits, addUserCredits, AdminUser } from '@/lib/api'
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

function getDaysRemaining(expiresAt: string | undefined, expiredText: string): string {
  if (!expiresAt) return '-'
  const now = new Date()
  const exp = new Date(expiresAt)
  const diff = exp.getTime() - now.getTime()
  if (diff <= 0) return expiredText
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `${days}d`
}

type RoleFilter = 'all' | 'admin' | 'user'
type StatusFilter = 'all' | 'active' | 'inactive'

export default function UsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<{ total: number; activeUsers: number } | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
        const hasCredits = (u.credits || 0) + (u.refCredits || 0) > 0
        return statusFilter === 'active' ? hasCredits : !hasCredits
      })
    }
    return result
  }, [users, roleFilter, statusFilter])

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

  const handleSetCredits = async (username: string) => {
    const amount = parseFloat(setAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert(t.users.validation.invalidAmount)
      return
    }
    setConfirmModal({ isOpen: true, type: 'set', username, amount })
  }

  const handleAddCredits = async (username: string) => {
    const amount = parseFloat(addAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert(t.users.validation.invalidAmount)
      return
    }
    setConfirmModal({ isOpen: true, type: 'add', username, amount })
  }

  const executeCreditsAction = async () => {
    if (!confirmModal) return
    const { type, username, amount } = confirmModal
    setConfirmModal(null)
    setUpdating(username)
    try {
      if (type === 'set') {
        await updateUserCredits(username, amount)
        setSetAmounts(prev => ({ ...prev, [username]: '' }))
      } else {
        await addUserCredits(username, amount)
        setAddAmounts(prev => ({ ...prev, [username]: '' }))
      }
      await loadUsers(search || undefined)
    } catch (err: any) {
      alert(err.message || (type === 'set' ? t.users.errors.setFailed : t.users.errors.addFailed))
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
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t.users.title}</h1>
              <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">{t.users.subtitle}</p>
            </div>
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t.users.totalUsers}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5">
              <p className="text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wider mb-1">{t.users.activeUsers}</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.activeUsers || 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t.users.inactive}</p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.total - (stats.activeUsers || 0)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.users.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-sm"
          >
            <option value="all">{t.users.allRoles}</option>
            <option value="admin">{t.users.admin} ({roleStats.admin})</option>
            <option value="user">{t.users.user} ({roleStats.user})</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-sm"
          >
            <option value="all">{t.users.allStatus}</option>
            <option value="active">{t.users.active}</option>
            <option value="inactive">{t.users.inactiveStatus}</option>
          </select>
        </div>

        <p className="text-slate-600 dark:text-slate-500 text-sm">
          {loading ? t.users.loading : `${filteredUsers.length} users`}
        </p>

        <div className="rounded-xl border border-slate-300 dark:border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/60">
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.user}</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.credits}</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.refCredits}</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.expires}</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.created}</th>
                <th className="text-right px-4 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-indigo-200 dark:border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                      <span className="text-slate-600 dark:text-slate-500 text-sm">{t.users.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {t.users.noUsersFound}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const username = u._id || 'unknown'
                  const credits = u.credits || 0
                  const refCredits = u.refCredits || 0
                  const isUpdating = updating === username

                  return (
                    <tr key={username} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            u.role === 'admin'
                              ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
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
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${credits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          ${credits.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${refCredits > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                          ${refCredits.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${getDaysRemaining(u.expiresAt, t.users.expired) === t.users.expired ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                          {getDaysRemaining(u.expiresAt, t.users.expired)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="$"
                              value={setAmounts[username] || ''}
                              onChange={(e) => setSetAmounts(prev => ({ ...prev, [username]: e.target.value }))}
                              className="w-16 px-2 py-1 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs focus:outline-none focus:border-amber-400"
                              disabled={isUpdating}
                            />
                            <button
                              onClick={() => handleSetCredits(username)}
                              disabled={isUpdating || !setAmounts[username]}
                              className="px-2 py-1 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
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
                              className="w-16 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs focus:outline-none focus:border-emerald-400"
                              disabled={isUpdating}
                            />
                            <button
                              onClick={() => handleAddCredits(username)}
                              disabled={isUpdating || !addAmounts[username]}
                              className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
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
                  {confirmModal.type === 'set' ? t.users.confirmModal.setTitle : t.users.confirmModal.addTitle}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.users.confirmModal.confirm}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t.users.confirmModal.user}</span>
                <span className="font-medium text-slate-900 dark:text-white">{confirmModal.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {confirmModal.type === 'set' ? t.users.confirmModal.newBalance : t.users.confirmModal.amountToAdd}
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

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {confirmModal.type === 'set'
                ? `${t.users.confirmModal.setDescription} ${confirmModal.username}.`
                : `${t.users.confirmModal.addDescription} $${confirmModal.amount.toFixed(2)} ${t.users.confirmModal.addDescriptionSuffix} ${confirmModal.username}.`
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                {t.users.confirmModal.cancel}
              </button>
              <button
                onClick={executeCreditsAction}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors ${
                  confirmModal.type === 'set'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {confirmModal.type === 'set' ? t.users.confirmModal.setCredits : t.users.confirmModal.addCredits}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
