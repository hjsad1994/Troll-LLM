'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth, formatNumber, maskKey } from '@/lib/api'
import { useToast } from '@/components/Toast'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Key {
  _id?: string
  id?: string
  name: string
  tier: string
  tokensUsed: number
  totalTokens: number
  usage_percent?: number
  isActive: boolean
  notes?: string
}

export default function KeysPage() {
  const [keys, setKeys] = useState<Key[]>([])
  const [filteredKeys, setFilteredKeys] = useState<Key[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [keyCreatedModal, setKeyCreatedModal] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [editingKey, setEditingKey] = useState<Key | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()
  
  const [form, setForm] = useState({
    name: '',
    tier: 'dev',
    totalTokens: '30000000',
    notes: '',
  })
  
  useEffect(() => {
    loadKeys()
  }, [])
  
  useEffect(() => {
    const filtered = keys.filter(k => 
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      (k._id || k.id || '').toLowerCase().includes(search.toLowerCase())
    )
    setFilteredKeys(filtered)
  }, [search, keys])
  
  async function loadKeys() {
    try {
      const resp = await fetchWithAuth('/admin/keys')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setKeys(data.keys || [])
    } catch {
      showToast('Failed to load keys', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          tier: form.tier,
          totalTokens: parseInt(form.totalTokens),
          notes: form.notes,
        })
      })
      if (!resp.ok) throw new Error('Failed to create')
      const data = await resp.json()
      setCreateModal(false)
      setNewKey(data.id)
      setKeyCreatedModal(true)
      setForm({ name: '', tier: 'dev', totalTokens: '30000000', notes: '' })
      loadKeys()
    } catch {
      showToast('Failed to create key', 'error')
    }
  }
  
  async function updateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!editingKey) return
    const keyId = editingKey._id || editingKey.id
    try {
      const resp = await fetchWithAuth(`/admin/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalTokens: parseInt(form.totalTokens),
          notes: form.notes,
        })
      })
      if (!resp.ok) throw new Error('Failed to update')
      setEditModal(false)
      showToast('Key updated successfully')
      loadKeys()
    } catch {
      showToast('Failed to update key', 'error')
    }
  }
  
  async function resetKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/keys/${keyId}/reset`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to reset')
      showToast('Usage reset successfully')
      loadKeys()
    } catch {
      showToast('Failed to reset usage', 'error')
    }
  }
  
  async function revokeKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/keys/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to revoke')
      showToast('Key revoked successfully')
      loadKeys()
    } catch {
      showToast('Failed to revoke key', 'error')
    }
  }
  
  async function deleteKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/keys/${keyId}?permanent=true`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast('Key deleted permanently')
      loadKeys()
    } catch {
      showToast('Failed to delete key', 'error')
    }
  }
  
  function openEdit(key: Key) {
    setEditingKey(key)
    setForm({ ...form, totalTokens: String(key.totalTokens), notes: key.notes || '' })
    setEditModal(true)
  }
  
  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }
  
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">🔑 User Keys</h1>
      </header>
      
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search keys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-64"
        />
        <button onClick={() => setCreateModal(true)} className="btn btn-primary">+ New Key</button>
      </div>
      
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-bg">
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Key ID</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Name</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Tier</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Usage</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-slate-400 text-xs uppercase font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading...</td></tr>
            ) : filteredKeys.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">
                <div className="text-5xl mb-4">🔑</div>
                No keys yet. Create your first key!
              </td></tr>
            ) : (
              filteredKeys.map((key) => {
                const keyId = key._id || key.id || ''
                const usage = key.usage_percent || 0
                const progressClass = usage > 90 ? 'danger' : usage > 70 ? 'warning' : ''
                return (
                  <tr key={keyId} className="border-b border-dark-border hover:bg-slate-700/50">
                    <td className="px-4 py-3"><code className="text-sm">{keyId}</code></td>
                    <td className="px-4 py-3">{key.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${key.tier}`}>{key.tier.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-28">
                        <div className="progress-bar">
                          <div className={`progress-fill ${progressClass}`} style={{ width: `${Math.min(usage, 100)}%` }} />
                        </div>
                        <small className="text-slate-500">{formatNumber(key.tokensUsed || 0)} / {formatNumber(key.totalTokens)}</small>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${key.isActive ? 'badge-active' : 'badge-revoked'}`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => openEdit(key)} className="btn btn-sm btn-secondary">Edit</button>
                      <button onClick={() => confirm('Reset usage for this key?', () => resetKey(keyId))} className="btn btn-sm btn-secondary">Reset</button>
                      {key.isActive ? (
                        <button onClick={() => confirm('Revoke this key?', () => revokeKey(keyId))} className="btn btn-sm btn-danger">Revoke</button>
                      ) : (
                        <button onClick={() => confirm('Permanently delete this key? This cannot be undone!', () => deleteKey(keyId))} className="btn btn-sm btn-danger">Delete</button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Key">
        <form onSubmit={createKey} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="e.g., John's API Key" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Tier</label>
              <select value={form.tier} onChange={(e) => setForm({...form, tier: e.target.value})} className="input">
                <option value="dev">Dev (150 RPM)</option>
                <option value="pro">Pro (300 RPM)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Token Limit</label>
              <select value={form.totalTokens} onChange={(e) => setForm({...form, totalTokens: e.target.value})} className="input">
                <option value="10000000">10M tokens</option>
                <option value="20000000">20M tokens</option>
                <option value="30000000">30M tokens</option>
                <option value="50000000">50M tokens</option>
                <option value="100000000">100M tokens</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} placeholder="Internal notes..." className="input" />
          </div>
          <button type="submit" className="btn btn-primary w-full">Create Key</button>
        </form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Key">
        <form onSubmit={updateKey} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Key ID</label>
            <input type="text" disabled value={maskKey(editingKey?._id || editingKey?.id || '')} className="input opacity-50" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Token Limit</label>
            <select value={form.totalTokens} onChange={(e) => setForm({...form, totalTokens: e.target.value})} className="input">
              <option value="10000000">10M tokens</option>
              <option value="20000000">20M tokens</option>
              <option value="30000000">30M tokens</option>
              <option value="50000000">50M tokens</option>
              <option value="100000000">100M tokens</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="input" />
          </div>
          <button type="submit" className="btn btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
      
      {/* Key Created Modal */}
      <Modal isOpen={keyCreatedModal} onClose={() => setKeyCreatedModal(false)} title="✅ Key Created">
        <p className="text-slate-400 mb-4">Save this key now. You won&apos;t be able to see it again!</p>
        <div className="bg-dark-bg p-4 rounded-lg font-mono break-all border border-dark-border mb-4">
          {newKey}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(newKey); showToast('Copied!') }} className="btn btn-secondary w-full">
          📋 Copy Key
        </button>
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
