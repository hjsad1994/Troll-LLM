'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth, formatNumber, maskKey } from '@/lib/api'
import { useToast } from '@/components/Toast'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface FactoryKey {
  _id?: string
  id?: string
  apiKey?: string
  status: string
  tokensUsed: number
  requestsCount: number
}

interface Stats {
  total: number
  healthy: number
  rateLimited: number
  exhausted: number
  error: number
}

export default function FactoryKeysPage() {
  const [keys, setKeys] = useState<FactoryKey[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, healthy: 0, rateLimited: 0, exhausted: 0, error: 0 })
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()
  
  const [form, setForm] = useState({ id: '', apiKey: '' })
  
  useEffect(() => {
    loadKeys()
  }, [])
  
  async function loadKeys() {
    try {
      const resp = await fetchWithAuth('/admin/factory-keys')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setKeys(data.keys || [])
      setStats({
        total: data.total || 0,
        healthy: data.healthy || 0,
        rateLimited: data.rate_limited || 0,
        exhausted: data.exhausted || 0,
        error: data.error || 0,
      })
    } catch {
      showToast('Failed to load keys', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/factory-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id, apiKey: form.apiKey })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to create')
      }
      setCreateModal(false)
      showToast('Factory key added successfully')
      setForm({ id: '', apiKey: '' })
      loadKeys()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add key', 'error')
    }
  }
  
  async function resetKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/factory-keys/${keyId}/reset`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to reset')
      showToast('Status reset successfully')
      loadKeys()
    } catch {
      showToast('Failed to reset status', 'error')
    }
  }
  
  async function deleteKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/factory-keys/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Factory key deleted')
      loadKeys()
    } catch {
      showToast('Failed to delete key', 'error')
    }
  }
  
  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }
  
  const unhealthyCount = stats.rateLimited + stats.exhausted + stats.error
  
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">🏭 Factory Keys</h1>
      </header>
      
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <span className="text-slate-400">
          Total: {stats.total} | Healthy: {stats.healthy} | Unhealthy: {unhealthyCount}
        </span>
        <button onClick={() => setCreateModal(true)} className="btn btn-primary">+ Add Factory Key</button>
      </div>
      
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-bg">
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Key ID</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">API Key</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Tokens Used</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Requests</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">
                <div className="text-5xl mb-4">🏭</div>
                No factory keys yet. Add your first key!
              </td></tr>
            ) : (
              keys.map((key) => {
                const keyId = key.id || key._id || ''
                const statusClass = key.status === 'healthy' ? 'healthy' : 'unhealthy'
                return (
                  <tr key={keyId} className="border-b border-dark-border hover:bg-slate-700/50">
                    <td className="px-4 py-3"><code className="text-sm">{keyId}</code></td>
                    <td className="px-4 py-3"><code className="text-sm">{maskKey(key.apiKey || 'hidden')}</code></td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${statusClass}`}>{key.status}</span>
                    </td>
                    <td className="px-4 py-3">{formatNumber(key.tokensUsed || 0)}</td>
                    <td className="px-4 py-3">{formatNumber(key.requestsCount || 0)}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => confirm('Reset status for this factory key?', () => resetKey(keyId))} className="btn btn-sm btn-secondary">Reset Status</button>
                      <button onClick={() => confirm('Delete this factory key?', () => deleteKey(keyId))} className="btn btn-sm btn-danger">Delete</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add Factory Key">
        <form onSubmit={createKey} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Key ID</label>
            <input type="text" value={form.id} onChange={(e) => setForm({...form, id: e.target.value})} required placeholder="e.g., factory-1" className="input" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">API Key</label>
            <input type="text" value={form.apiKey} onChange={(e) => setForm({...form, apiKey: e.target.value})} required placeholder="sk-xxx or fk-xxx" className="input" />
          </div>
          <button type="submit" className="btn btn-primary w-full">Add Key</button>
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
