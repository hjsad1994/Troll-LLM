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
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    iconKey: 'free',
    gradient: 'from-slate-500/20 to-slate-600/5'
  },
  dev: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
    iconKey: 'dev',
    gradient: 'from-violet-500/20 to-violet-600/5'
  },
  pro: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    iconKey: 'pro',
    gradient: 'from-amber-500/20 to-amber-600/5'
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
    <div className="min-h-screen bg-black -m-8 p-8">
      {/* Background Grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Users</h1>
              <p className="text-slate-500 text-sm">Manage user plans and permissions</p>
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
                  ? 'border-white/20 bg-white/[0.04] ring-1 ring-white/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planFilter === 'all' ? 'bg-white/10' : 'bg-white/5'}`}>
                  {Icons.users(`w-4 h-4 ${planFilter === 'all' ? 'text-white' : 'text-slate-400'}`)}
                </div>
                {planFilter === 'all' && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">All Users</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
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
                      ? `${config.border} bg-gradient-to-br ${config.gradient} ring-1 ${config.border}`
                      : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? config.bg : 'bg-white/5'}`}>
                      {IconComponent(`w-4 h-4 ${isActive ? config.text : 'text-slate-400'}`)}
                    </div>
                    {isActive && (
                      <span className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
                    )}
                  </div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">{plan}</p>
                  <p className={`text-2xl font-bold ${isActive ? config.text : 'text-white'}`}>
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
                ? 'border-white/20 bg-white/[0.06] text-white'
                : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-white'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              roleFilter === 'admin'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-white'
            }`}
          >
            {Icons.admin(`w-4 h-4 ${roleFilter === 'admin' ? 'text-rose-400' : 'text-slate-500'}`)}
            <span>Admin</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${roleFilter === 'admin' ? 'bg-rose-500/20' : 'bg-white/5'}`}>
              {roleStats.admin}
            </span>
          </button>
          <button
            onClick={() => setRoleFilter('user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              roleFilter === 'user'
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-white'
            }`}
          >
            {Icons.user(`w-4 h-4 ${roleFilter === 'user' ? 'text-sky-400' : 'text-slate-500'}`)}
            <span>User</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${roleFilter === 'user' ? 'bg-sky-500/20' : 'bg-white/5'}`}>
              {roleStats.user}
            </span>
          </button>
        </div>

        {/* Search & Active Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-slate-600 focus:outline-none focus:border-white/20 transition-colors text-sm"
            />
          </div>

          {/* Active Filter Badge */}
          {planFilter !== 'all' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${PLAN_CONFIG[planFilter].border} ${PLAN_CONFIG[planFilter].bg}`}>
              {Icons[PLAN_CONFIG[planFilter].iconKey](`w-4 h-4 ${PLAN_CONFIG[planFilter].text}`)}
              <span className={`text-sm font-medium ${PLAN_CONFIG[planFilter].text}`}>
                {planFilter.charAt(0).toUpperCase() + planFilter.slice(1)}
              </span>
              <button
                onClick={() => setPlanFilter('all')}
                className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {loading ? 'Loading...' : (
              <>
                Showing <span className="text-white font-medium">{filteredUsers.length}</span>
                {roleFilter !== 'all' && (
                  <span className={`ml-1 ${roleFilter === 'admin' ? 'text-rose-400' : 'text-sky-400'}`}>
                    {roleFilter}
                  </span>
                )}
                {planFilter !== 'all' && (
                  <span className={`ml-1 ${PLAN_CONFIG[planFilter].text}`}>
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
              className="text-slate-500 text-xs hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">User</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Plan</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Credits</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Created</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-slate-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">No users found</p>
                        <p className="text-slate-600 text-xs mt-1">
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
                          className="mt-2 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs hover:bg-white/5 hover:text-white transition-colors"
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
                  const monthlyTokensUsed = u.monthlyTokensUsed ?? 0
                  const username = u._id || 'unknown'
                  
                  return (
                    <tr key={username} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-medium">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{username}</p>
                            <p className="text-slate-600 text-xs">{u.role || 'user'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPlanStyle(plan)}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-emerald-400 font-medium text-sm">${(u.credits || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 text-xs hover:bg-white/5 hover:text-white transition-colors"
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
          <div className="rounded-xl border border-white/5 p-5 bg-white/[0.02]">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-4">Plan Limits</p>
            <div className="grid grid-cols-3 gap-4">
              {PLAN_ORDER.map((plan) => {
                const textColors: Record<string, string> = {
                  free: 'text-slate-400',
                  dev: 'text-violet-400',
                  pro: 'text-amber-400',
                }
                return (
                  <div key={plan} className="text-center">
                    <p className={`font-medium text-sm mb-1 ${textColors[plan] || 'text-white'}`}>
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {planLimits[plan].monthlyTokens === 0 
                        ? 'No access' 
                        : formatNumber(planLimits[plan].monthlyTokens) + '/mo'}
                    </p>
                    <p className="text-slate-600 text-xs">{planLimits[plan].rpm} RPM</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-sm w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-medium">Edit User</h3>
                <p className="text-slate-500 text-sm">{selectedUser._id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Credits Section */}
            <div className="mb-5 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
              <label className="block text-slate-500 text-xs uppercase tracking-wider mb-2">Credits ($)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCredits}
                  onChange={(e) => setEditCredits(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white text-sm focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={() => handleUpdateCredits(selectedUser._id)}
                  disabled={updating === selectedUser._id}
                  className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Plan Section */}
            <div className="mb-3">
              <label className="block text-slate-500 text-xs uppercase tracking-wider mb-2">Plan</label>
            </div>
            <div className="space-y-2 mb-5">
              {PLAN_ORDER.map((plan) => {
                const isCurrentPlan = (selectedUser.plan || 'free') === plan
                const planColors: Record<string, { text: string; border: string; bg: string }> = {
                  free: { text: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10' },
                  dev: { text: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10' },
                  pro: { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
                }
                const c = planColors[plan] || planColors.free
                return (
                  <button
                    key={plan}
                    onClick={() => !isCurrentPlan && handleUpdatePlan(selectedUser._id, plan)}
                    disabled={isCurrentPlan || updating === selectedUser._id}
                    className={`w-full p-3 rounded-lg border text-left transition-all text-sm ${
                      isCurrentPlan 
                        ? `${c.border} ${c.bg}` 
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    } ${updating === selectedUser._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isCurrentPlan ? c.text : 'text-slate-300'}`}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                          {isCurrentPlan && <span className="ml-2 text-slate-500 text-xs">(Current)</span>}
                        </p>
                        {planLimits && (
                          <p className="text-slate-500 text-xs mt-0.5">
                            {planLimits[plan].monthlyTokens === 0 
                              ? 'No access' 
                              : `${formatNumber(planLimits[plan].monthlyTokens)} tokens/mo`}
                            {planLimits[plan].rpm > 0 && ` · ${planLimits[plan].rpm} RPM`}
                          </p>
                        )}
                      </div>
                      {!isCurrentPlan && (
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-slate-600 text-xs text-center">
              Changes take effect immediately
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
