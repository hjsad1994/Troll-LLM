'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { getAdminUsers, updateUserPlan, updateUserCredits, AdminUser, UserPlan, PlanLimits, formatNumber } from '@/lib/api'

const PLAN_ORDER: UserPlan[] = ['free', 'dev', 'pro']

// SVG Icon Components
const Icons = {
  users: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  free: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  dev: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  pro: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  admin: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  user: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
}

type PlanIconKey = 'free' | 'dev' | 'pro'

const PLAN_CONFIG: Record<string, {
  bg: string;
  text: string;
  border: string;
  iconKey: PlanIconKey;
  gradient: string;
}> = {
  free: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-500/20',
    iconKey: 'free',
    gradient: 'from-slate-200/80 dark:from-slate-500/20 to-slate-100/50 dark:to-slate-600/5'
  },
  dev: {
    bg: 'bg-violet-100 dark:bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-300 dark:border-violet-500/20',
    iconKey: 'dev',
    gradient: 'from-violet-200/80 dark:from-violet-500/20 to-violet-100/50 dark:to-violet-600/5'
  },
  pro: {
    bg: 'bg-amber-100 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-500/20',
    iconKey: 'pro',
    gradient: 'from-amber-200/80 dark:from-amber-500/20 to-amber-100/50 dark:to-amber-600/5'
  },
}

function getPlanStyle(plan: string) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free
  return `${config.bg} ${config.text} ${config.border}`
}

type PlanFilter = 'all' | UserPlan
type RoleFilter = 'all' | 'admin' | 'user'

