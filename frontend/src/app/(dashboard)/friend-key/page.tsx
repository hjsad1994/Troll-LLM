'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getFriendKey,
  getFullFriendKey,
  createFriendKey,
  rotateFriendKey,
  deleteFriendKey,
  updateFriendKeyLimits,
  getFriendKeyUsage,
  FriendKeyInfo,
  ModelUsage,
} from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

// Hardcoded models (same as /models page)
interface ModelConfig {
  id: string
  name: string
  inputPricePerMTok: number
  outputPricePerMTok: number
}

const AVAILABLE_MODELS: ModelConfig[] = [
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', inputPricePerMTok: 5, outputPricePerMTok: 25 },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', inputPricePerMTok: 3, outputPricePerMTok: 15 },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', inputPricePerMTok: 1, outputPricePerMTok: 5 },
  { id: 'gpt-5.1', name: 'GPT-5.1', inputPricePerMTok: 1.25, outputPricePerMTok: 10 },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', inputPricePerMTok: 2, outputPricePerMTok: 12 },
]

export default function FriendKeyPage() {
  const { t } = useLanguage()
  const [friendKey, setFriendKey] = useState<FriendKeyInfo | null>(null)
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([])
  const availableModels = AVAILABLE_MODELS
  const [loading, setLoading] = useState(true)
  const [showFullKey, setShowFullKey] = useState(false)
  const [fullKey, setFullKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const keyData = await getFriendKey().catch(() => null)
      setFriendKey(keyData)

      if (keyData?.hasKey) {
        const usageData = await getFriendKeyUsage().catch(() => ({ models: [] }))
        setModelUsage(usageData.models)

        const initialLimits: Record<string, number> = {}
        const initialEnabled: Record<string, boolean> = {}
        keyData.modelLimits.forEach(ml => {
          initialLimits[ml.modelId] = ml.limitUsd
          initialEnabled[ml.modelId] = ml.enabled ?? true
        })
        AVAILABLE_MODELS.forEach(m => {
          if (!(m.id in initialLimits)) {
            initialLimits[m.id] = 0
            initialEnabled[m.id] = false
          }
        })
        setLimits(initialLimits)
        setEnabled(initialEnabled)
      } else {
        const initialLimits: Record<string, number> = {}
        const initialEnabled: Record<string, boolean> = {}
        AVAILABLE_MODELS.forEach(m => {
          initialLimits[m.id] = 0
          initialEnabled[m.id] = false
        })
        setLimits(initialLimits)
        setEnabled(initialEnabled)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleShowKey = async () => {
    if (showFullKey) {
      setShowFullKey(false)
      return
    }
    try {
      const key = await getFullFriendKey()
      setFullKey(key)
      setShowFullKey(true)
      setTimeout(() => setShowFullKey(false), 30000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = async (text: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // Fall through to fallback
      }
    }
    // Fallback for older browsers or non-focused document
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      return true
    } finally {
      document.body.removeChild(textArea)
    }
  }

  const handleCopyKey = async () => {
    try {
      const key = fullKey || await getFullFriendKey()
      await copyToClipboard(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const result = await createFriendKey()
      setNewKey(result.friendKey)
      setFullKey(result.friendKey)
      setShowFullKey(true)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRotate = async () => {
    setRotating(true)
    setError(null)
    try {
      const result = await rotateFriendKey()
      setNewKey(result.friendKey)
      setFullKey(result.friendKey)
      setShowFullKey(true)
      setShowRotateConfirm(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRotating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await deleteFriendKey()
      setFriendKey(null)
      setModelUsage([])
      setShowDeleteConfirm(false)
      setNewKey(null)
      setFullKey(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveLimits = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const modelLimits = Object.entries(limits).map(([modelId, limitUsd]) => ({
        modelId,
        limitUsd,
        enabled: enabled[modelId] ?? false,
      }))
      await updateFriendKeyLimits(modelLimits)
      await loadData()
      setSuccess(t.friendKey.limits.saveSuccess)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getUsageTextColor = (percent: number) => {
    if (percent >= 90) return 'text-red-500'
    if (percent >= 70) return 'text-amber-500'
    return 'text-emerald-500'
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[var(--theme-text)] rounded-full animate-spin" />
          <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="relative max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="opacity-0 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--theme-text)]">{t.friendKey.title}</h1>
          <p className="text-[var(--theme-text-subtle)] text-sm mt-1">
            {t.friendKey.subtitle}
          </p>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-400 text-sm font-medium">{t.friendKey.error}</p>
              <p className="text-[var(--theme-text-subtle)] text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 animate-fade-in-up">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-emerald-400 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* New Key Alert */}
        {newKey && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-emerald-400 text-sm font-medium">{t.friendKey.keyGenerated}</p>
              <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.saveKeyWarning}</p>
            </div>
          </div>
        )}

        {/* No Key State */}
        {!friendKey?.hasKey && (
          <div className="p-6 sm:p-8 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] text-center opacity-0 animate-fade-in-up animation-delay-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-2">{t.friendKey.noKey.title}</h2>
            <p className="text-[var(--theme-text-subtle)] text-sm mb-6 max-w-md mx-auto">
              {t.friendKey.noKey.description}
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-3 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium hover:bg-indigo-700 dark:hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.friendKey.noKey.generating}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t.friendKey.noKey.button}
                </>
              )}
            </button>
          </div>
        )}

        {/* Friend Key Card */}
        {friendKey?.hasKey && (
          <>
            <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] opacity-0 animate-fade-in-up animation-delay-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--theme-text)]">{t.friendKey.keyCard.title}</h3>
                    <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.keyCard.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span className="text-emerald-400 text-xs">{t.friendKey.keyCard.active}</span>
                </div>
              </div>

              {/* Key Display */}
              <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-300 dark:border-white/10 p-3 sm:p-4 mb-4">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <code className="text-slate-700 dark:text-[var(--theme-text-muted)] text-xs sm:text-sm font-mono break-all min-w-0">
                    {showFullKey && fullKey ? fullKey : friendKey.friendKey}
                  </code>
                  <button
                    onClick={handleShowKey}
                    className="shrink-0 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-[var(--theme-text-subtle)] hover:text-slate-700 dark:hover:text-[var(--theme-text)] transition-colors"
                  >
                    {showFullKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleCopyKey}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 dark:bg-[var(--theme-text)] text-white dark:text-[var(--theme-bg)] font-medium text-sm hover:bg-indigo-700 dark:hover:opacity-90 transition-colors"
                >
                  {copied ? t.friendKey.keyCard.copied : t.friendKey.keyCard.copyKey}
                </button>
                <button
                  onClick={() => setShowRotateConfirm(true)}
                  className="py-2.5 px-4 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  {t.friendKey.keyCard.rotate}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2.5 px-4 rounded-lg border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  {t.friendKey.keyCard.delete}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-[var(--theme-text-subtle)]">{t.friendKey.keyCard.totalUsed}</p>
                  <p className="text-lg font-semibold text-[var(--theme-text)]">${friendKey.totalUsedUsd.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--theme-text-subtle)]">{t.friendKey.keyCard.requests}</p>
                  <p className="text-lg font-semibold text-[var(--theme-text)]">{friendKey.requestsCount}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--theme-text-subtle)]">{t.friendKey.keyCard.created}</p>
                  <p className="text-sm font-medium text-[var(--theme-text)]">{new Date(friendKey.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Model Limits Card */}
            <div className="p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] opacity-0 animate-fade-in-up animation-delay-300">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--theme-text)]">{t.friendKey.limits.title}</h3>
                    <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.limits.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {availableModels.map(model => {
                  const usage = modelUsage.find(u => u.modelId === model.id)
                  const usedUsd = usage?.usedUsd || 0
                  const limitUsd = limits[model.id] || 0
                  const percent = limitUsd > 0 ? Math.min(100, (usedUsd / limitUsd) * 100) : 0

                  const isEnabled = enabled[model.id] ?? false

                  return (
                    <div key={model.id} className={`p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5' : 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200/50 dark:border-white/5'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => setEnabled({ ...enabled, [model.id]: !isEnabled })}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isEnabled ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-white/20'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <div className={isEnabled ? '' : 'opacity-50'}>
                            <p className="font-medium text-[var(--theme-text)]">{model.name}</p>
                            <p className="text-xs text-[var(--theme-text-subtle)]">
                              ${model.inputPricePerMTok}{t.friendKey.limits.perMInput}, ${model.outputPricePerMTok}{t.friendKey.limits.perMOutput}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isEnabled ? '' : 'opacity-50'}`}>
                          <span className="text-sm text-[var(--theme-text-subtle)]">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={limits[model.id] || ''}
                            onChange={(e) => setLimits({ ...limits, [model.id]: parseFloat(e.target.value) || 0 })}
                            disabled={!isEnabled}
                            className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0a0a] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {isEnabled && limitUsd > 0 && (
                        <div className="space-y-2 ml-12">
                          <div className="flex justify-between text-xs">
                            <span className={getUsageTextColor(percent)}>
                              ${usedUsd.toFixed(2)} / ${limitUsd.toFixed(2)}
                            </span>
                            <span className={getUsageTextColor(percent)}>{percent.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getUsageColor(percent)}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {usage?.isExhausted && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {t.friendKey.limits.limitReached}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Info tip */}
              <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2">
                <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-[var(--theme-text-subtle)]">{t.friendKey.limits.tip}</p>
              </div>

              <button
                onClick={handleSaveLimits}
                disabled={saving}
                className="w-full mt-4 py-2.5 rounded-lg bg-violet-600 dark:bg-violet-500 text-white font-medium text-sm hover:bg-violet-700 dark:hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.friendKey.limits.saving}
                  </>
                ) : (
                  t.friendKey.limits.save
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Rotate Confirm Modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[var(--theme-card)] p-4 sm:p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--theme-text)]">{t.friendKey.rotateModal.title}</h3>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.rotateModal.subtitle}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{t.friendKey.rotateModal.warning1}</span>
              </div>
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t.friendKey.rotateModal.warning2}</span>
              </div>
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t.friendKey.rotateModal.warning3}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors order-2 sm:order-1"
              >
                {t.friendKey.rotateModal.cancel}
              </button>
              <button
                onClick={handleRotate}
                disabled={rotating}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {rotating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t.friendKey.rotateModal.rotating}
                  </>
                ) : (
                  t.friendKey.rotateModal.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[var(--theme-card)] p-4 sm:p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--theme-text)]">{t.friendKey.deleteModal.title}</h3>
                <p className="text-[var(--theme-text-subtle)] text-sm">{t.friendKey.deleteModal.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-[var(--theme-text)] font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors order-2 sm:order-1"
              >
                {t.friendKey.deleteModal.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.friendKey.deleteModal.deleting}
                  </>
                ) : (
                  t.friendKey.deleteModal.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
