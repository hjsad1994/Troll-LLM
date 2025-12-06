'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { getAdminUsers, updateUserPlan, updateUserCredits, updateUserRefCredits, addUserCredits, addUserRefCredits, AdminUser, UserPlan, PlanLimits, formatNumber } from '@/lib/api'

const PLAN_ORDER: UserPlan[] = ['free', 'dev', 'pro', 'pro-troll']

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
  'pro-troll': (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
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

type PlanIconKey = 'free' | 'dev' | 'pro' | 'pro-troll'

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
    bg: 'bg-indigo-100 dark:bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-300 dark:border-indigo-500/20',
    iconKey: 'pro',
    gradient: 'from-indigo-200/80 dark:from-indigo-500/20 to-indigo-100/50 dark:to-indigo-600/5'
  },
  'pro-troll': {
    bg: 'bg-amber-100 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-500/20',
    iconKey: 'pro-troll',
    gradient: 'from-amber-200/80 dark:from-amber-500/20 to-amber-100/50 dark:to-amber-600/5'
  },
}

function getPlanStyle(plan: string) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free
  return `${config.bg} ${config.text} ${config.border}`
}

function formatPlanName(plan: string): string {
  if (plan === 'pro-troll') return 'Pro Troll'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
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
  const [editRefCredits, setEditRefCredits] = useState<number>(0)
  const [addCreditsAmount, setAddCreditsAmount] = useState<number>(0)
  const [addRefCreditsAmount, setAddRefCreditsAmount] = useState<number>(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickAction, setQuickAction] = useState<{ user: AdminUser; type: 'add' | 'set' } | null>(null)
  const [quickAmount, setQuickAmount] = useState<number>(0)

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
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, credits: editCredits })
      }
    } catch (err) {
      console.error('Failed to update credits:', err)
      alert('Failed to update credits')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateRefCredits = async (username: string) => {
    setUpdating(username)
    try {
      await updateUserRefCredits(username, editRefCredits)
      await loadUsers(search || undefined)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, refCredits: editRefCredits })
      }
    } catch (err) {
      console.error('Failed to update refCredits:', err)
      alert('Failed to update refCredits')
    } finally {
      setUpdating(null)
    }
  }

  const handleAddCredits = async (username: string) => {
    if (addCreditsAmount <= 0) {
      alert('Amount must be greater than 0')
      return
    }
    setUpdating(username)
    try {
      await addUserCredits(username, addCreditsAmount)
      await loadUsers(search || undefined)
      const newCredits = (selectedUser?.credits || 0) + addCreditsAmount
      setEditCredits(newCredits)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, credits: newCredits })
      }
      setAddCreditsAmount(0)
    } catch (err) {
      console.error('Failed to add credits:', err)
      alert('Failed to add credits')
    } finally {
      setUpdating(null)
    }
  }

  const handleAddRefCredits = async (username: string) => {
    if (addRefCreditsAmount <= 0) {
      alert('Amount must be greater than 0')
      return
    }
    setUpdating(username)
    try {
      await addUserRefCredits(username, addRefCreditsAmount)
      await loadUsers(search || undefined)
      const newRefCredits = (selectedUser?.refCredits || 0) + addRefCreditsAmount
      setEditRefCredits(newRefCredits)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, refCredits: newRefCredits })
      }
      setAddRefCreditsAmount(0)
    } catch (err) {
      console.error('Failed to add refCredits:', err)
      alert('Failed to add refCredits')
    } finally {
      setUpdating(null)
    }
  }

  const openEditModal = (u: AdminUser) => {
    setSelectedUser(u)
    setEditCredits(u.credits || 0)
    setEditRefCredits(u.refCredits || 0)
  }

  const openQuickAction = (u: AdminUser, type: 'add' | 'set') => {
    setQuickAction({ user: u, type })
    setQuickAmount(type === 'set' ? (u.credits || 0) : 0)
  }

  const handleQuickAction = async () => {
    if (!quickAction) return
    const { user: u, type } = quickAction
    setUpdating(u._id)
    try {
      if (type === 'add') {
        if (quickAmount <= 0) {
          alert('Amount must be greater than 0')
          return
        }
        await addUserCredits(u._id, quickAmount)
      } else {
        await updateUserCredits(u._id, quickAmount)
      }
      await loadUsers(search || undefined)
      setQuickAction(null)
      setQuickAmount(0)
    } catch (err) {
      console.error(`Failed to ${type} credits:`, err)
      alert(`Failed to ${type} credits`)
    } finally {
      setUpdating(null)
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="relative max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-white/5 border border-indigo-300 dark:border-white/10 flex items-center justify-center shadow-sm dark:shadow-none">
                <svg className="w-5 h-5 text-indigo-600 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
                <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">Manage user plans and permissions</p>
              </div>
            </div>
            {/* Mobile Filter Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 text-sm font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(planFilter !== 'all' || roleFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Filter Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-[#0a0a0a] border-l border-slate-200 dark:border-white/10 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 px-4 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Plan Filter in Sidebar */}
                {stats && (
                  <div>
                    <p className="text-slate-600 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3">Filter by Plan</p>
                    <div className="space-y-2">
                      {/* All Users */}
                      <button
                        onClick={() => { setPlanFilter('all'); setSidebarOpen(false); }}
                        className={`w-full p-3 rounded-xl border transition-all text-left ${
                          planFilter === 'all'
                            ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-indigo-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planFilter === 'all' ? 'bg-indigo-100 dark:bg-white/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                              {Icons.users(`w-4 h-4 ${planFilter === 'all' ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}
                            </div>
                            <span className={`font-medium ${planFilter === 'all' ? 'text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>All Users</span>
                          </div>
                          <span className={`text-lg font-bold ${planFilter === 'all' ? 'text-indigo-600 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{stats.total}</span>
                        </div>
                      </button>

                      {/* Plan Buttons */}
                      {PLAN_ORDER.map((plan) => {
                        const config = PLAN_CONFIG[plan]
                        const count = stats.byPlan[plan] || 0
                        const isActive = planFilter === plan
                        const IconComponent = Icons[config.iconKey]

                        return (
                          <button
                            key={plan}
                            onClick={() => { setPlanFilter(plan); setSidebarOpen(false); }}
                            className={`w-full p-3 rounded-xl border transition-all text-left ${
                              isActive
                                ? `${config.border} bg-gradient-to-br ${config.gradient} ring-1 ${config.border}`
                                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? config.bg : 'bg-slate-100 dark:bg-white/5'}`}>
                                  {IconComponent(`w-4 h-4 ${isActive ? config.text : 'text-slate-500 dark:text-slate-400'}`)}
                                </div>
                                <span className={`font-medium ${isActive ? config.text : 'text-slate-700 dark:text-slate-300'}`}>{formatPlanName(plan)}</span>
                              </div>
                              <span className={`text-lg font-bold ${isActive ? config.text : 'text-slate-600 dark:text-slate-400'}`}>{count}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Role Filter in Sidebar */}
                <div>
                  <p className="text-slate-600 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3">Filter by Role</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setRoleFilter('all'); setSidebarOpen(false); }}
                      className={`w-full p-3 rounded-xl border transition-all text-left ${
                        roleFilter === 'all'
                          ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-white/5'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span className={`font-medium ${roleFilter === 'all' ? 'text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>All Roles</span>
                    </button>
                    <button
                      onClick={() => { setRoleFilter('admin'); setSidebarOpen(false); }}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
                        roleFilter === 'admin'
                          ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icons.admin(`w-4 h-4 ${roleFilter === 'admin' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`)}
                        <span className={`font-medium ${roleFilter === 'admin' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>Admin</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleFilter === 'admin' ? 'bg-rose-200 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
                        {roleStats.admin}
                      </span>
                    </button>
                    <button
                      onClick={() => { setRoleFilter('user'); setSidebarOpen(false); }}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
                        roleFilter === 'user'
                          ? 'border-sky-300 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icons.user(`w-4 h-4 ${roleFilter === 'user' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`)}
                        <span className={`font-medium ${roleFilter === 'user' ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>User</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleFilter === 'user' ? 'bg-sky-200 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
                        {roleStats.user}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Clear Filters */}
                {(planFilter !== 'all' || roleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setPlanFilter('all')
                      setRoleFilter('all')
                      setSidebarOpen(false)
                    }}
                    className="w-full py-3 rounded-xl border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Hidden on mobile, shown on lg+ */}
        {stats && (
          <div className="hidden lg:grid grid-cols-5 gap-3">
            {/* Total Card */}
            <button
              onClick={() => setPlanFilter('all')}
              className={`p-4 rounded-xl border transition-all text-left group backdrop-blur-sm ${
                planFilter === 'all'
                  ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-black/60 ring-1 ring-indigo-200 dark:ring-white/10 shadow-md'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-indigo-300 dark:hover:border-white/20 hover:bg-indigo-50/50 dark:hover:bg-black/60 shadow-sm'
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
                  className={`p-4 rounded-xl border transition-all text-left group backdrop-blur-sm ${
                    isActive
                      ? `${config.border} bg-gradient-to-br ${config.gradient} dark:bg-black/60 ring-1 ${config.border} shadow-md`
                      : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-black/60 shadow-sm'
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
                  <p className="text-slate-600 dark:text-slate-500 text-xs uppercase tracking-wider mb-0.5">{formatPlanName(plan)}</p>
                  <p className={`text-2xl font-bold ${isActive ? config.text : 'text-slate-900 dark:text-white'}`}>
                    {count}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Role Filter - Hidden on mobile, shown on lg+ */}
        <div className="hidden lg:flex gap-2">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all backdrop-blur-sm ${
              roleFilter === 'all'
                ? 'border-indigo-300 dark:border-white/20 bg-indigo-50 dark:bg-black/60 text-indigo-700 dark:text-white shadow-sm'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all backdrop-blur-sm ${
              roleFilter === 'admin'
                ? 'border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-black/60 text-rose-700 dark:text-rose-400 shadow-sm'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm'
            }`}
          >
            {Icons.admin(`w-4 h-4 ${roleFilter === 'admin' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-500'}`)}
            <span>Admin</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleFilter === 'admin' ? 'bg-rose-200 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
              {roleStats.admin}
            </span>
          </button>
          <button
            onClick={() => setRoleFilter('user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all backdrop-blur-sm ${
              roleFilter === 'user'
                ? 'border-sky-400 dark:border-sky-500/30 bg-sky-100 dark:bg-black/60 text-sky-700 dark:text-sky-400 shadow-sm'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm'
            }`}
          >
            {Icons.user(`w-4 h-4 ${roleFilter === 'user' ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-500'}`)}
            <span>User</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleFilter === 'user' ? 'bg-sky-200 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
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
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-400 dark:focus:border-white/20 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-transparent transition-all text-sm shadow-sm"
            />
          </div>

          {/* Active Filter Badges - Mobile */}
          <div className="flex flex-wrap gap-2 lg:hidden">
            {planFilter !== 'all' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm ${PLAN_CONFIG[planFilter].border} ${PLAN_CONFIG[planFilter].bg} dark:bg-black/40 shadow-sm`}>
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
            {roleFilter !== 'all' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm shadow-sm ${
                roleFilter === 'admin'
                  ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
                  : 'border-sky-300 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10'
              }`}>
                {roleFilter === 'admin'
                  ? Icons.admin(`w-4 h-4 text-rose-600 dark:text-rose-400`)
                  : Icons.user(`w-4 h-4 text-sky-600 dark:text-sky-400`)
                }
                <span className={`text-sm font-medium ${roleFilter === 'admin' ? 'text-rose-700 dark:text-rose-400' : 'text-sky-700 dark:text-sky-400'}`}>
                  {roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                </span>
                <button
                  onClick={() => setRoleFilter('all')}
                  className="ml-1 p-0.5 rounded hover:bg-slate-300/50 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Active Filter Badge - Desktop */}
          <div className="hidden lg:flex gap-2">
          {planFilter !== 'all' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm ${PLAN_CONFIG[planFilter].border} ${PLAN_CONFIG[planFilter].bg} dark:bg-black/40 shadow-sm`}>
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
        </div>

        {/* Results Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

        {/* Users Table - Desktop */}
        <div className="hidden lg:block rounded-xl border border-slate-300 dark:border-white/10 overflow-hidden shadow-md backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/60">
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">User</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Plan</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Credits</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Ref Credits</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Burned</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Input Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Output Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Tokens</th>
                <th className="text-left px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Created</th>
                <th className="text-right px-5 py-3 text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-indigo-200 dark:border-white/20 border-t-indigo-600 dark:border-t-white rounded-full animate-spin" />
                      <span className="text-slate-600 dark:text-slate-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
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
                    <tr key={username} className="border-b border-slate-100 dark:border-white/10 hover:bg-indigo-50/50 dark:hover:bg-white/5 transition-colors">
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
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getPlanStyle(plan)}`}>
                          {formatPlanName(plan)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">${(u.credits || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-pink-700 dark:text-pink-400 font-semibold text-sm">${(u.refCredits || 0).toFixed(2)}</span>
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
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-sm">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openQuickAction(u, 'add')}
                            className="px-2 py-1 rounded border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => openQuickAction(u, 'set')}
                            className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                          >
                            Set
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-white/5 hover:text-indigo-700 dark:hover:text-white hover:border-indigo-300 dark:hover:border-white/20 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Users Cards - Mobile */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-200 dark:border-white/20 border-t-indigo-600 dark:border-t-white rounded-full animate-spin" />
                <span className="text-slate-600 dark:text-slate-500 text-sm">Loading...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-500 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-700 dark:text-slate-400 text-sm font-medium">No users found</p>
              <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">
                {planFilter !== 'all'
                  ? `No ${planFilter} users${search ? ` matching "${search}"` : ''}`
                  : search ? 'Try a different search term' : 'No users in the system'
                }
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const plan = u.plan || 'free'
              const tokensUsed = u.tokensUsed ?? 0
              const inputTokens = u.totalInputTokens ?? 0
              const outputTokens = u.totalOutputTokens ?? 0
              const username = u._id || 'unknown'

              return (
                <div key={username} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm shadow-sm">
                  {/* User Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-white/10 flex items-center justify-center text-indigo-700 dark:text-white text-sm font-semibold">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white text-sm font-medium">{username}</p>
                        <p className="text-slate-500 dark:text-slate-600 text-xs">{u.role || 'user'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getPlanStyle(plan)}`}>
                      {formatPlanName(plan)}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Credits</p>
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">${(u.credits || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Ref Credits</p>
                      <p className="text-pink-700 dark:text-pink-400 font-semibold text-sm">${(u.refCredits || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Burned</p>
                      <p className="text-orange-700 dark:text-orange-400 font-semibold text-sm">${(u.creditsBurned || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Input Tokens</p>
                      <p className="text-cyan-700 dark:text-cyan-400 font-medium text-sm">{formatNumber(inputTokens)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Output Tokens</p>
                      <p className="text-purple-700 dark:text-purple-400 font-medium text-sm">{formatNumber(outputTokens)}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                    <p className="text-slate-500 dark:text-slate-600 text-xs">
                      Created {formatDateTime(u.createdAt)}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openQuickAction(u, 'add')}
                        className="px-2 py-1 rounded border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => openQuickAction(u, 'set')}
                        className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-white/5 hover:text-indigo-700 dark:hover:text-white hover:border-indigo-300 dark:hover:border-white/20 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Plan Reference */}
        {planLimits && (
          <div className="rounded-xl border border-slate-300 dark:border-white/10 p-4 sm:p-5 bg-white dark:bg-black/40 backdrop-blur-sm shadow-md">
            <p className="text-slate-700 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3 sm:mb-4">Plan Limits</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {PLAN_ORDER.map((plan) => {
                const textColors: Record<string, string> = {
                  free: 'text-slate-700 dark:text-slate-400',
                  dev: 'text-violet-700 dark:text-violet-400',
                  pro: 'text-amber-700 dark:text-amber-400',
                }
                return (
                  <div key={plan} className="text-center p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-transparent">
                    <p className={`font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 ${textColors[plan] || 'text-slate-900 dark:text-white'}`}>
                      {formatPlanName(plan)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">
                      {planLimits[plan].valueUsd === 0
                        ? 'No access'
                        : planLimits[plan].valueUsd + ' credits/mo'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-600 text-[10px] sm:text-xs">{planLimits[plan].rpm} RPM</p>
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
          <div className="max-w-sm w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 shadow-2xl dark:shadow-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-slate-900 dark:text-white font-semibold truncate">Edit User</h3>
                <p className="text-slate-600 dark:text-slate-500 text-sm truncate">{selectedUser._id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors ml-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Credits */}
            <div className="mb-3 p-3 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <label className="block text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">
                Credits (${(selectedUser.credits || 0).toFixed(2)})
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCredits}
                  onChange={(e) => setEditCredits(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-400 dark:focus:border-white/20 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-transparent"
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

            {/* Ref Credits */}
            <div className="mb-4 sm:mb-5 p-3 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <label className="block text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">
                Ref Credits (${(selectedUser.refCredits || 0).toFixed(2)})
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRefCredits}
                  onChange={(e) => setEditRefCredits(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-pink-400 dark:focus:border-white/20 focus:ring-2 focus:ring-pink-100 dark:focus:ring-transparent"
                />
                <button
                  onClick={() => handleUpdateRefCredits(selectedUser._id)}
                  disabled={updating === selectedUser._id}
                  className="px-4 py-2 rounded-lg bg-pink-500 dark:bg-pink-500/20 border border-pink-600 dark:border-pink-500/30 text-white dark:text-pink-400 text-sm font-medium hover:bg-pink-600 dark:hover:bg-pink-500/30 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Plan Section */}
            <div className="mb-2 sm:mb-3">
              <label className="block text-slate-700 dark:text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">Plan</label>
            </div>
            <div className="space-y-2 mb-4 sm:mb-5">
              {PLAN_ORDER.map((plan) => {
                const isCurrentPlan = (selectedUser.plan || 'free') === plan
                const planColors: Record<string, { text: string; textLight: string; border: string; borderLight: string; bg: string; bgLight: string }> = {
                  free: { text: 'text-slate-400', textLight: 'text-slate-700', border: 'border-slate-500/30', borderLight: 'border-slate-400', bg: 'bg-slate-500/10', bgLight: 'bg-slate-100' },
                  dev: { text: 'text-violet-400', textLight: 'text-violet-700', border: 'border-violet-500/30', borderLight: 'border-violet-400', bg: 'bg-violet-500/10', bgLight: 'bg-violet-100' },
                  pro: { text: 'text-indigo-400', textLight: 'text-indigo-700', border: 'border-indigo-500/30', borderLight: 'border-indigo-400', bg: 'bg-indigo-500/10', bgLight: 'bg-indigo-100' },
                  'pro-troll': { text: 'text-amber-400', textLight: 'text-amber-700', border: 'border-amber-500/30', borderLight: 'border-amber-400', bg: 'bg-amber-500/10', bgLight: 'bg-amber-100' },
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
                          {formatPlanName(plan)}
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

      {/* Quick Action Modal */}
      {quickAction && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-xs w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 shadow-2xl dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`font-semibold ${quickAction.type === 'add' ? 'text-cyan-700 dark:text-cyan-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {quickAction.type === 'add' ? 'Add Credits' : 'Set Credits'}
                </h3>
                <p className="text-slate-600 dark:text-slate-500 text-sm">{quickAction.user._id}</p>
              </div>
              <button
                onClick={() => { setQuickAction(null); setQuickAmount(0) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-white/5 text-center">
              <p className="text-slate-500 dark:text-slate-500 text-xs mb-1">Current Credits</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">${(quickAction.user.credits || 0).toFixed(2)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-2">
                {quickAction.type === 'add' ? 'Amount to Add' : 'New Value'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(parseFloat(e.target.value) || 0)}
                  autoFocus
                  style={{ MozAppearance: 'textfield' }}
                  className={`w-full pl-7 pr-4 py-3 rounded-lg border text-lg font-semibold text-slate-900 dark:text-white bg-white dark:bg-white/[0.02] focus:outline-none focus:ring-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    quickAction.type === 'add'
                      ? 'border-cyan-300 dark:border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-100 dark:focus:ring-cyan-500/10'
                      : 'border-emerald-300 dark:border-emerald-500/30 focus:border-emerald-400 focus:ring-emerald-100 dark:focus:ring-emerald-500/10'
                  }`}
                />
              </div>
              {quickAction.type === 'add' && quickAmount > 0 && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 text-center">
                  New total: <span className="font-semibold text-cyan-700 dark:text-cyan-400">${((quickAction.user.credits || 0) + quickAmount).toFixed(2)}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setQuickAction(null); setQuickAmount(0) }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAction}
                disabled={updating === quickAction.user._id || (quickAction.type === 'add' && quickAmount <= 0)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                  quickAction.type === 'add'
                    ? 'bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:text-cyan-400 border border-cyan-600 dark:border-cyan-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-500/30'
                }`}
              >
                {updating === quickAction.user._id ? 'Saving...' : quickAction.type === 'add' ? 'Add' : 'Set'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
