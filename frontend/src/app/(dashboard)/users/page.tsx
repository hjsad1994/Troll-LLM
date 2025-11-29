'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { getAdminUsers, updateUserPlan, updateUserCredits, AdminUser, UserPlan, PlanLimits, formatNumber } from '@/lib/api'

const PLAN_ORDER: UserPlan[] = ['free', 'dev', 'pro']

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  dev: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  pro: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function getPlanStyle(plan: string) {
  return PLAN_STYLES[plan] || PLAN_STYLES.free
}

export default function UsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<{ total: number; byPlan: Record<string, number> } | null>(null)
  const [planLimits, setPlanLimits] = useState<Record<UserPlan, PlanLimits> | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editCredits, setEditCredits] = useState<number>(0)

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

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            {PLAN_ORDER.map((plan) => {
              const colors: Record<string, { border: string; text: string }> = {
                free: { border: 'border-slate-500/20', text: 'text-slate-400' },
                dev: { border: 'border-violet-500/20', text: 'text-violet-400' },
                pro: { border: 'border-amber-500/20', text: 'text-amber-400' },
              }
              const c = colors[plan] || colors.free
              return (
                <div key={plan} className={`p-4 rounded-xl border ${c.border} bg-white/[0.02]`}>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{plan}</p>
                  <p className={`text-2xl font-bold ${c.text}`}>{stats.byPlan[plan] || 0}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-slate-600 focus:outline-none focus:border-white/20 transition-colors text-sm"
          />
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500 text-sm">
                    {search ? 'No users found' : 'No users'}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const plan = u.plan || 'free'
                  const tokensUsed = u.tokensUsed ?? 0
                  const totalTokens = u.totalTokens ?? 0
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
                      {planLimits[plan].totalTokens === 0 
                        ? 'No access' 
                        : planLimits[plan].totalTokens === -1 
                          ? 'Unlimited' 
                          : formatNumber(planLimits[plan].totalTokens)}
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
                            {planLimits[plan].totalTokens === 0 
                              ? 'No access' 
                              : planLimits[plan].totalTokens === -1 
                                ? 'Unlimited' 
                                : `${formatNumber(planLimits[plan].totalTokens)} tokens`}
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
