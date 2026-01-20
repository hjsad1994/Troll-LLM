'use client'

import Link from 'next/link'
import React, { useState, useMemo, useEffect } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

// ===== PROVIDER ICONS =====
function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0H10.172L16.74 20.48h-3.603l-1.283-3.36H5.697l-1.283 3.36H.852L6.569 3.52zm.831 10.56h4.097L9.447 8.12l-2.047 5.96z"/>
    </svg>
  )
}

function OpenAIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function OtherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

// ===== TYPES =====
type Provider = 'anthropic' | 'openai' | 'google' | 'other'
type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'gpt-5' | 'gemini-pro' | 'other'

interface ApiModel {
  id: string
  name: string
  type: string
  reasoning?: string
  inputPricePerMTok: number
  outputPricePerMTok: number
  cacheWritePricePerMTok: number
  cacheHitPricePerMTok: number
  billingMultiplier: number
}

interface Model {
  id: string
  name: string
  provider: Provider
  tier: ModelTier
  description: string
  contextLength: number
  inputPrice: number
  outputPrice: number
  cacheWritePrice: number
  cacheHitPrice: number
  billingMultiplier: number
  capabilities: string[]
  speed: 'fast' | 'balanced' | 'powerful'
}

// ===== HELPER FUNCTIONS =====
function getProviderFromId(id: string, type?: string): Provider {
  if (id.startsWith('claude-')) return 'anthropic'
  if (id.startsWith('gpt-') || id.startsWith('o3') || id.startsWith('o4')) return 'openai'
  if (id.startsWith('gemini-')) return 'google'
  if (type === 'anthropic') return 'anthropic'
  if (type === 'openai') return 'openai'
  if (type === 'google') return 'google'
  return 'other'
}

function getTierFromId(id: string): ModelTier {
  if (id.includes('opus')) return 'opus'
  if (id.includes('sonnet')) return 'sonnet'
  if (id.includes('haiku')) return 'haiku'
  if (id.startsWith('gpt-')) return 'gpt-5'
  if (id.startsWith('gemini-')) return 'gemini-pro'
  return 'other'
}

function getContextLength(id: string): number {
  if (id.startsWith('claude-')) return 200000
  if (id.startsWith('gemini-')) return 1000000
  if (id === 'gpt-5.2-codex') return 400000
  if (id.startsWith('gpt-5.1') || id.startsWith('gpt-5.2')) return 272000
  return 128000
}

function getCapabilities(id: string, reasoning?: string): string[] {
  const caps = ['code']
  if (id.startsWith('claude-') || id.startsWith('gpt-') || id.startsWith('gemini-')) {
    caps.push('vision', 'function-calling')
  }
  if (reasoning === 'high') {
    caps.push('reasoning')
  }
  if (id.startsWith('gemini-')) {
    caps.push('multimodal')
  }
  return caps
}

function getSpeed(id: string): 'fast' | 'balanced' | 'powerful' {
  if (id.includes('haiku')) return 'fast'
  if (id.includes('opus') || id.startsWith('gemini-')) return 'powerful'
  return 'balanced'
}

function getDescription(id: string, name: string): string {
  if (id.includes('opus')) return 'Most powerful. Exceptional for highly complex tasks and deep analysis.'
  if (id.includes('sonnet')) return 'Best balance. Ideal for enterprise workloads and coding tasks.'
  if (id.includes('haiku')) return 'Fastest and most affordable. Perfect for quick, high-volume tasks.'
  if (id.startsWith('gpt-5.2')) return 'Latest GPT-5 series. Advanced reasoning and coding capabilities.'
  if (id.startsWith('gpt-5.1')) return 'Advanced reasoning model. Perfect for complex problem-solving.'
  if (id.startsWith('gemini-')) return 'Next-gen Google model. Exceptional reasoning and multimodal capabilities.'
  if (id.startsWith('glm-')) return 'Zhipu AI efficient model for general tasks.'
  if (id.startsWith('kimi-')) return 'Moonshot AI powerful reasoning and coding model.'
  return `${name} - High performance LLM model.`
}

