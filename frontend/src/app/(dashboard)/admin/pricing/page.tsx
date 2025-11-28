'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'

interface ModelPricing {
  _id: string
  modelId: string
  displayName: string
  inputPricePerMTok: number
  outputPricePerMTok: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PricingStats {
  total: number
  active: number
}

export default function PricingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [pricing, setPricing] = useState<ModelPricing[]>([])
  const [stats, setStats] = useState<PricingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPricing, setSelectedPricing] = useState<ModelPricing | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    modelId: '',
    displayName: '',
    inputPricePerMTok: 0,
    outputPricePerMTok: 0,
    isActive: true,
  })

  const loadPricing = useCallback(async () => {
    try {
      setLoading(true)
      const resp = await fetchWithAuth('/admin/pricing')
      if (resp.ok) {
        const data = await resp.json()
        setPricing(data.pricing || [])
        setStats({ total: data.total, active: data.active })
      }
    } catch (err) {
      console.error('Failed to load pricing:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadPricing()
  }, [user, router, loadPricing])

  const handleEdit = (item: ModelPricing) => {
    setSelectedPricing(item)
    setFormData({
      modelId: item.modelId,
      displayName: item.displayName,
      inputPricePerMTok: item.inputPricePerMTok,
      outputPricePerMTok: item.outputPricePerMTok,
      isActive: item.isActive,
    })
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedPricing(null)
    setFormData({
      modelId: '',
      displayName: '',
      inputPricePerMTok: 0,
      outputPricePerMTok: 0,
      isActive: true,
    })
    setIsCreating(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isCreating) {
        const resp = await fetchWithAuth('/admin/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!resp.ok) {
          const err = await resp.json()
          throw new Error(err.error || 'Failed to create pricing')
        }
      } else if (selectedPricing) {
        const resp = await fetchWithAuth(`/admin/pricing/${selectedPricing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.displayName,
            inputPricePerMTok: formData.inputPricePerMTok,
            outputPricePerMTok: formData.outputPricePerMTok,
            isActive: formData.isActive,
          }),
        })
        if (!resp.ok) {
          const err = await resp.json()
          throw new Error(err.error || 'Failed to update pricing')
        }
      }
      await loadPricing()
      setSelectedPricing(null)
      setIsCreating(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing?')) return
    try {
      const resp = await fetchWithAuth(`/admin/pricing/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Failed to delete')
      }
      await loadPricing()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  const handleSeedDefaults = async () => {
    if (!confirm('This will add default pricing for models if the collection is empty. Continue?')) return
    try {
      const resp = await fetchWithAuth('/admin/pricing/seed', { method: 'POST' })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Failed to seed')
      }
      await loadPricing()
    } catch (err: any) {
      alert(err.message || 'Failed to seed defaults')
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-black -m-8 p-8">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Model Pricing</h1>
                <p className="text-slate-500 text-sm">Configure per-model token pricing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSeedDefaults}
                className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
              >
                Seed Defaults
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                Add Model
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Models</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
          </div>
        )}

        {/* Pricing Table */}
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Model</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Input ($/MTok)</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Output ($/MTok)</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Updated</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-slate-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : pricing.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-slate-500 text-sm mb-2">No model pricing configured</p>
                    <button
                      onClick={handleSeedDefaults}
                      className="text-white text-sm hover:underline"
                    >
                      Click to seed default pricing
                    </button>
                  </td>
                </tr>
              ) : (
                pricing.map((item) => (
                  <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{item.displayName}</p>
                        <p className="text-slate-600 text-xs font-mono">{item.modelId}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white font-mono text-sm">${item.inputPricePerMTok.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white font-mono text-sm">${item.outputPricePerMTok.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        item.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-sm">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 text-xs hover:bg-white/5 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
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

        {/* Pricing Info */}
        <div className="rounded-xl border border-white/5 p-5 bg-white/[0.02]">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Pricing Notes</p>
          <ul className="text-slate-400 text-sm space-y-1.5">
            <li>- Prices are in USD per million tokens (MTok)</li>
            <li>- Input tokens: tokens sent in the request (prompts, context)</li>
            <li>- Output tokens: tokens generated by the model (responses)</li>
            <li>- Inactive models will still work but won't appear in public listings</li>
          </ul>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(selectedPricing || isCreating) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-medium">
                {isCreating ? 'Add Model Pricing' : 'Edit Model Pricing'}
              </h3>
              <button
                onClick={() => { setSelectedPricing(null); setIsCreating(false); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1.5">Model ID</label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  disabled={!isCreating}
                  placeholder="e.g. claude-sonnet-4-5-20250514"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-slate-600 focus:outline-none focus:border-white/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Claude Sonnet 4.5"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-slate-600 focus:outline-none focus:border-white/20 transition-colors text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1.5">Input ($/MTok)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.inputPricePerMTok}
                    onChange={(e) => setFormData({ ...formData, inputPricePerMTok: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-white/20 transition-colors text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1.5">Output ($/MTok)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.outputPricePerMTok}
                    onChange={(e) => setFormData({ ...formData, outputPricePerMTok: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-white/20 transition-colors text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="isActive" className="text-slate-300 text-sm">Active</label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedPricing(null); setIsCreating(false); }}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.modelId || !formData.displayName}
                className="flex-1 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
