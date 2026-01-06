'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, formatNumber } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface OhMyGPTKey {
  _id?: string
  id?: string
  apiKey?: string
  status: string
  tokensUsed: number
  requestsCount: number
}

interface Stats {
  totalKeys: number
  healthyKeys: number
}

export default function OhMyGPTKeysPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const isAdmin = user?.role === 'admin'

  const [keys, setKeys] = useState<OhMyGPTKey[]>([])
  const [stats, setStats] = useState<Stats>({ totalKeys: 0, healthyKeys: 0 })
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()

  const [form, setForm] = useState({ id: '', apiKey: '' })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadKeys()
    }
  }, [isAdmin])

  async function loadKeys() {
    try {
      const resp = await fetchWithAuth('/admin/ohmygpt/keys')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setKeys(data.keys || [])
      setStats({
        totalKeys: data.totalKeys || 0,
        healthyKeys: data.healthyKeys || 0,
      })
    } catch {
      showToast(t.ohmygptKeys?.toast?.loadFailed || 'Failed to load keys', 'error')
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
        body: JSON.stringify({ id: form.id, apiKey: form.apiKey })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to create')
      }
      setCreateModal(false)
      showToast(t.ohmygptKeys?.toast?.addSuccess || 'OhMyGPT Key added successfully')
      setForm({ id: '', apiKey: '' })
      loadKeys()
    } catch (err) {
      showToast(err instanceof Error ? err.message : (t.ohmygptKeys?.toast?.addFailed || 'Failed to add key'), 'error')
    }
  }

  async function resetKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/keys/${keyId}/reset`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to reset')
      showToast(t.ohmygptKeys?.toast?.resetSuccess || 'Status reset successfully')
      loadKeys()
    } catch {
      showToast(t.ohmygptKeys?.toast?.resetFailed || 'Failed to reset status', 'error')
    }
  }

  async function deleteKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/ohmygpt/keys/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast(t.ohmygptKeys?.toast?.deleteSuccess || 'OhMyGPT Key deleted')
      loadKeys()
    } catch {
      showToast(t.ohmygptKeys?.toast?.deleteFailed || 'Failed to delete key', 'error')
    }
  }

  async function importKeys(e: React.FormEvent) {
    e.preventDefault()
    if (!importFile) {
      showToast('Please select a file', 'error')
      return
    }

    setImporting(true)
    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const line of lines) {
        const parts = line.trim().split('|')
        if (parts.length !== 2) {
          failCount++
          errors.push(`Invalid format: ${line}`)
          continue
        }

        const [id, apiKey] = parts
        try {
          const resp = await fetchWithAuth('/admin/ohmygpt/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id.trim(), apiKey: apiKey.trim() })
          })

          if (resp.ok) {
            successCount++
          } else {
            const data = await resp.json()
            failCount++
            errors.push(`${id}: ${data.error || 'Failed'}`)
          }
        } catch (err) {
          failCount++
          errors.push(`${id}: Network error`)
        }
      }

      setImportModal(false)
      setImportFile(null)

      if (successCount > 0) {
        showToast(`Import completed: ${successCount} succeeded, ${failCount} failed`)
      } else {
        showToast('Import failed: No keys were added', 'error')
      }

      if (errors.length > 0 && errors.length <= 5) {
        console.error('Import errors:', errors)
      }

      loadKeys()
    } catch (err) {
      showToast('Failed to read file', 'error')
    } finally {
      setImporting(false)
    }
  }

  function confirm(message: string, action: () => void) {
    setConfirmDialog({ open: true, message, action })
  }

  const unhealthyCount = stats.totalKeys - stats.healthyKeys

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="pt-2 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t.ohmygptKeys?.title || 'OhMyGPT Keys'}</h1>
                <p className="text-slate-600 dark:text-slate-500 text-xs sm:text-sm">{t.ohmygptKeys?.subtitle || 'Manage OhMyGPT API keys'}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setImportModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Keys
              </button>
              <button
                onClick={() => setCreateModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.ohmygptKeys?.addButton || 'Add Key'}
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm">
            <p className="text-slate-500 dark:text-slate-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t.ohmygptKeys?.stats?.total || 'Total'}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.totalKeys}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-sm">
            <p className="text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t.ohmygptKeys?.stats?.healthy || 'Healthy'}</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.healthyKeys}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 backdrop-blur-sm">
            <p className="text-red-600 dark:text-red-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t.ohmygptKeys?.stats?.unhealthy || 'Unhealthy'}</p>
            <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">{unhealthyCount}</p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 dark:bg-black/60 border-b border-slate-200 dark:border-white/10">
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.keyId || 'Key ID'}</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.apiKey || 'API Key'}</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.status || 'Status'}</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.tokensUsed || 'Tokens Used'}</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.requests || 'Requests'}</th>
                <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-400 text-xs uppercase font-semibold">{t.ohmygptKeys?.table?.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-slate-500 dark:text-slate-500">{t.ohmygptKeys?.loading || 'Loading...'}</span>
                    </div>
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">{t.ohmygptKeys?.empty?.title || 'No OhMyGPT Keys yet. Add your first key!'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((key) => {
                  const keyId = key._id || key.id || ''
                  const isDisabled = key.status !== 'healthy'
                  return (
                    <tr key={keyId} className={`border-b border-slate-100 dark:border-white/5 transition-colors ${
                      isDisabled
                        ? 'bg-red-50/50 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                      <td className="px-4 py-3">
                        <code className={`text-sm ${isDisabled ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{keyId}</code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-slate-500 dark:text-slate-500">{key.apiKey || '***'}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                          key.status === 'healthy'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${key.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {key.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatNumber(key.tokensUsed || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatNumber(key.requestsCount || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => confirm(t.ohmygptKeys?.confirm?.reset || 'Reset status for this key?', () => resetKey(keyId))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            {t.ohmygptKeys?.table?.reset || 'Reset'}
                          </button>
                          <button
                            onClick={() => confirm(t.ohmygptKeys?.confirm?.delete || 'Delete this key?', () => deleteKey(keyId))}
                            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            {t.ohmygptKeys?.table?.delete || 'Delete'}
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

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-slate-500 dark:text-slate-500">{t.ohmygptKeys?.loading || 'Loading...'}</span>
              </div>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{t.ohmygptKeys?.empty?.title || 'No OhMyGPT Keys yet. Add your first key!'}</p>
            </div>
          ) : (
            keys.map((key) => {
              const keyId = key._id || key.id || ''
              const isDisabled = key.status !== 'healthy'
              return (
                <div key={keyId} className={`p-4 rounded-xl border backdrop-blur-sm ${
                  isDisabled
                    ? 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/40'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        key.status === 'healthy'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20'
                          : 'bg-red-100 dark:bg-red-500/20'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          key.status === 'healthy'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className={`font-medium text-sm ${isDisabled ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{keyId}</p>
                        <p className="text-slate-500 dark:text-slate-500 text-xs font-mono truncate max-w-[150px]">
                          {key.apiKey || '***'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                      key.status === 'healthy'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${key.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {key.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">{t.ohmygptKeys?.table?.tokensUsed || 'Tokens Used'}</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                        {formatNumber(key.tokensUsed || 0)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                      <p className="text-slate-500 dark:text-slate-600 text-xs mb-0.5">{t.ohmygptKeys?.table?.requests || 'Requests'}</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                        {formatNumber(key.requestsCount || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => confirm(t.ohmygptKeys?.confirm?.reset || 'Reset status?', () => resetKey(keyId))}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      {t.ohmygptKeys?.table?.reset || 'Reset Status'}
                    </button>
                    <button
                      onClick={() => confirm(t.ohmygptKeys?.confirm?.delete || 'Delete this key?', () => deleteKey(keyId))}
                      className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title={t.ohmygptKeys?.modal?.title || 'Add OhMyGPT Key'}>
        <form onSubmit={createKey} className="space-y-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">{t.ohmygptKeys?.modal?.keyIdLabel || 'Key ID'}</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm({...form, id: e.target.value})}
              required
              placeholder={t.ohmygptKeys?.modal?.keyIdPlaceholder || 'e.g., omg-1'}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">{t.ohmygptKeys?.modal?.apiKeyLabel || 'API Key'}</label>
            <input
              type="text"
              value={form.apiKey}
              onChange={(e) => setForm({...form, apiKey: e.target.value})}
              required
              placeholder={t.ohmygptKeys?.modal?.apiKeyPlaceholder || 'sk-xxx'}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-transparent text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors"
          >
            {t.ohmygptKeys?.modal?.submit || 'Add Key'}
          </button>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={importModal} onClose={() => setImportModal(false)} title={t.ohmygptKeys?.modal?.importTitle || 'Import OhMyGPT Keys'}>
        <form onSubmit={importKeys} className="space-y-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">{t.ohmygptKeys?.modal?.fileLabel || 'Select .txt file'}</label>
            <input
              type="file"
              accept=".txt"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-500/10 dark:file:text-emerald-400"
            />
          </div>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-2">{t.ohmygptKeys?.modal?.fileFormatLabel || 'File Format:'}</p>
            <code className="text-xs text-slate-600 dark:text-slate-400 block">
              key-id-1|sk-xxx<br/>
              key-id-2|sk-yyy<br/>
              key-id-3|sk-zzz
            </code>
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
              {t.ohmygptKeys?.modal?.fileFormatHint || 'Each line: id|apiKey (separated by pipe |)'}
            </p>
          </div>
          <button
            type="submit"
            disabled={!importFile || importing}
            className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.ohmygptKeys?.modal?.importing || 'Importing...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {t.ohmygptKeys?.modal?.importButton || 'Import Keys'}
              </>
            )}
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