function transformApiModel(apiModel: ApiModel): Model {
  const provider = getProviderFromId(apiModel.id, apiModel.type)
  return {
    id: apiModel.id,
    name: apiModel.name,
    provider,
    tier: getTierFromId(apiModel.id),
    description: getDescription(apiModel.id, apiModel.name),
    contextLength: getContextLength(apiModel.id),
    inputPrice: apiModel.inputPricePerMTok,
    outputPrice: apiModel.outputPricePerMTok,
    cacheWritePrice: apiModel.cacheWritePricePerMTok,
    cacheHitPrice: apiModel.cacheHitPricePerMTok,
    billingMultiplier: apiModel.billingMultiplier,
    capabilities: getCapabilities(apiModel.id, apiModel.reasoning),
    speed: getSpeed(apiModel.id),
  }
}

const tierColors: Record<ModelTier, { bg: string; text: string; border: string; glow: string }> = {
  opus: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
  sonnet: { bg: 'from-violet-500 to-purple-600', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
  haiku: { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  'gpt-5': { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10' },
  'gemini-pro': { bg: 'from-pink-500 to-rose-600', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', glow: 'shadow-pink-500/10' },
  'other': { bg: 'from-violet-500 to-purple-600', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
}

const providerColors: Record<Provider, string> = {
  anthropic: 'text-orange-600 dark:text-orange-400',
  openai: 'text-cyan-600 dark:text-cyan-400',
  google: 'text-pink-600 dark:text-pink-400',
  other: 'text-violet-600 dark:text-violet-400',
}

function getProviderIcon(provider: Provider, className?: string) {
  switch (provider) {
    case 'anthropic':
      return <AnthropicIcon className={className} />
    case 'openai':
      return <OpenAIIcon className={className} />
    case 'google':
      return <GoogleIcon className={className} />
    case 'other':
      return <OtherIcon className={className} />
  }
}

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`
  if (Number.isInteger(price)) return `$${price.toFixed(0)}`
  return `$${price.toFixed(2)}`
}

// ===== PROVIDER FILTER =====
const providers: { id: Provider | 'all'; name: string; icon?: React.ReactNode }[] = [
  { id: 'all', name: 'All' },
  { id: 'anthropic', name: 'Anthropic', icon: <AnthropicIcon className="w-4 h-4" /> },
  { id: 'openai', name: 'OpenAI', icon: <OpenAIIcon className="w-4 h-4" /> },
  { id: 'google', name: 'Google', icon: <GoogleIcon className="w-4 h-4" /> },
  { id: 'other', name: 'Other', icon: <OtherIcon className="w-4 h-4" /> },
]

// ===== MAIN PAGE =====
export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<Provider | 'all'>('all')
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    // Use static fallback data from config-openhands-prod.json
    // All models enabled
    const fallbackModels: ApiModel[] = [
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', type: 'openhands', reasoning: 'high', inputPricePerMTok: 5.0, outputPricePerMTok: 25.0, cacheWritePricePerMTok: 6.25, cacheHitPricePerMTok: 0.5, billingMultiplier: 1.04 },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', type: 'openhands', reasoning: 'high', inputPricePerMTok: 3.0, outputPricePerMTok: 15.0, cacheWritePricePerMTok: 3.75, cacheHitPricePerMTok: 0.3, billingMultiplier: 1.04 },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', type: 'openhands', reasoning: 'high', inputPricePerMTok: 2.0, outputPricePerMTok: 12.0, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0.5, billingMultiplier: 1.04 },
      // { id: 'glm-4.6', name: 'GLM-4.6', type: 'openhands', reasoning: 'medium', inputPricePerMTok: 0.6, outputPricePerMTok: 2.2, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0.08, billingMultiplier: 1.04 },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', type: 'openhands', reasoning: 'low', inputPricePerMTok: 1.0, outputPricePerMTok: 5.0, cacheWritePricePerMTok: 1.25, cacheHitPricePerMTok: 0.1, billingMultiplier: 1.04 },
      { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', type: 'openhands', reasoning: 'high', inputPricePerMTok: 1.25, outputPricePerMTok: 10.0, cacheWritePricePerMTok: 1.56, cacheHitPricePerMTok: 0.13, billingMultiplier: 1.04 },
      { id: 'gpt-5.1', name: 'GPT 5.1', type: 'openhands', reasoning: 'high', inputPricePerMTok: 1.25, outputPricePerMTok: 10.0, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0.13, billingMultiplier: 1.04 },
      { id: 'gpt-5.2', name: 'GPT-5.2', type: 'openhands', reasoning: 'high', inputPricePerMTok: 1.75, outputPricePerMTok: 14.0, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0.17, billingMultiplier: 1.04 },
      { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', type: 'openhands', reasoning: 'high', inputPricePerMTok: 1.75, outputPricePerMTok: 14.0, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0.17, billingMultiplier: 1.04 },
      { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking', type: 'openhands', reasoning: 'high', inputPricePerMTok: 0.6, outputPricePerMTok: 2.5, cacheWritePricePerMTok: 0, cacheHitPricePerMTok: 0, billingMultiplier: 1.04 },
    ]
    setModels(fallbackModels.map(transformApiModel))
    setLoading(false)
  }, [])

  const filteredModels = useMemo(() => {
    let result = models

    // Filter by provider
    if (selectedProvider !== 'all') {
      result = result.filter((m) => m.provider === selectedProvider)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
      )
    }

    return result
  }, [models, searchQuery, selectedProvider])

  const providerCounts = useMemo(() => {
    return {
      all: models.length,
      anthropic: models.filter(m => m.provider === 'anthropic').length,
      openai: models.filter(m => m.provider === 'openai').length,
      google: models.filter(m => m.provider === 'google').length,
      other: models.filter(m => m.provider === 'other').length,
    }
  }, [models])

  const uniqueProviders = useMemo(() => {
    const providerSet = new Set(models.map(m => m.provider))
    return providerSet.size
  }, [models])

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]">
      <Header activeLink="models" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        {/* Background with grid - Same as Homepage */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.15)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[var(--theme-text-muted)] text-sm">{t.models.badge}</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-4">
              {t.models.title}
            </h1>
            <p className="text-lg text-[var(--theme-text-subtle)] max-w-xl mx-auto">
              {t.models.description}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--theme-text)]">{loading ? '...' : models.length}</div>
              <div className="text-[var(--theme-text-subtle)] text-sm">{t.models.stats.models}</div>
            </div>
            <div className="h-8 w-px bg-gray-300 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--theme-text)]">{loading ? '...' : uniqueProviders}</div>
              <div className="text-[var(--theme-text-subtle)] text-sm">{t.models.stats.providers}</div>
            </div>
            <div className="h-8 w-px bg-gray-300 dark:bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-3">
                <AnthropicIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <OpenAIIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                <GoogleIcon className="w-5 h-5 text-pink-500 dark:text-pink-400" />
              </div>
              <div className="text-[var(--theme-text-subtle)] text-sm mt-1">{t.models.stats.available}</div>
            </div>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {providers.filter(p => p.id === 'all' || providerCounts[p.id] > 0).map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedProvider === provider.id
                    ? 'bg-[var(--theme-text)] text-[var(--theme-bg)] shadow-md'
                    : 'bg-white dark:bg-white/5 text-[var(--theme-text-muted)] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[var(--theme-text)] border border-gray-200 dark:border-white/5 shadow-sm'
                }`}
              >
                {provider.icon && <span className={selectedProvider === provider.id ? 'text-[var(--theme-bg)]' : providerColors[provider.id as Provider]}>{provider.icon}</span>}
                {provider.name}
                <span className={`px-1.5 py-0.5 rounded text-xs ${selectedProvider === provider.id ? 'bg-[var(--theme-bg)]/20 text-[var(--theme-bg)]' : 'bg-gray-100 dark:bg-white/10 text-[var(--theme-text-subtle)]'}`}>
                  {providerCounts[provider.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.models.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-gray-400 dark:focus:border-white/10 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Models Table */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="ml-3 text-[var(--theme-text-muted)]">Loading models...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-[var(--theme-text)] mb-1">Error loading models</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm">{error}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden bg-white dark:bg-transparent shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.03]">
                      <th className="text-left px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium">{t.models.table.model}</th>
                      <th className="text-left px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium hidden sm:table-cell">{t.models.table.provider}</th>
                      <th className="text-center px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium">{t.models.table.context}</th>
                      <th className="text-right px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium">{t.models.table.input}</th>
                      <th className="text-right px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium">{t.models.table.output}</th>
                      <th className="text-center px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium hidden md:table-cell">{t.models.table.speed}</th>
                      <th className="text-center px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium hidden lg:table-cell">{t.models.table.capabilities}</th>
                      <th className="text-left px-4 py-4 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider font-medium hidden xl:table-cell">{t.models.table.apiId}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredModels.map((model) => {
                      const colors = tierColors[model.tier]
                      const providerColor = providerColors[model.provider]
                      return (
                        <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                          {/* Model Name */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 sm:hidden">
                                {getProviderIcon(model.provider, `w-4 h-4 ${providerColor}`)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--theme-text)] font-medium">{model.name}</span>
                                  {(model.id.includes('5.2') || model.id.includes('kimi') || model.id.includes('glm')) && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">New</span>
                                  )}
                                </div>
                                <p className="text-[var(--theme-text-subtle)] text-xs mt-0.5 max-w-[200px] truncate hidden sm:block">{model.description}</p>
                              </div>
                            </div>
                          </td>
                          {/* Provider */}
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              {getProviderIcon(model.provider, `w-4 h-4 ${providerColor}`)}
                              <span className="text-[var(--theme-text-muted)] text-sm capitalize">{model.provider}</span>
                            </div>
                          </td>
                          {/* Context Length */}
                          <td className="px-4 py-4 text-center">
                            <span className="text-[var(--theme-text)] text-sm">{(model.contextLength / 1000).toFixed(0)}K</span>
                          </td>
                          {/* Input Price */}
                          <td className="px-4 py-4 text-right">
                            <span className={`font-medium text-sm ${colors.text}`}>{formatPrice(model.inputPrice)}</span>
                          </td>
                          {/* Output Price */}
                          <td className="px-4 py-4 text-right">
                            <span className={`font-medium text-sm ${colors.text}`}>{formatPrice(model.outputPrice)}</span>
                          </td>
                          {/* Speed */}
                          <td className="px-4 py-4 text-center hidden md:table-cell">
                            <div className="flex items-center justify-center gap-1">
                              {['fast', 'balanced', 'powerful'].map((speed, i) => (
                                <div
                                  key={speed}
                                  className={`w-2 h-2 rounded-full ${
                                    (model.speed === 'fast' && i === 0) ||
                                    (model.speed === 'balanced' && i <= 1) ||
                                    (model.speed === 'powerful' && i <= 2)
                                      ? `bg-gradient-to-r ${colors.bg}`
                                      : 'bg-gray-200 dark:bg-white/10'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                          {/* Capabilities */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {model.capabilities.slice(0, 3).map((cap) => (
                                <span
                                  key={cap}
                                  className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border-2 border-gray-400 dark:border-white/20 text-gray-800 dark:text-[var(--theme-text-subtle)] text-[10px] capitalize font-semibold shadow-sm"
                                >
                                  {cap}
                                </span>
                              ))}
                              {model.capabilities.length > 3 && (
                                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border-2 border-gray-400 dark:border-white/20 text-gray-800 dark:text-[var(--theme-text-subtle)] text-[10px] font-semibold shadow-sm">
                                  +{model.capabilities.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* API ID */}
                          <td className="px-4 py-4 hidden xl:table-cell whitespace-nowrap">
                            <code className="px-2 py-1 rounded-md bg-white dark:bg-white/5 border-2 border-gray-400 dark:border-white/20 text-gray-800 dark:text-[var(--theme-text-muted)] text-xs font-mono shadow-sm whitespace-nowrap">{model.id}</code>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredModels.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-[var(--theme-text-subtle)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-[var(--theme-text)] mb-1">{t.models.empty.title}</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm">{t.models.empty.description}</p>
            </div>
          )}

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-gray-200 dark:border-white/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--theme-text)] mb-4">
            {t.models.ctaTitle}
          </h2>
          <p className="text-lg text-[var(--theme-text-subtle)] mb-8">
            {t.models.ctaDescription}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-[var(--theme-text)] text-[var(--theme-bg)] font-semibold hover:opacity-90 transition-colors shadow-lg">
              {t.models.getApiKey}
            </Link>
            <Link href="/docs" className="px-8 py-4 rounded-xl border border-gray-200 dark:border-white/10 text-[var(--theme-text)] font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm">
              {t.models.viewDocs}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {/* Footer Logo Icon */}
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md rotate-6" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                    <path d="M12 3c2.5 0 5 4 5 9" />
                    <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </div>
              <span className="text-lg font-bold text-[var(--theme-text)] tracking-tight">
                Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
              </span>
              <span className="text-[var(--theme-text-subtle)] text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-6 text-[var(--theme-text-subtle)] text-sm">
              <Link href="/" className="hover:text-[var(--theme-text)] transition-colors">{t.models.home}</Link>
              <a href="#" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.privacy}</a>
              <a href="#" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.terms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
