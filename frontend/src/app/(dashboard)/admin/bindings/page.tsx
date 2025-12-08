'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/components/AuthProvider'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface OhmyGPTKey {
  _id: string
  status: string
  tokensUsed: number
  requestsCount: number
  apiKey: string
}

interface Proxy {
  _id: string
  name: string
  status: string
  isActive: boolean
}

interface Binding {
  proxyId: string
  ohmygptKeyId: string
  priority: number
  isActive: boolean
  proxyName?: string
  keyStatus?: string
}

interface GroupedBindings {
  [proxyId: string]: {
    proxyName: string
    proxyStatus: string
    bindings: Binding[]
  }
}

export default function OhmyGPTBindingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [keys, setKeys] = useState<OhmyGPTKey[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [bindings, setBindings] = useState<Binding[]>([])
  const [stats, setStats] = useState({ totalKeys: 0, healthyKeys: 0, totalBindings: 0, totalProxies: 0 })
  const [loading, setLoading] = useState(true)

  const [createKeyModal, setCreateKeyModal] = useState(false)
  const [createBindingModal, setCreateBindingModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })

  const [keyForm, setKeyForm] = useState({ id: '', apiKey: '' })
  const [bindingForm, setBindingForm] = useState({ proxyId: '', ohmygptKeyId: '', priority: '1' })

  const { showToast } = useToast()

  // Group bindings by proxy
  const groupedBindings = useMemo(() => {
    const groups: GroupedBindings = {}

    bindings.forEach(binding => {
      if (!groups[binding.proxyId]) {
        const proxy = proxies.find(p => p._id === binding.proxyId)
        groups[binding.proxyId] = {
          proxyName: binding.proxyName || proxy?.name || binding.proxyId,
          proxyStatus: proxy?.status || 'unknown',
          bindings: []
        }
      }
      groups[binding.proxyId].bindings.push(binding)
    })

    // Sort bindings within each group by priority
    Object.values(groups).forEach(group => {
      group.bindings.sort((a, b) => a.priority - b.priority)
    })

    return groups
  }, [bindings, proxies])

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  async function loadData() {
    try {
      const [keysResp, bindingsResp] = await Promise.all([
        fetchWithAuth('/admin/ohmygpt/keys'),
        fetchWithAuth('/admin/ohmygpt/bindings'),
      ])

      if (keysResp.ok) {
        const data = await keysResp.json()
        setKeys(data.keys || [])
        setStats(prev => ({ ...prev, totalKeys: data.totalKeys, healthyKeys: data.healthyKeys }))
      }

      if (bindingsResp.ok) {
        const data = await bindingsResp.json()
        setBindings(data.bindings || [])
        setProxies(data.proxies || [])
        setStats(prev => ({ ...prev, totalBindings: data.total, totalProxies: data.proxies?.length || 0 }))
      }
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/ohmygpt/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyForm),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Failed to create key')
      }
      setCreateKeyModal(false)
      setKeyForm({ id: '', apiKey: '' })
      showToast('Key created successfully')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to create key', 'error')
    }
  }

  async function deleteKey(id: string) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/keys/${id}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Key deleted')
      loadData()
    } catch {
      showToast('Failed to delete key', 'error')
    }
  }

  async function resetKey(id: string) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/keys/${id}/reset`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to reset')
      showToast('Key stats reset')
      loadData()
    } catch {
      showToast('Failed to reset key', 'error')
    }
  }

  async function createBinding(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/ohmygpt/bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxyId: bindingForm.proxyId,
          ohmygptKeyId: bindingForm.ohmygptKeyId,
          priority: parseInt(bindingForm.priority),
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Failed to create binding')
      }
      setCreateBindingModal(false)
      setBindingForm({ proxyId: '', ohmygptKeyId: '', priority: '1' })
      showToast('Binding created successfully')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to create binding', 'error')
    }
  }

  async function toggleBinding(proxyId: string, keyId: string, isActive: boolean) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/bindings/${proxyId}/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!resp.ok) throw new Error('Failed to update')
      showToast(`Binding ${!isActive ? 'enabled' : 'disabled'}`)
      loadData()
    } catch {
      showToast('Failed to update binding', 'error')
    }
  }

  async function deleteBinding(proxyId: string, keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/bindings/${proxyId}/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Binding deleted')
      loadData()
    } catch {
      showToast('Failed to delete binding', 'error')
    }
  }

  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[var(--theme-text)] rounded-full animate-spin" />
          <p className="text-[var(--theme-text-subtle)] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-8 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
            <span className="text-[var(--theme-text-subtle)] text-sm">OhmyGPT Management</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-2">
            Key Bindings
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-lg">
            Manage OhmyGPT keys and their proxy bindings
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in-up animation-delay-100">
          {/* Total Keys */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="text-[var(--theme-text-subtle)] text-sm">Total Keys</p>
            </div>
            <p className="text-3xl font-bold text-[var(--theme-text)]">{stats.totalKeys}</p>
          </div>

          {/* Healthy Keys */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[var(--theme-text-subtle)] text-sm">Healthy</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.healthyKeys}</p>
          </div>

          {/* Bindings */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-[var(--theme-text-subtle)] text-sm">Bindings</p>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalBindings}</p>
          </div>

          {/* Proxies */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <p className="text-[var(--theme-text-subtle)] text-sm">Proxies</p>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalProxies}</p>
          </div>
        </div>

        {/* OhmyGPT Keys Section */}
        <div className="opacity-0 animate-fade-in-up animation-delay-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--theme-text)]">OhmyGPT Keys</h2>
            </div>
            <button
              onClick={() => setCreateKeyModal(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Key
            </button>
          </div>

          <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                    <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">Key ID</th>
                    <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">API Key</th>
                    <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">Tokens</th>
                    <th className="px-6 py-4 text-right text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">Requests</th>
                    <th className="px-6 py-4 text-right text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-emerald-500 rounded-full animate-spin" />
                          <p className="text-[var(--theme-text-subtle)] text-sm">Loading keys...</p>
                        </div>
                      </td>
                    </tr>
                  ) : keys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <p className="text-[var(--theme-text-subtle)] text-sm">No keys found. Add your first key to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    keys.map((key) => (
                      <tr key={key._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-[var(--theme-text)] px-2 py-1 rounded bg-slate-100 dark:bg-white/5">{key._id}</code>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-[var(--theme-text-muted)]">{key.apiKey}</code>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            key.status === 'healthy'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${key.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {key.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[var(--theme-text-muted)] text-sm font-mono">
                          {key.tokensUsed?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 text-right text-[var(--theme-text-muted)] text-sm font-mono">
                          {key.requestsCount?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => resetKey(key._id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/10 transition-colors"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => confirm(`Delete key ${key._id}?`, () => deleteKey(key._id))}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Proxy Bindings Section - Grouped by Proxy */}
        <div className="opacity-0 animate-fade-in-up animation-delay-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--theme-text)]">Proxy Bindings</h2>
            </div>
            <button
              onClick={() => setCreateBindingModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-medium text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Binding
            </button>
          </div>

          {Object.keys(groupedBindings).length === 0 ? (
            <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-[var(--theme-text-subtle)] text-sm">No bindings found. Create bindings to link proxies with OhmyGPT keys.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedBindings).map(([proxyId, group]) => (
                <div key={proxyId} className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none overflow-hidden">
                  {/* Proxy Header */}
                  <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--theme-text)]">{group.proxyName}</h3>
                          <p className="text-[var(--theme-text-subtle)] text-sm">{group.bindings.length} key{group.bindings.length !== 1 ? 's' : ''} bound</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        group.proxyStatus === 'active'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${group.proxyStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        {group.proxyStatus}
                      </span>
                    </div>
                  </div>

                  {/* Bindings List */}
                  <div className="divide-y divide-slate-200 dark:divide-white/5">
                    {group.bindings.map((binding, idx) => (
                      <div key={`${binding.proxyId}-${binding.ohmygptKeyId}`} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Priority Badge */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold">
                              #{binding.priority}
                            </div>

                            {/* Key Info */}
                            <div className="flex items-center gap-3">
                              <code className="text-sm font-mono text-[var(--theme-text)] px-2 py-1 rounded bg-slate-100 dark:bg-white/5">
                                {binding.ohmygptKeyId}
                              </code>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                binding.keyStatus === 'healthy'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${binding.keyStatus === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {binding.keyStatus || 'unknown'}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleBinding(binding.proxyId, binding.ohmygptKeyId, binding.isActive)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                binding.isActive
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20'
                              }`}
                            >
                              {binding.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => confirm(`Delete binding for ${binding.ohmygptKeyId}?`, () => deleteBinding(binding.proxyId, binding.ohmygptKeyId))}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[var(--theme-text)] font-semibold mb-2">How Key Bindings Work</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm leading-relaxed">
                Each proxy can be bound to multiple OhmyGPT keys with different priorities. When a request comes in, the system uses the highest priority (lowest number) active key. If that key fails, it automatically falls back to the next priority key. Use this to distribute load and ensure high availability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={createKeyModal} onClose={() => setCreateKeyModal(false)} title="Add OhmyGPT Key">
        <form onSubmit={createKey} className="space-y-5">
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">Key ID</label>
            <input
              type="text"
              value={keyForm.id}
              onChange={(e) => setKeyForm({...keyForm, id: e.target.value})}
              required
              placeholder="e.g., omg-1"
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">API Key</label>
            <input
              type="text"
              value={keyForm.apiKey}
              onChange={(e) => setKeyForm({...keyForm, apiKey: e.target.value})}
              required
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400/50 transition-colors font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
          >
            Add Key
          </button>
        </form>
      </Modal>

      {/* Create Binding Modal */}
      <Modal isOpen={createBindingModal} onClose={() => setCreateBindingModal(false)} title="Add Binding">
        <form onSubmit={createBinding} className="space-y-5">
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">Proxy</label>
            <select
              value={bindingForm.proxyId}
              onChange={(e) => setBindingForm({...bindingForm, proxyId: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400/50 transition-colors"
            >
              <option value="">Select proxy...</option>
              {proxies.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">OhmyGPT Key</label>
            <select
              value={bindingForm.ohmygptKeyId}
              onChange={(e) => setBindingForm({...bindingForm, ohmygptKeyId: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400/50 transition-colors"
            >
              <option value="">Select key...</option>
              {keys.map(k => (
                <option key={k._id} value={k._id}>{k._id} ({k.status})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">Priority</label>
            <input
              type="number"
              min="1"
              max="10"
              value={bindingForm.priority}
              onChange={(e) => setBindingForm({...bindingForm, priority: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400/50 transition-colors"
            />
            <p className="text-[var(--theme-text-subtle)] text-xs mt-2">Lower number = higher priority (1 is highest)</p>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-medium text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Create Binding
          </button>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({...confirmDialog, open: false})}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog({...confirmDialog, open: false}) }}
        message={confirmDialog.message}
      />
    </div>
  )
}
