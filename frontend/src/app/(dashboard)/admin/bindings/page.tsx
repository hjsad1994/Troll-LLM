'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from '@/components/Toast'
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

export default function OhmyGPTBindingsPage() {
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

  useEffect(() => {
    loadData()
  }, [])

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">OhmyGPT Key Bindings</h1>
        <div className="flex gap-2">
          <button onClick={() => setCreateKeyModal(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">+ Add Key</button>
          <button onClick={() => setCreateBindingModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Add Binding</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Total Keys</div>
          <div className="text-2xl font-bold text-white">{stats.totalKeys}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Healthy Keys</div>
          <div className="text-2xl font-bold text-green-500">{stats.healthyKeys}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Active Bindings</div>
          <div className="text-2xl font-bold text-blue-500">{stats.totalBindings}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Proxies</div>
          <div className="text-2xl font-bold text-purple-500">{stats.totalProxies}</div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">OhmyGPT Keys</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">ID</th>
              <th className="text-left py-2">API Key</th>
              <th className="text-left py-2">Status</th>
              <th className="text-right py-2">Tokens Used</th>
              <th className="text-right py-2">Requests</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key._id} className="border-b border-gray-700 text-gray-300">
                <td className="py-2 font-mono">{key._id}</td>
                <td className="py-2 font-mono text-xs">{key.apiKey}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${key.status === 'healthy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {key.status}
                  </span>
                </td>
                <td className="py-2 text-right">{key.tokensUsed?.toLocaleString() || 0}</td>
                <td className="py-2 text-right">{key.requestsCount?.toLocaleString() || 0}</td>
                <td className="py-2 text-right">
                  <button onClick={() => resetKey(key._id)} className="text-yellow-500 hover:text-yellow-400 mr-2">Reset</button>
                  <button onClick={() => setConfirmDialog({ open: true, message: `Delete key ${key._id}?`, action: () => deleteKey(key._id) })} className="text-red-500 hover:text-red-400">Delete</button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-500">No keys found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Bindings Table */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Proxy-Key Bindings</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Proxy</th>
              <th className="text-left py-2">Key ID</th>
              <th className="text-center py-2">Priority</th>
              <th className="text-center py-2">Key Status</th>
              <th className="text-center py-2">Active</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map(b => (
              <tr key={`${b.proxyId}-${b.ohmygptKeyId}`} className="border-b border-gray-700 text-gray-300">
                <td className="py-2">{b.proxyName || b.proxyId}</td>
                <td className="py-2 font-mono">{b.ohmygptKeyId}</td>
                <td className="py-2 text-center">{b.priority}</td>
                <td className="py-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${b.keyStatus === 'healthy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {b.keyStatus || 'unknown'}
                  </span>
                </td>
                <td className="py-2 text-center">
                  <button onClick={() => toggleBinding(b.proxyId, b.ohmygptKeyId, b.isActive)} className={`px-2 py-1 rounded text-xs ${b.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
                    {b.isActive ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => setConfirmDialog({ open: true, message: `Delete binding?`, action: () => deleteBinding(b.proxyId, b.ohmygptKeyId) })} className="text-red-500 hover:text-red-400">Delete</button>
                </td>
              </tr>
            ))}
            {bindings.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-500">No bindings found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={createKeyModal} onClose={() => setCreateKeyModal(false)} title="Add OhmyGPT Key">
        <form onSubmit={createKey} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Key ID</label>
            <input type="text" value={keyForm.id} onChange={e => setKeyForm(f => ({ ...f, id: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 rounded text-white" placeholder="e.g., omg-3" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input type="text" value={keyForm.apiKey} onChange={e => setKeyForm(f => ({ ...f, apiKey: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm" placeholder="sk-..." required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateKeyModal(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 rounded">Create</button>
          </div>
        </form>
      </Modal>

      {/* Create Binding Modal */}
      <Modal isOpen={createBindingModal} onClose={() => setCreateBindingModal(false)} title="Add Binding">
        <form onSubmit={createBinding} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Proxy</label>
            <select value={bindingForm.proxyId} onChange={e => setBindingForm(f => ({ ...f, proxyId: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 rounded text-white" required>
              <option value="">Select proxy...</option>
              {proxies.map(p => <option key={p._id} value={p._id}>{p.name} ({p.status})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">OhmyGPT Key</label>
            <select value={bindingForm.ohmygptKeyId} onChange={e => setBindingForm(f => ({ ...f, ohmygptKeyId: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 rounded text-white" required>
              <option value="">Select key...</option>
              {keys.map(k => <option key={k._id} value={k._id}>{k._id} ({k.status})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Priority (1 = highest)</label>
            <input type="number" min="1" max="10" value={bindingForm.priority} onChange={e => setBindingForm(f => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 rounded text-white" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateBindingModal(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 rounded">Create</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog isOpen={confirmDialog.open} message={confirmDialog.message} onConfirm={() => { confirmDialog.action(); setConfirmDialog({ open: false, message: '', action: () => {} }) }} onCancel={() => setConfirmDialog({ open: false, message: '', action: () => {} })} />
    </div>
  )
}
