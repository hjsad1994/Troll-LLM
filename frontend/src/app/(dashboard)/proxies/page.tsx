'use client'

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
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">🌐 Proxies</h1>
      </header>
      
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <span className="text-slate-400">
          Total: {stats.total} | Healthy: {stats.healthy} | Unhealthy: {stats.unhealthy}
        </span>
        <button onClick={() => { resetForm(); setCreateModal(true) }} className="btn btn-primary">+ New Proxy</button>
      </div>
      
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-bg">
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Name</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Host:Port</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Latency</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Keys</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
            ) : proxies.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                <div className="text-5xl mb-4">🌐</div>
                No proxies yet. Add your first proxy!
              </td></tr>
            ) : (
              proxies.map((proxy) => {
                const statusIcon = proxy.status === 'healthy' ? '✅' : proxy.status === 'unhealthy' ? '❌' : '❓'
                const statusClass = proxy.status === 'healthy' ? 'healthy' : proxy.status === 'unhealthy' ? 'unhealthy' : ''
                return (
                  <tr key={proxy._id} className="border-b border-dark-border hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium">{proxy.name}</td>
                    <td className="px-4 py-3"><span className="badge">{proxy.type.toUpperCase()}</span></td>
                    <td className="px-4 py-3"><code className="text-sm">{proxy.host}:{proxy.port}</code></td>
                    <td className="px-4 py-3">
                      {statusIcon} <span className={`badge badge-${statusClass}`}>{proxy.status}</span>
                    </td>
                    <td className="px-4 py-3">{proxy.lastLatencyMs ? `${proxy.lastLatencyMs}ms` : '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => showBindings(proxy._id)} className="btn btn-sm btn-secondary">Bindings</button>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => openEdit(proxy)} className="btn btn-sm btn-secondary">Edit</button>
                      <button onClick={() => confirm('Delete this proxy?', () => deleteProxy(proxy._id))} className="btn btn-sm btn-danger">Delete</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Proxy">
        <form onSubmit={createProxy} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="e.g., US Proxy 1" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Type</label>
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input">
                <option value="http">HTTP</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Port</label>
              <input type="number" value={form.port} onChange={(e) => setForm({...form, port: e.target.value})} required placeholder="8080" className="input" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Host</label>
            <input type="text" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required placeholder="proxy.example.com" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Username (optional)</label>
              <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} placeholder="username" className="input" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Password (optional)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="password" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">Create Proxy</button>
        </form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Proxy">
        <form onSubmit={updateProxy} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Host</label>
              <input type="text" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Port</label>
              <input type="number" value={form.port} onChange={(e) => setForm({...form, port: e.target.value})} required className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="input" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="(unchanged)" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
      
      {/* Bind Keys Modal */}
      <Modal isOpen={bindModal} onClose={() => setBindModal(false)} title="Manage Key Bindings">
        <h3 className="text-lg font-medium mb-4">Current Bindings</h3>
        {bindings.length === 0 ? (
          <p className="text-slate-500 mb-6">No keys bound yet</p>
        ) : (
          <div className="space-y-2 mb-6">
            {bindings.map((b) => (
              <div key={b.factoryKeyId} className="flex justify-between items-center p-3 bg-dark-bg rounded-lg">
                <div>
                  <code>{b.factoryKeyId}</code>
                  <span className="badge ml-2">Priority {b.priority}</span>
                </div>
                <button onClick={() => confirm('Unbind this key?', () => unbindKey(b.factoryKeyId))} className="btn btn-sm btn-danger">Unbind</button>
              </div>
            ))}
          </div>
        )}
        
        <h3 className="text-lg font-medium mb-4">Add Binding</h3>
        <form onSubmit={addBinding} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Factory Key</label>
              <select value={bindForm.factoryKeyId} onChange={(e) => setBindForm({...bindForm, factoryKeyId: e.target.value})} className="input">
                <option value="">Select key...</option>
                {factoryKeys.map((k) => {
                  const kid = k.id || k._id || ''
                  return <option key={kid} value={kid}>{kid}</option>
                })}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Priority</label>
              <select value={bindForm.priority} onChange={(e) => setBindForm({...bindForm, priority: e.target.value})} className="input">
                <option value="1">1 (Primary)</option>
                <option value="2">2 (Secondary)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">Bind Key</button>
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
