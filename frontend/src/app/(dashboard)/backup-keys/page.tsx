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
  usedFor?: string
  usedAt?: string
  createdAt: string
}

interface Stats {
  total: number
  available: number
  used: number
}

export default function BackupKeysPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const isAdmin = user?.role === 'admin'

  const [keys, setKeys] = useState<BackupKey[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, used: 0 })
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; action: () => void }>({ open: false, message: '', action: () => {} })
  const { showToast } = useToast()

  const [form, setForm] = useState({ id: '', apiKey: '' })

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
      const resp = await fetchWithAuth('/admin/backup-keys')
      if (!resp.ok) throw new Error('Failed to load')
      const data = await resp.json()
      setKeys(data.keys || [])
      setStats({
        total: data.total || 0,
        available: data.available || 0,
        used: data.used || 0,
      })
    } catch {
      showToast(t.backupKeys.toast.loadFailed, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    try {
      const resp = await fetchWithAuth('/admin/backup-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id, apiKey: form.apiKey })
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Failed to create')
      }
      setCreateModal(false)
      showToast(t.backupKeys.toast.addSuccess)
      setForm({ id: '', apiKey: '' })
      loadKeys()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.backupKeys.toast.addFailed, 'error')
    }
  }

  async function restoreKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/backup-keys/${keyId}/restore`, { method: 'POST' })
      if (!resp.ok) throw new Error('Failed to restore')
      showToast(t.backupKeys.toast.restoreSuccess)
      loadKeys()
    } catch {
      showToast(t.backupKeys.toast.restoreFailed, 'error')
    }
  }

  async function deleteKey(keyId: string) {
    try {
      const resp = await fetchWithAuth(`/admin/backup-keys/${keyId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Failed to delete')
      showToast(t.backupKeys.toast.deleteSuccess)
      loadKeys()
    } catch {
      showToast(t.backupKeys.toast.deleteFailed, 'error')
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.badge}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-2">
            {t.backupKeys.title}
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-lg">
            {t.backupKeys.subtitle}
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-fade-in-up animation-delay-100">
          {/* Total Keys Card */}
          <div className="p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.stats.total}</p>
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
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.stats.available}</p>
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
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.stats.used}</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.used}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[var(--theme-text-muted)] text-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.available}</span> {t.backupKeys.readyForRotation}
            </span>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium text-sm hover:bg-indigo-700 dark:hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.backupKeys.addButton}
          </button>
        </div>

        {/* Keys Table Card */}
        <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none overflow-hidden opacity-0 animate-fade-in-up animation-delay-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.keyId}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.apiKey}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.status}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.usedFor}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.created}</th>
                  <th className="px-6 py-4 text-left text-[var(--theme-text-subtle)] text-xs uppercase font-semibold tracking-wider">{t.backupKeys.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.loading}</p>
                      </div>
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-[var(--theme-text)] font-medium mb-1">{t.backupKeys.empty.title}</p>
                          <p className="text-[var(--theme-text-subtle)] text-sm">{t.backupKeys.empty.description}</p>
                        </div>
                        <button
                          onClick={() => setCreateModal(true)}
                          className="mt-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-[var(--theme-text)] text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          {t.backupKeys.empty.cta}
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          key.isUsed
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${key.isUsed ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          {key.isUsed ? t.backupKeys.table.statusUsed : t.backupKeys.table.statusAvailable}
                        </span>
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
                              onClick={() => confirm(t.backupKeys.confirm.restore, () => restoreKey(key.id))}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-[var(--theme-text)] text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                              {t.backupKeys.table.restore}
                            </button>
                          )}
                          <button
                            onClick={() => confirm(t.backupKeys.confirm.delete, () => deleteKey(key.id))}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                          >
                            {t.backupKeys.table.delete}
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[var(--theme-text)] font-semibold mb-2">{t.backupKeys.info.title}</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm leading-relaxed">
                {t.backupKeys.info.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title={t.backupKeys.modal.title}>
        <form onSubmit={createKey} className="space-y-5">
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">{t.backupKeys.modal.keyIdLabel}</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm({...form, id: e.target.value})}
              required
              placeholder={t.backupKeys.modal.keyIdPlaceholder}
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-indigo-500 dark:focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[var(--theme-text)] text-sm font-medium mb-2">{t.backupKeys.modal.apiKeyLabel}</label>
            <input
              type="text"
              value={form.apiKey}
              onChange={(e) => setForm({...form, apiKey: e.target.value})}
              required
              placeholder={t.backupKeys.modal.apiKeyPlaceholder}
              className="w-full px-4 py-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-indigo-500 dark:focus:border-white/30 transition-colors font-mono text-sm"
            />
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-700 dark:text-amber-400 text-sm">
              {t.backupKeys.modal.warning}
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium text-sm hover:bg-indigo-700 dark:hover:opacity-90 transition-colors"
          >
            {t.backupKeys.modal.submit}
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
