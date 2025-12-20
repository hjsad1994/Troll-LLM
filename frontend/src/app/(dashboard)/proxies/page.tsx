'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from '@/components/Toast'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Proxy {
  _id: string
  name: string
  type: string
  host: string
  port: number
  username?: string
  status: string
  lastLatencyMs?: number
}

interface Binding {
  factoryKeyId: string
  priority: number
}

interface FactoryKey {
  _id?: string
  id?: string
}

export default function ProxiesPage() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [factoryKeys, setFactoryKeys] = useState<FactoryKey[]>([])
  const [stats, setStats] = useState({ total: 0, healthy: 0, unhealthy: 0 })
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [bindModal, setBindModal] = useState(false)
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null)
  const [bindings, setBindings] = useState<Binding[]>([])
  const [bindProxyId, setBindProxyId] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()

  const [form, setForm] = useState({
    name: '', type: 'http', host: '', port: '', username: '', password: ''
  })
  const [bindForm, setBindForm] = useState({ factoryKeyId: '', priority: '1' })

  useEffect(() => {
    loadProxies()
    loadFactoryKeys()
  }, [])

  async function loadProxies() {
    try {
      const resp = await fetchWithAuth('/admin/proxies')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setProxies(data.proxies || [])
      setStats({ total: data.total || 0, healthy: data.healthy || 0, unhealthy: data.unhealthy || 0 })
    } catch {
      showToast('Failed to load proxies', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadFactoryKeys() {
    try {
      const resp = await fetchWithAuth('/admin/troll-keys')
      if (!resp.ok) return
      const data = await resp.json()
      setFactoryKeys(data.keys || [])
    } catch {
      console.error('Failed to load factory keys')
    }
  }

  async function createProxy(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, type: form.type, host: form.host,
          port: parseInt(form.port),
          username: form.username || undefined,
          password: form.password || undefined,
        })
      })
      if (!resp.ok) throw new Error('Failed to create')
      setCreateModal(false)
      showToast('Proxy created successfully')
      resetForm()
      loadProxies()
    } catch {
      showToast('Failed to create proxy', 'error')
    }
  }

  async function updateProxy(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProxy) return
    try {
      const data: Record<string, unknown> = {
        name: form.name, host: form.host, port: parseInt(form.port)
      }
      if (form.username) data.username = form.username
      if (form.password) data.password = form.password

      const resp = await fetchWithAuth(`/admin/proxies/${editingProxy._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!resp.ok) throw new Error('Failed to update')
      setEditModal(false)
      showToast('Proxy updated successfully')
      loadProxies()
    } catch {
      showToast('Failed to update proxy', 'error')
    }
  }

  async function deleteProxy(proxyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${proxyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Proxy deleted')
      loadProxies()
    } catch {
      showToast('Failed to delete proxy', 'error')
    }
  }

  async function showBindings(proxyId: string) {
    setBindProxyId(proxyId)
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${proxyId}/keys`)
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setBindings(data.bindings || [])
      setBindModal(true)
    } catch {
      showToast('Failed to load bindings', 'error')
    }
  }

  async function addBinding(e: React.FormEvent) {
    e.preventDefault()
    if (!bindForm.factoryKeyId) {
      showToast('Please select a factory key', 'error')
      return
    }
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${bindProxyId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryKeyId: bindForm.factoryKeyId, priority: parseInt(bindForm.priority) })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to bind')
      }
      showToast('Key bound successfully')
      showBindings(bindProxyId)
      setBindForm({ factoryKeyId: '', priority: '1' })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to bind key', 'error')
    }
  }

  async function unbindKey(factoryKeyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${bindProxyId}/keys/${factoryKeyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to unbind')
      showToast('Key unbound')
      showBindings(bindProxyId)
    } catch {
      showToast('Failed to unbind key', 'error')
    }
  }

  function openEdit(proxy: Proxy) {
    setEditingProxy(proxy)
    setForm({ name: proxy.name, type: proxy.type, host: proxy.host, port: String(proxy.port), username: proxy.username || '', password: '' })
    setEditModal(true)
  }

  function resetForm() {
    setForm({ name: '', type: 'http', host: '', port: '', username: '', password: '' })
  }

  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-2 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Proxies</h1>
                <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">Manage proxy servers</p>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setCreateModal(true) }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Proxy
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm">
            <p className="text-slate-500 dark:text-slate-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-sm">
            <p className="text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Healthy</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.healthy}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 backdrop-blur-sm">
            <p className="text-red-600 dark:text-red-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Unhealthy</p>
            <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">{stats.unhealthy}</p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 dark:bg-black/60 border-b border-slate-200 dark:border-white/10">
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Host:Port</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Latency</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Keys</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-cyan-200 dark:border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      <span className="text-slate-500 dark:text-slate-500">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : proxies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">No proxies yet. Add your first proxy!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                proxies.map((proxy) => (
                  <tr key={proxy._id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{proxy.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {proxy.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-slate-600 dark:text-slate-400">{proxy.host}:{proxy.port}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        proxy.status === 'healthy'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : proxy.status === 'unhealthy'
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          proxy.status === 'healthy' ? 'bg-emerald-500' : proxy.status === 'unhealthy' ? 'bg-red-500' : 'bg-slate-400'
                        }`} />
                        {proxy.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {proxy.lastLatencyMs ? `${proxy.lastLatencyMs}ms` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => showBindings(proxy._id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      >
                        Bindings
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(proxy)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirm('Delete this proxy?', () => deleteProxy(proxy._id))}
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-cyan-200 dark:border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <span className="text-slate-500 dark:text-slate-500">Loading...</span>
              </div>
            </div>
          ) : proxies.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">No proxies yet. Add your first proxy!</p>
            </div>
          ) : (
            proxies.map((proxy) => (
              <div key={proxy._id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      proxy.status === 'healthy'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20'
                        : proxy.status === 'unhealthy'
                          ? 'bg-red-100 dark:bg-red-500/20'
                          : 'bg-slate-100 dark:bg-white/10'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        proxy.status === 'healthy'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : proxy.status === 'unhealthy'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-medium">{proxy.name}</p>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">{proxy.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                    proxy.status === 'healthy'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : proxy.status === 'unhealthy'
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      proxy.status === 'healthy' ? 'bg-emerald-500' : proxy.status === 'unhealthy' ? 'bg-red-500' : 'bg-slate-400'
                    }`} />
                    {proxy.status}
                  </span>
                </div>

                {/* Card Details */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                    <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Host:Port</p>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-mono truncate">{proxy.host}:{proxy.port}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                    <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">Latency</p>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      {proxy.lastLatencyMs ? `${proxy.lastLatencyMs}ms` : '-'}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => showBindings(proxy._id)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Bindings
                  </button>
                  <button
                    onClick={() => openEdit(proxy)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirm('Delete this proxy?', () => deleteProxy(proxy._id))}
                    className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Proxy">
        <form onSubmit={createProxy} className="space-y-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
              placeholder="e.g., US Proxy 1"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-transparent text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              >
                <option value="http">HTTP</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({...form, port: e.target.value})}
                required
                placeholder="8080"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Host</label>
            <input
              type="text"
              value={form.host}
              onChange={(e) => setForm({...form, host: e.target.value})}
              required
              placeholder="proxy.example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Username (optional)</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                placeholder="username"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Password (optional)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                placeholder="password"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition-colors"
          >
            Create Proxy
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Proxy">
        <form onSubmit={updateProxy} className="space-y-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Host</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({...form, host: e.target.value})}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({...form, port: e.target.value})}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                placeholder="(unchanged)"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </Modal>

      {/* Bind Keys Modal */}
      <Modal isOpen={bindModal} onClose={() => setBindModal(false)} title="Manage Key Bindings">
        <div className="space-y-6">
          <div>
            <h3 className="text-slate-900 dark:text-white font-medium mb-3">Current Bindings</h3>
            {bindings.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-500 text-sm py-4 text-center bg-slate-50 dark:bg-white/5 rounded-lg">No keys bound yet</p>
            ) : (
              <div className="space-y-2">
                {bindings.map((b) => (
                  <div key={b.factoryKeyId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div className="min-w-0">
                      <code className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 break-all">{b.factoryKeyId}</code>
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                        Priority {b.priority}
                      </span>
                    </div>
                    <button
                      onClick={() => confirm('Unbind this key?', () => unbindKey(b.factoryKeyId))}
                      className="self-end sm:self-auto px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      Unbind
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <h3 className="text-slate-900 dark:text-white font-medium mb-3">Add Binding</h3>
            <form onSubmit={addBinding} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Factory Key</label>
                  <select
                    value={bindForm.factoryKeyId}
                    onChange={(e) => setBindForm({...bindForm, factoryKeyId: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
                  >
                    <option value="">Select key...</option>
                    {factoryKeys.map((k) => {
                      const kid = k.id || k._id || ''
                      return <option key={kid} value={kid}>{kid}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Priority</label>
                  <select
                    value={bindForm.priority}
                    onChange={(e) => setBindForm({...bindForm, priority: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 text-sm"
                  >
                    <option value="1">1 (Primary)</option>
                    <option value="2">2 (Secondary)</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition-colors"
              >
                Bind Key
              </button>
            </form>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({...confirmDialog, open: false})}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog({...confirmDialog, open: false}) }}
        message={confirmDialog.message}
      />
    </div>
  )
}