export default function UsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<{ total: number; byPlan: Record<string, number> } | null>(null)
  const [planLimits, setPlanLimits] = useState<Record<UserPlan, PlanLimits> | null>(null)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editCredits, setEditCredits] = useState<number>(0)

  // Calculate role stats
  const roleStats = useMemo(() => {
    const adminCount = users.filter(u => u.role === 'admin').length
    const userCount = users.filter(u => u.role !== 'admin').length
    return { admin: adminCount, user: userCount }
  }, [users])

  // Filter users by selected plan and role
  const filteredUsers = useMemo(() => {
    let result = users
    if (planFilter !== 'all') {
      result = result.filter(u => (u.plan || 'free') === planFilter)
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin')
    }
    return result
  }, [users, planFilter, roleFilter])

  const loadUsers = useCallback(async (searchTerm?: string) => {
    try {
      setLoading(true)
      const data = await getAdminUsers(searchTerm)
      setUsers(data.users)
      setStats(data.stats)
      setPlanLimits(data.planLimits)
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

  const handleUpdatePlan = async (username: string, newPlan: UserPlan) => {
    setUpdating(username)
    try {
      await updateUserPlan(username, newPlan)
      await loadUsers(search || undefined)
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to update plan:', err)
      alert('Failed to update plan')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateCredits = async (username: string) => {
    setUpdating(username)
    try {
      await updateUserCredits(username, editCredits)
      await loadUsers(search || undefined)
    } catch (err) {
      console.error('Failed to update credits:', err)
      alert('Failed to update credits')
    } finally {
      setUpdating(null)
    }
  }

  const openEditModal = (u: AdminUser) => {
    setSelectedUser(u)
    setEditCredits(u.credits || 0)
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] -m-8 p-8">
      {/* Background Grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-300/20 dark:from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-200/30 dark:from-indigo-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-white/5 border border-indigo-300 dark:border-white/10 flex items-center justify-center shadow-sm dark:shadow-none">
              <svg className="w-5 h-5 text-indigo-600 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
              <p className="text-slate-600 dark:text-slate-500 text-sm">Manage user plans and permissions</p>
            </div>
          </div>
        </header>

        {/* Stats Cards - Clickable to filter */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Card */}
            <button
              onClick={() => setPlanFilter('all')}
              className={`p-4 rounded-xl border transition-all text-left group ${
                planFilter === 'all'
                  ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-white/[0.04] ring-1 ring-indigo-200 dark:ring-white/10 shadow-md dark:shadow-none'
                  : 'border-slate-300 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-indigo-300 dark:hover:border-white/10 hover:bg-indigo-50/50 dark:hover:bg-white/[0.03] shadow-sm dark:shadow-none'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planFilter === 'all' ? 'bg-indigo-100 dark:bg-white/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                  {Icons.users(`w-4 h-4 ${planFilter === 'all' ? 'text-indigo-600 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`)}
                </div>
                {planFilter === 'all' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-white animate-pulse" />
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-500 text-xs uppercase tracking-wider mb-0.5">All Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </button>

            {/* Plan Cards */}
            {PLAN_ORDER.map((plan) => {
              const config = PLAN_CONFIG[plan]
              const count = stats.byPlan[plan] || 0
              const isActive = planFilter === plan
              const IconComponent = Icons[config.iconKey]

              return (
                <button
                  key={plan}
                  onClick={() => setPlanFilter(plan)}
                  className={`p-4 rounded-xl border transition-all text-left group ${
                    isActive
                      ? `${config.border} bg-gradient-to-br ${config.gradient} ring-1 ${config.border} shadow-md dark:shadow-none`
                      : 'border-slate-300 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-slate-400 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03] shadow-sm dark:shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? config.bg : 'bg-slate-100 dark:bg-white/5'}`}>
                      {IconComponent(`w-4 h-4 ${isActive ? config.text : 'text-slate-600 dark:text-slate-400'}`)}
                    </div>
                    {isActive && (
                      <span className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-500 text-xs uppercase tracking-wider mb-0.5">{plan}</p>
                  <p className={`text-2xl font-bold ${isActive ? config.text : 'text-slate-900 dark:text-white'}`}>
                    {count}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Role Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              roleFilter === 'all'
                ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-white/[0.06] text-indigo-700 dark:text-white shadow-sm dark:shadow-none'
                : 'border-slate-300 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              roleFilter === 'admin'
                ? 'border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm dark:shadow-none'
                : 'border-slate-300 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none'
            }`}
          >
            {Icons.admin(`w-4 h-4 ${roleFilter === 'admin' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-500'}`)}
            <span>Admin</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleFilter === 'admin' ? 'bg-rose-200 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
              {roleStats.admin}
            </span>
          </button>
          <button
            onClick={() => setRoleFilter('user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              roleFilter === 'user'
                ? 'border-sky-400 dark:border-sky-500/30 bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 shadow-sm dark:shadow-none'
                : 'border-slate-300 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none'
            }`}
          >
            {Icons.user(`w-4 h-4 ${roleFilter === 'user' ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-500'}`)}
            <span>User</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleFilter === 'user' ? 'bg-sky-200 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
              {roleStats.user}
            </span>
          </button>
        </div>

        {/* Search & Active Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-400 dark:focus:border-white/20 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-transparent transition-all text-sm shadow-sm dark:shadow-none"
            />
          </div>

          {/* Active Filter Badge */}
          {planFilter !== 'all' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${PLAN_CONFIG[planFilter].border} ${PLAN_CONFIG[planFilter].bg} shadow-sm dark:shadow-none`}>
              {Icons[PLAN_CONFIG[planFilter].iconKey](`w-4 h-4 ${PLAN_CONFIG[planFilter].text}`)}
              <span className={`text-sm font-medium ${PLAN_CONFIG[planFilter].text}`}>
                {planFilter.charAt(0).toUpperCase() + planFilter.slice(1)}
              </span>
              <button
                onClick={() => setPlanFilter('all')}
                className="ml-1 p-0.5 rounded hover:bg-slate-300/50 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-slate-600 dark:text-slate-500 text-sm">
            {loading ? 'Loading...' : (
              <>
                Showing <span className="text-slate-900 dark:text-white font-semibold">{filteredUsers.length}</span>
                {roleFilter !== 'all' && (
                  <span className={`ml-1 font-medium ${roleFilter === 'admin' ? 'text-rose-700 dark:text-rose-400' : 'text-sky-700 dark:text-sky-400'}`}>
                    {roleFilter}
                  </span>
                )}
                {planFilter !== 'all' && (
                  <span className={`ml-1 font-medium ${PLAN_CONFIG[planFilter].text}`}>
                    {planFilter}
                  </span>
                )}
                {' '}user{filteredUsers.length !== 1 ? 's' : ''}
                {search && <span> matching "{search}"</span>}
              </>
            )}
          </p>
          {(planFilter !== 'all' || roleFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setPlanFilter('all')
                setRoleFilter('all')
                setSearch('')
              }}
              className="text-slate-600 dark:text-slate-500 text-xs font-medium hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-slate-300 dark:border-white/5 overflow-hidden shadow-md dark:shadow-none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">User</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Plan</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Credits</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Burned</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Input Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Output Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Created</th>
                <th className="text-right px-5 py-3 text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-indigo-200 dark:border-white/20 border-t-indigo-600 dark:border-t-white rounded-full animate-spin" />
                      <span className="text-slate-600 dark:text-slate-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-500 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-700 dark:text-slate-400 text-sm font-medium">No users found</p>
                        <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">
                          {planFilter !== 'all'
                            ? `No ${planFilter} users${search ? ` matching "${search}"` : ''}`
                            : search ? 'Try a different search term' : 'No users in the system'
                          }
                        </p>
                      </div>
                      {(planFilter !== 'all' || roleFilter !== 'all' || search) && (
                        <button
                          onClick={() => {
                            setPlanFilter('all')
                            setRoleFilter('all')
                            setSearch('')
                          }}
                          className="mt-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const plan = u.plan || 'free'
                  const tokensUsed = u.tokensUsed ?? 0
                  const inputTokens = u.totalInputTokens ?? 0
                  const outputTokens = u.totalOutputTokens ?? 0
                  const username = u._id || 'unknown'

                  return (
                    <tr key={username} className="border-b border-slate-100 dark:border-white/5 hover:bg-indigo-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-white/10 flex items-center justify-center text-indigo-700 dark:text-white text-sm font-semibold">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white text-sm font-medium">{username}</p>
                            <p className="text-slate-500 dark:text-slate-600 text-xs">{u.role || 'user'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getPlanStyle(plan)}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">${(u.credits || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-orange-700 dark:text-orange-400 font-semibold text-sm">${(u.creditsBurned || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-cyan-700 dark:text-cyan-400 font-medium text-sm">{formatNumber(inputTokens)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-purple-700 dark:text-purple-400 font-medium text-sm">{formatNumber(outputTokens)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-slate-900 dark:text-white font-medium text-sm">{formatNumber(tokensUsed)}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-white/5 hover:text-indigo-700 dark:hover:text-white hover:border-indigo-300 dark:hover:border-white/20 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Plan Reference */}
        {planLimits && (
          <div className="rounded-xl border border-slate-300 dark:border-white/5 p-5 bg-white dark:bg-white/[0.02] shadow-md dark:shadow-none">
            <p className="text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-4">Plan Limits</p>
            <div className="grid grid-cols-3 gap-4">
              {PLAN_ORDER.map((plan) => {
                const textColors: Record<string, string> = {
                  free: 'text-slate-700 dark:text-slate-400',
                  dev: 'text-violet-700 dark:text-violet-400',
                  pro: 'text-amber-700 dark:text-amber-400',
                }
                return (
                  <div key={plan} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-transparent">
                    <p className={`font-semibold text-sm mb-1 ${textColors[plan] || 'text-slate-900 dark:text-white'}`}>
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      {planLimits[plan].valueUsd === 0
                        ? 'No access'
                        : planLimits[plan].valueUsd + ' credits/mo'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-600 text-xs">{planLimits[plan].rpm} RPM</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-sm w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 shadow-2xl dark:shadow-none">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-slate-900 dark:text-white font-semibold">Edit User</h3>
                <p className="text-slate-600 dark:text-slate-500 text-sm">{selectedUser._id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Credits Section */}
            <div className="mb-5 p-3 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <label className="block text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Credits ($)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCredits}
                  onChange={(e) => setEditCredits(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-white/20 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-transparent"
                />
                <button
                  onClick={() => handleUpdateCredits(selectedUser._id)}
                  disabled={updating === selectedUser._id}
                  className="px-4 py-2 rounded-lg bg-emerald-500 dark:bg-emerald-500/20 border border-emerald-600 dark:border-emerald-500/30 text-white dark:text-emerald-400 text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Plan Section */}
            <div className="mb-3">
              <label className="block text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Plan</label>
            </div>
            <div className="space-y-2 mb-5">
              {PLAN_ORDER.map((plan) => {
                const isCurrentPlan = (selectedUser.plan || 'free') === plan
                const planColors: Record<string, { text: string; textLight: string; border: string; borderLight: string; bg: string; bgLight: string }> = {
                  free: { text: 'text-slate-400', textLight: 'text-slate-700', border: 'border-slate-500/30', borderLight: 'border-slate-400', bg: 'bg-slate-500/10', bgLight: 'bg-slate-100' },
                  dev: { text: 'text-violet-400', textLight: 'text-violet-700', border: 'border-violet-500/30', borderLight: 'border-violet-400', bg: 'bg-violet-500/10', bgLight: 'bg-violet-100' },
                  pro: { text: 'text-amber-400', textLight: 'text-amber-700', border: 'border-amber-500/30', borderLight: 'border-amber-400', bg: 'bg-amber-500/10', bgLight: 'bg-amber-100' },
                }
                const c = planColors[plan] || planColors.free
                return (
                  <button
                    key={plan}
                    onClick={() => !isCurrentPlan && handleUpdatePlan(selectedUser._id, plan)}
                    disabled={isCurrentPlan || updating === selectedUser._id}
                    className={`w-full p-3 rounded-lg border text-left transition-all text-sm ${
                      isCurrentPlan
                        ? `${c.borderLight} dark:${c.border} ${c.bgLight} dark:${c.bg}`
                        : 'border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    } ${updating === selectedUser._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${isCurrentPlan ? `${c.textLight} dark:${c.text}` : 'text-slate-700 dark:text-slate-300'}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                          {isCurrentPlan && <span className="ml-2 text-slate-500 dark:text-slate-500 text-xs font-normal">(Current)</span>}
                        </p>
                        {planLimits && (
                          <p className="text-slate-600 dark:text-slate-500 text-xs mt-0.5">
                            {planLimits[plan].valueUsd === 0
                              ? 'No access'
                              : `${planLimits[plan].valueUsd} credits/mo`}
                            {planLimits[plan].rpm > 0 && ` · ${planLimits[plan].rpm} RPM`}
                          </p>
                        )}
                      </div>
                      {!isCurrentPlan && (
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-slate-500 dark:text-slate-600 text-xs text-center">
              Changes take effect immediately
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
