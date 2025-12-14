'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface BackupKey {
  id: string
  maskedApiKey: string
  isUsed: boolean
  activated: boolean
  usedFor?: string
  usedAt?: string
  createdAt: string
}

interface Stats {
  total: number
  available: number
  used: number
}

export default function OpenHandsBackupKeysPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const isAdmin = user?.role === 'admin'

  const [keys, setKeys] = useState<BackupKey[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, used: 0 })
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
      const resp = await fetchWithAuth('/admin/openhands/backup-keys')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setKeys(data.keys || [])
      setStats({
        total: data.total || 0,
        available: data.available || 0,
        used: data.used || 0,
      })
    } catch {
      showToast(t.openhandsBackupKeys?.toast?.loadFailed || 'Failed to load backup keys', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/openhands/backup-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id, apiKey: form.apiKey })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to create')
      }
      setCreateModal(false)
      showToast(t.openhandsBackupKeys?.toast?.addSuccess || 'Backup key added successfully')
      setForm({ id: '', apiKey: '' })
      loadKeys()
    } catch (err) {
      showToast(err instanceof Error ? err.message : (t.openhandsBackupKeys?.toast?.addFailed || 'Failed to add key'), 'error')
    }
  }

  async function restoreKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/openhands/backup-keys/${keyId}/restore`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to restore')
      showToast(t.openhandsBackupKeys?.toast?.restoreSuccess || 'Backup key restored')
      loadKeys()
    } catch {
      showToast(t.openhandsBackupKeys?.toast?.restoreFailed || 'Failed to restore key', 'error')
    }
  }

  async function deleteKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/openhands/backup-keys/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast(t.openhandsBackupKeys?.toast?.deleteSuccess || 'Backup key deleted')
      loadKeys()
    } catch {
      showToast(t.openhandsBackupKeys?.toast?.deleteFailed || 'Failed to delete key', 'error')
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
          const resp = await fetchWithAuth('/admin/openhands/backup-keys', {
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
      <div className="relative max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-8 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400"></span>
            </span>
            <span className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.badge || 'OpenHands Key Management'}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-2">
            {t.openhandsBackupKeys?.title || 'OpenHands Backup Keys'}
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-lg">
            {t.openhandsBackupKeys?.subtitle || 'Manage backup keys for automatic rotation when OpenHands keys fail'}
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-fade-in-up animation-delay-100">
          {/* Total Keys Card */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.stats?.total || 'Total Keys'}</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-[var(--theme-text)]">{stats.total}</p>
          </div>

          {/* Available Keys Card */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.stats?.available || 'Available'}</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available}</p>
          </div>

          {/* Used Keys Card */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.stats?.used || 'Used'}</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.used}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[var(--theme-text-muted)] text-sm">
              <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.available}</span> {t.openhandsBackupKeys?.readyForRotation || 'keys ready for auto-rotation'}
            </span>
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
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-purple-600 dark:bg-purple-500 text-white font-medium text-sm hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.openhandsBackupKeys?.addButton || 'Add Backup Key'}
            </button>
          </div>
        </div>

        {/* Keys Table Card */}
        <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none overflow-hidden opacity-0 animate-fade-in-up animation-delay-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.keyId || 'Key ID'}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.apiKey || 'API Key'}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.status || 'Status'}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.usedFor || 'Used For'}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.created || 'Created'}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.openhandsBackupKeys?.table?.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.loading || 'Loading keys...'}</p>
                      </div>
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                          <svg className="w-8 h-8 text-purple-400 dark:text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-[var(--theme-text)] font-medium mb-1">{t.openhandsBackupKeys?.empty?.title || 'No backup keys yet'}</p>
                          <p className="text-[var(--theme-text-subtle)] text-sm">{t.openhandsBackupKeys?.empty?.description || 'Add keys for automatic rotation when OpenHands keys fail'}</p>
                        </div>
                        <button
                          onClick={() => setCreateModal(true)}
                          className="mt-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-[var(--theme-text)] text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          {t.openhandsBackupKeys?.empty?.cta || 'Add your first backup key'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-[var(--theme-text)] px-2 py-1 rounded bg-slate-100 dark:bg-white/5">{key.id}</code>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-[var(--theme-text-muted)]">{key.maskedApiKey}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            key.isUsed
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${key.isUsed ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            {key.isUsed ? (t.openhandsBackupKeys?.table?.statusUsed || 'Used') : (t.openhandsBackupKeys?.table?.statusAvailable || 'Available')}
                          </span>
                          {key.activated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Can Delete
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {key.usedFor ? (
                          <code className="text-sm font-mono text-amber-600 dark:text-amber-400">{key.usedFor}</code>
                        ) : (
                          <span className="text-[var(--theme-text-subtle)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--theme-text-muted)] text-sm">
                        {new Date(key.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {key.isUsed && (
                            <button
                              onClick={() => confirm(t.openhandsBackupKeys?.confirm?.restore || 'Restore this key to available?', () => restoreKey(key.id))}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-[var(--theme-text)] text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                              {t.openhandsBackupKeys?.table?.restore || 'Restore'}
                            </button>
                          )}
                          <button
                            onClick={() => confirm(t.openhandsBackupKeys?.confirm?.delete || 'Delete this backup key?', () => deleteKey(key.id))}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                          >
                            {t.openhandsBackupKeys?.table?.delete || 'Delete'}
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

        {/* Info Section */}
        <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none opacity-0 animate-fade-in-up animation-delay-400">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[var(--theme-text)] font-semibold mb-2">{t.openhandsBackupKeys?.info?.title || 'How OpenHands Backup Keys Work'}</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm leading-relaxed">
                {t.openhandsBackupKeys?.info?.description || 'Backup keys are automatically used when active OpenHands keys fail due to 401 invalid, 402 quota exhausted, or 403 banned errors. The system will seamlessly rotate to an available backup key to ensure uninterrupted service. Once a backup key is used, it will be marked as "Used" and can be restored manually if needed.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title={t.openhandsBackupKeys?.modal?.title || 'Add OpenHands Backup Key'}>
        <form onSubmit={createKey} className="space-y-5">
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">{t.openhandsBackupKeys?.modal?.keyIdLabel || 'Key ID'}</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm({...form, id: e.target.value})}
              required
              placeholder={t.openhandsBackupKeys?.modal?.keyIdPlaceholder || 'e.g., omg-backup-1'}
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-purple-500 dark:focus:border-purple-400/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">{t.openhandsBackupKeys?.modal?.apiKeyLabel || 'API Key'}</label>
            <input
              type="text"
              value={form.apiKey}
              onChange={(e) => setForm({...form, apiKey: e.target.value})}
              required
              placeholder={t.openhandsBackupKeys?.modal?.apiKeyPlaceholder || 'sk-...'}
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-purple-500 dark:focus:border-purple-400/50 transition-colors font-mono text-sm"
            />
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <svg className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-purple-700 dark:text-purple-400 text-sm">
              {t.openhandsBackupKeys?.modal?.warning || 'Backup keys will be automatically used when active OpenHands keys fail (401 invalid, 402 quota exhausted, 403 banned).'}
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-purple-600 dark:bg-purple-500 text-white font-medium text-sm hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
          >
            {t.openhandsBackupKeys?.modal?.submit || 'Add Backup Key'}
          </button>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={importModal} onClose={() => setImportModal(false)} title="Import OpenHands Backup Keys">
        <form onSubmit={importKeys} className="space-y-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">Select .txt file</label>
            <input
              type="file"
              accept=".txt"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-500/10 dark:file:text-purple-400"
            />
          </div>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-2">File Format:</p>
            <code className="text-xs text-slate-600 dark:text-slate-400 block">
              backup-key-1|sk-ant-api03-xxx<br/>
              backup-key-2|sk-ant-api03-yyy<br/>
              backup-key-3|sk-ant-api03-zzz
            </code>
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
              Each line: <strong>id|apiKey</strong> (separated by pipe |)
            </p>
          </div>
          <button
            type="submit"
            disabled={!importFile || importing}
            className="w-full py-2.5 rounded-lg bg-purple-500 text-white font-medium text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Keys
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
