'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, updateUserCredits, addUserCredits, updateUserDiscordId, AdminUser } from '@/lib/api'
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
type SortColumn = 'credits' | 'burned' | 'expires' | 'lastLogin' | null
type SortDirection = 'asc' | 'desc'

export default function UsersPage() {
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
  const [discordIdModal, setDiscordIdModal] = useState<{
    isOpen: boolean
    username: string
    currentDiscordId: string | null
  } | null>(null)
  const [discordIdInput, setDiscordIdInput] = useState('')
  const [savingDiscordId, setSavingDiscordId] = useState(false)

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

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: number
        let bVal: number

        switch (sortColumn) {
          case 'credits':
            aVal = a.credits || 0
            bVal = b.credits || 0
            break
          case 'burned':
            aVal = a.creditsBurned || 0
            bVal = b.creditsBurned || 0
            break
          case 'expires':
            // Sort by daysRemaining, users with no expiration go to end when descending
            const aExpires = getDaysRemaining(a.purchasedAt, a.expiresAt, '')
            const bExpires = getDaysRemaining(b.purchasedAt, b.expiresAt, '')
            aVal = aExpires.daysRemaining ?? (sortDirection === 'desc' ? -Infinity : Infinity)
            bVal = bExpires.daysRemaining ?? (sortDirection === 'desc' ? -Infinity : Infinity)
            break
          case 'lastLogin':
            // Sort by lastActivity timestamp, users who never had activity go to end when descending
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
      // Toggle direction if clicking same column
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      // Set new column with default desc direction
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

  const handleSetCredits = async (username: string) => {
    const amount = parseFloat(setAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert(t.users.validation.invalidAmount)
      return
    }
    setResetExpiration(false)
    setConfirmModal({ isOpen: true, type: 'set', username, amount })
  }

  const handleAddCredits = async (username: string) => {
    const amount = parseFloat(addAmounts[username] || '0')
    if (isNaN(amount) || amount < 0) {
      alert(t.users.validation.invalidAmount)
      return
    }
    setResetExpiration(false)
    setConfirmModal({ isOpen: true, type: 'add', username, amount })
  }

  const executeCreditsAction = async () => {
    if (!confirmModal) return
    const { type, username, amount } = confirmModal
    setConfirmModal(null)
    setUpdating(username)
    try {
      if (type === 'set') {
        await updateUserCredits(username, amount, resetExpiration)
        setSetAmounts(prev => ({ ...prev, [username]: '' }))
      } else {
        await addUserCredits(username, amount, resetExpiration)
        setAddAmounts(prev => ({ ...prev, [username]: '' }))
      }
      await loadUsers(search || undefined)
    } catch (err: any) {
      alert(err.message || (type === 'set' ? t.users.errors.setFailed : t.users.errors.addFailed))
    } finally {
      setUpdating(null)
    }
  }

  const openDiscordIdModal = (username: string, currentDiscordId: string | null | undefined) => {
    setDiscordIdInput(currentDiscordId || '')
    setDiscordIdModal({ isOpen: true, username, currentDiscordId: currentDiscordId || null })
  }

  const handleSaveDiscordId = async () => {
    if (!discordIdModal) return
    const { username } = discordIdModal
    const trimmedInput = discordIdInput.trim()

    // Validate format if not empty
    if (trimmedInput && !/^\d{17,19}$/.test(trimmedInput)) {
      alert(t.users.discordIdEdit.invalidFormat)
      return
    }

    setSavingDiscordId(true)
    try {
      await updateUserDiscordId(username, trimmedInput || null)
      await loadUsers(search || undefined)
      setDiscordIdModal(null)
    } catch (err: any) {
      alert(err.message || t.users.discordIdEdit.error)
    } finally {
      setSavingDiscordId(false)
    }
  }

  const handleClearDiscordId = async () => {
    if (!discordIdModal) return
    const { username } = discordIdModal

    setSavingDiscordId(true)
    try {
      await updateUserDiscordId(username, null)
      await loadUsers(search || undefined)
      setDiscordIdModal(null)
    } catch (err: any) {
      alert(err.message || t.users.discordIdEdit.error)
    } finally {
      setSavingDiscordId(false)
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t.users.title}</h1>
                {/* LEGACY CREDITS INDICATOR */}
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  Legacy Credits
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">{t.users.subtitle}</p>
            </div>
          </div>
          {/* Legacy Notice Banner */}
          <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <p className="text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>This page manages legacy credits (OhMyGPT/Premium). For standard credits (creditsNew), use the Users-New page.</span>
            </p>
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === 'all'
                  ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/20 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t.users.totalUsers}</p>
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
              <p className="text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wider mb-1">{t.users.activeUsers}</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.activeUsers || 0}</p>
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === 'inactive'
                  ? 'border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20 bg-slate-100 dark:bg-slate-500/10'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t.users.inactive}</p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.total - (stats.activeUsers || 0)}</p>
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
              placeholder={t.users.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all text-sm"
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
              {t.users.admin}
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
                  ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-400/20'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {t.users.user}
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                roleFilter === 'user'
                  ? 'bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {roleStats.user}
              </span>
            </button>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-500 text-sm">
          {loading ? t.users.loading : `${filteredUsers.length} users`}
        </p>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border-2 border-indigo-200 dark:border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
              <span className="ml-3 text-slate-600 dark:text-slate-500 text-sm">{t.users.loading}</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">{t.users.noUsersFound}</div>
          ) : (
            filteredUsers.map((u) => {
              const username = u._id || 'unknown'
              const credits = u.credits || 0
              const refCredits = u.refCredits || 0
              const creditsBurned = u.creditsBurned || 0
              const isUpdating = updating === username
              const expires = getDaysRemaining(u.purchasedAt, u.expiresAt, t.users.expired)

              return (
                <div key={username} className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 p-4">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      u.role === 'admin'
                        ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 dark:text-white font-medium">{username}</p>
                      <p className={`text-xs ${u.role === 'admin' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                        {u.role || 'user'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getExpiresColor(expires.status)}`}>
                      {expires.text}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-xs text-slate-500 uppercase">{t.users.table.credits}</p>
                      <p className={`font-semibold text-sm ${credits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        ${credits.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-xs text-slate-500 uppercase">{t.users.table.refCredits}</p>
                      <p className={`font-semibold text-sm ${refCredits > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                        ${refCredits.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-xs text-slate-500 uppercase">{t.users.table.burned}</p>
                      <p className={`font-semibold text-sm ${creditsBurned > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                        ${creditsBurned.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Created Date */}
                  <p className="text-xs text-slate-500 mb-1">
                    {t.users.table.created}: {formatDateTime(u.createdAt)}
                  </p>

                  {/* Last Login */}
                  <p className="text-xs text-slate-500 mb-1">
                    {t.users.table.lastLogin}: {formatDateTime(u.lastActivity)}
                  </p>

                  {/* Discord ID */}
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-xs text-slate-500">
                      {t.users.table.discordId}: {u.discordId || t.users.discordIdEdit.notSet}
                    </p>
                    <button
                      onClick={() => openDiscordIdModal(username, u.discordId)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title={t.users.discordIdEdit.title}
                    >
                      <svg className="w-3 h-3 text-slate-500 hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="$"
                        value={setAmounts[username] || ''}
                        onChange={(e) => setSetAmounts(prev => ({ ...prev, [username]: e.target.value }))}
                        className="flex-1 min-w-0 px-3 py-2 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm focus:outline-none focus:border-amber-400"
                        disabled={isUpdating}
                      />
                      <button
                        onClick={() => handleSetCredits(username)}
                        disabled={isUpdating || !setAmounts[username]}
                        className="px-4 py-2 rounded border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        SET
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="$"
                        value={addAmounts[username] || ''}
                        onChange={(e) => setAddAmounts(prev => ({ ...prev, [username]: e.target.value }))}
                        className="flex-1 min-w-0 px-3 py-2 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm focus:outline-none focus:border-emerald-400"
                        disabled={isUpdating}
                      />
                      <button
                        onClick={() => handleAddCredits(username)}
                        disabled={isUpdating || !addAmounts[username]}
                        className="px-4 py-2 rounded border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden md:block rounded-xl border border-slate-300 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/60">
                <th className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.user}</th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('credits')}
                >
                  <span className="flex items-center gap-1">
                    {t.users.table.credits}
                    {sortColumn === 'credits' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.refCredits}</th>
                <th
                  className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('burned')}
                >
                  <span className="flex items-center gap-1">
                    {t.users.table.burned}
                    {sortColumn === 'burned' && (
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
                    {t.users.table.expires}
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
                    {t.users.table.lastLogin}
                    {sortColumn === 'lastLogin' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
                      </svg>
                    )}
                  </span>
                </th>
                <th className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.created}</th>
                <th className="text-left px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.discordId}</th>
                <th className="text-right px-3 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">{t.users.table.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-indigo-200 dark:border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                      <span className="text-slate-600 dark:text-slate-500 text-sm">{t.users.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    {t.users.noUsersFound}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const username = u._id || 'unknown'
                  const credits = u.credits || 0
                  const refCredits = u.refCredits || 0
                  const creditsBurned = u.creditsBurned || 0
                  const isUpdating = updating === username

                  return (
                    <tr key={username} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
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
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-sm ${credits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          ${credits.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-sm ${refCredits > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                          ${refCredits.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-sm ${creditsBurned > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                          ${creditsBurned.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const expires = getDaysRemaining(u.purchasedAt, u.expiresAt, t.users.expired)
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
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[100px]" title={u.discordId || ''}>
                            {u.discordId || <span className="text-slate-400 italic text-xs">{t.users.discordIdEdit.notSet}</span>}
                          </span>
                          <button
                            onClick={() => openDiscordIdModal(username, u.discordId)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                            title={t.users.discordIdEdit.title}
                          >
                            <svg className="w-3 h-3 text-slate-500 hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
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
                              onClick={() => handleSetCredits(username)}
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
                              onClick={() => handleAddCredits(username)}
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

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {confirmModal.type === 'set'
                ? `${t.users.confirmModal.setDescription} ${confirmModal.username}.`
                : `${t.users.confirmModal.addDescription} $${confirmModal.amount.toFixed(2)} ${t.users.confirmModal.addDescriptionSuffix} ${confirmModal.username}.`
              }
            </p>

            <label className="flex items-center gap-3 p-3 mb-6 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={resetExpiration}
                onChange={(e) => setResetExpiration(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300 text-sm">
                {t.users.resetExpiration || 'Reset Expiration'}
              </span>
            </label>

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

      {/* Discord ID Edit Modal */}
      {discordIdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !savingDiscordId && setDiscordIdModal(null)}
          />
          <div className="relative bg-white dark:bg-[#313338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1e1f22] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header with Discord branding */}
            <div className="bg-gradient-to-r from-[#5865F2] to-[#7289da] px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t.users.discordIdEdit.title}
                  </h3>
                  <p className="text-white/80 text-sm font-medium">
                    @{discordIdModal.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {/* Current Discord ID display */}
              {discordIdModal.currentDiscordId && (
                <div className="mb-4 p-3 rounded-lg bg-slate-100 dark:bg-[#2b2d31] border border-slate-200 dark:border-[#1e1f22]">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Discord ID</p>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-200">{discordIdModal.currentDiscordId}</p>
                </div>
              )}

              {/* Input field */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={discordIdInput}
                  onChange={(e) => setDiscordIdInput(e.target.value)}
                  placeholder={t.users.discordIdEdit.placeholder}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-[#1e1f22] bg-slate-50 dark:bg-[#1e1f22] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5865F2] focus:ring-4 focus:ring-[#5865F2]/20 transition-all font-mono"
                  disabled={savingDiscordId}
                  autoFocus
                />
              </div>

              {/* Helper text */}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Discord ID is a 17-19 digit number
              </p>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#2b2d31] border-t border-slate-200 dark:border-[#1e1f22] flex items-center justify-between gap-3">
              <button
                onClick={() => setDiscordIdModal(null)}
                disabled={savingDiscordId}
                className="px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-[#404249] transition-colors disabled:opacity-50"
              >
                {t.users.discordIdEdit.cancel}
              </button>
              <div className="flex items-center gap-2">
                {discordIdModal.currentDiscordId && (
                  <button
                    onClick={handleClearDiscordId}
                    disabled={savingDiscordId}
                    className="px-4 py-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {t.users.discordIdEdit.clear}
                  </button>
                )}
                <button
                  onClick={handleSaveDiscordId}
                  disabled={savingDiscordId}
                  className="px-5 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingDiscordId ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.users.discordIdEdit.saving}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t.users.discordIdEdit.save}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
