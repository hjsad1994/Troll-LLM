'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/components/AuthProvider'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Binding {
  id: string
  proxyId: string
  proxyName: string
  factoryKeyId: string
  factoryKeyStatus: string
  priority: number
  isActive: boolean
  createdAt: string
}

interface Proxy {
  _id: string
  name: string
  status: string
}

interface FactoryKey {
  _id?: string
  id?: string
  status: string
}

interface BindingsByProxy {
  [proxyId: string]: Binding[]
}

const GOPROXY_URL = process.env.NEXT_PUBLIC_GOPROXY_URL || 'http://localhost:8003'

export default function BindingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [bindings, setBindings] = useState<Binding[]>([])
  const [byProxy, setByProxy] = useState<BindingsByProxy>({})
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [factoryKeys, setFactoryKeys] = useState<FactoryKey[]>([])
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingBinding, setEditingBinding] = useState<Binding | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()

  const [form, setForm] = useState({ proxyId: '', factoryKeyId: '', priority: '1' })

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  const loadData = useCallback(async () => {
    try {
      const [bindingsResp, proxiesResp, keysResp] = await Promise.all([
        fetchWithAuth('/admin/proxies/bindings'),
        fetchWithAuth('/admin/proxies'),
        fetchWithAuth('/admin/troll-keys'),
      ])

      if (bindingsResp.ok) {
        const data = await bindingsResp.json()
        setBindings(data.bindings || [])
        setByProxy(data.byProxy || {})
      }

      if (proxiesResp.ok) {
        const data = await proxiesResp.json()
        setProxies(data.proxies || [])
      }

      if (keysResp.ok) {
        const data = await keysResp.json()
        setFactoryKeys(data.keys || [])
      }
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, loadData])

  async function reloadGoProxy() {
    setReloading(true)
    try {
      const resp = await fetch(`${GOPROXY_URL}/reload`)
      if (!resp.ok) throw new Error('Reload failed')
      const data = await resp.json()
      showToast(`Reloaded: ${data.proxy_count} proxies`)
      loadData()
    } catch {
      showToast('Failed to reload GoProxy', 'error')
    } finally {
      setReloading(false)
    }
  }

  async function createBinding(e: React.FormEvent) {
    e.preventDefault()
    if (!form.proxyId || !form.factoryKeyId) {
      showToast('Please select proxy and key', 'error')
      return
    }
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${form.proxyId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryKeyId: form.factoryKeyId, priority: parseInt(form.priority) })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to create')
      }
      setCreateModal(false)
      showToast('Binding created successfully')
      setForm({ proxyId: '', factoryKeyId: '', priority: '1' })
      loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create binding', 'error')
    }
  }

  async function updateBinding(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBinding) return
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${editingBinding.proxyId}/keys/${editingBinding.factoryKeyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: parseInt(form.priority) })
      })
      if (!resp.ok) throw new Error('Failed to update')
      setEditModal(false)
      showToast('Priority updated successfully')
      loadData()
    } catch {
      showToast('Failed to update priority', 'error')
    }
  }

  async function deleteBinding(binding: Binding) {
    try {
      const resp = await fetchWithAuth(`/admin/proxies/${binding.proxyId}/keys/${binding.factoryKeyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Binding deleted')
      loadData()
    } catch {
      showToast('Failed to delete binding', 'error')
    }
  }

  function openEdit(binding: Binding) {
    setEditingBinding(binding)
    setForm({ proxyId: binding.proxyId, factoryKeyId: binding.factoryKeyId, priority: String(binding.priority) })
    setEditModal(true)
  }

  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
      rate_limited: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
      exhausted: { bg: 'bg-red-500/10', text: 'text-red-400' },
      error: { bg: 'bg-red-500/10', text: 'text-red-400' },
      unknown: { bg: 'bg-white/5', text: 'text-neutral-400' },
    }
    const config = statusConfig[status] || statusConfig.unknown
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-current/20`}>
        {status}
      </span>
    )
  }

  function getPriorityBadge(priority: number) {
    const colors = priority <= 3 ? 'bg-emerald-500/10 text-emerald-400' :
                   priority <= 6 ? 'bg-amber-500/10 text-amber-400' :
                   'bg-red-500/10 text-red-400'
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors} border border-current/20`}>
        P{priority}
      </span>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">Key Bindings</h1>
            <p className="text-neutral-500 mt-2">Manage proxy-key bindings for round-robin rotation</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reloadGoProxy}
              disabled={reloading}
              className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {reloading ? 'Reloading...' : '🔄 Reload GoProxy'}
            </button>
            <button
              onClick={() => { setForm({ proxyId: '', factoryKeyId: '', priority: '1' }); setCreateModal(true) }}
              className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors"
            >
              + Add Binding
            </button>
          </div>
        </header>

        <div className="py-4 border-y border-white/5">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-neutral-500">Total Bindings: <span className="text-white font-medium">{bindings.length}</span></span>
            <span className="text-neutral-500">Proxies: <span className="text-white font-medium">{Object.keys(byProxy).length}</span></span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : Object.keys(byProxy).length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <div className="text-5xl mb-4">🔗</div>
            <p>No bindings configured yet</p>
            <p className="text-sm mt-2">Add bindings to enable key rotation</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byProxy).map(([proxyId, proxyBindings]) => {
              const proxy = proxies.find(p => p._id === proxyId)
              return (
                <div key={proxyId} className="rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white">{proxy?.name || proxyId}</span>
                      {getStatusBadge(proxy?.status || 'unknown')}
                    </div>
                    <span className="text-sm text-neutral-500">{proxyBindings.length} key(s)</span>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-3">
                      {proxyBindings.sort((a, b) => a.priority - b.priority).map((binding) => (
                        <div key={binding.id} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-neutral-800/60">
                          <div className="flex items-center gap-4">
                            {getPriorityBadge(binding.priority)}
                            <code className="text-sm text-neutral-300">{binding.factoryKeyId}</code>
                            {getStatusBadge(binding.factoryKeyStatus)}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(binding)}
                              className="px-3 py-1 rounded-lg border border-white/10 text-neutral-400 text-sm hover:bg-white/5 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => confirm('Delete this binding?', () => deleteBinding(binding))}
                              className="px-3 py-1 rounded-lg border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="p-6 rounded-xl border border-white/10 bg-neutral-900/80">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="space-y-2 text-sm text-neutral-400">
            <p>- Keys are sorted by priority (P1 = highest, P10 = lowest)</p>
            <p>- Each proxy rotates through ALL its bound keys using round-robin</p>
            <p>- Changes auto-sync to GoProxy every 30 seconds</p>
            <p>- Click &quot;Reload GoProxy&quot; to apply changes immediately</p>
          </div>
        </div>
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add Binding">
        <form onSubmit={createBinding} className="space-y-4">
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Proxy</label>
            <select value={form.proxyId} onChange={(e) => setForm({...form, proxyId: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white">
              <option value="">Select proxy...</option>
              {proxies.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Factory Key</label>
            <select value={form.factoryKeyId} onChange={(e) => setForm({...form, factoryKeyId: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white">
              <option value="">Select key...</option>
              {factoryKeys.map((k) => {
                const kid = k.id || k._id || ''
                return <option key={kid} value={kid}>{kid}</option>
              })}
            </select>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Priority (1-10)</label>
            <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white">
              {[1,2,3,4,5,6,7,8,9,10].map(p => (
                <option key={p} value={p}>{p} {p === 1 ? '(Highest)' : p === 10 ? '(Lowest)' : ''}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-neutral-200 transition-colors">
            Create Binding
          </button>
        </form>
      </Modal>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Binding Priority">
        <form onSubmit={updateBinding} className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-800/60 border border-white/10">
            <div className="text-sm text-neutral-400 mb-1">Proxy</div>
            <div className="text-white">{editingBinding?.proxyName || editingBinding?.proxyId}</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-800/60 border border-white/10">
            <div className="text-sm text-neutral-400 mb-1">Key</div>
            <code className="text-white">{editingBinding?.factoryKeyId}</code>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Priority (1-10)</label>
            <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white">
              {[1,2,3,4,5,6,7,8,9,10].map(p => (
                <option key={p} value={p}>{p} {p === 1 ? '(Highest)' : p === 10 ? '(Lowest)' : ''}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-neutral-200 transition-colors">
            Save Changes
          </button>
        </form>
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
