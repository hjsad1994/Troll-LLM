'use client'

import Link from 'next/link'
import React, { useState, useMemo } from 'react'
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

function MiniMaxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z"/>
    </svg>
  )
}

function KimiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.738 5.776c.163-.209.306-.4.457-.585.07-.087.064-.153-.004-.244-.655-.861-.717-1.817-.34-2.787.283-.73.909-1.072 1.674-1.145.477-.045.945.004 1.379.236.57.305.902.77 1.01 1.412.086.512.07 1.012-.075 1.508-.257.878-.888 1.333-1.753 1.448-.718.096-1.446.108-2.17.157-.056.004-.113 0-.178 0z"/>
      <path d="M17.962 1.844h-4.326l-3.425 7.81H5.369V1.878H1.5V22h3.87v-8.477h6.824a3.025 3.025 0 002.743-1.75V22h3.87v-8.477a3.87 3.87 0 00-3.588-3.86v-.01h-2.125a3.94 3.94 0 002.323-2.12l2.545-5.689z"/>
    </svg>
  )
}

// ===== MODEL DATA =====
type Provider = 'anthropic' | 'openai' | 'google' | 'minimax' | 'moonshot'
type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'gpt-5' | 'gemini-pro' | 'minimax' | 'kimi' | 'gpt-oss'

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

const models: Model[] = [
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'opus',
    description: 'Most powerful. Exceptional for highly complex tasks and deep analysis.',
    contextLength: 200000,
    inputPrice: 5,
    outputPrice: 25,
    cacheWritePrice: 6.25,
    cacheHitPrice: 0.50,
    billingMultiplier: 1.1,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code'],
    speed: 'powerful',
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'sonnet',
    description: 'Best balance. Ideal for enterprise workloads and coding tasks.',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    cacheWritePrice: 3.75,
    cacheHitPrice: 0.30,
    billingMultiplier: 1.0,
    capabilities: ['vision', 'function-calling', 'code'],
    speed: 'balanced',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'haiku',
    description: 'Fastest and most affordable. Perfect for quick, high-volume tasks.',
    contextLength: 200000,
    inputPrice: 1,
    outputPrice: 5,
    cacheWritePrice: 1.25,
    cacheHitPrice: 0.10,
    billingMultiplier: 1.0,
    capabilities: ['vision', 'function-calling', 'code'],
    speed: 'fast',
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    tier: 'gpt-5',
    description: 'Advanced reasoning model. Perfect for complex problem-solving and deep analysis.',
    contextLength: 128000,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheWritePrice: 1.5625,
    cacheHitPrice: 0.125,
    billingMultiplier: 1.0,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code'],
    speed: 'balanced',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'google',
    tier: 'gemini-pro',
    description: 'Next-gen Google model. Exceptional reasoning and multimodal capabilities.',
    contextLength: 1000000,
    inputPrice: 2.0,
    outputPrice: 12.0,
    cacheWritePrice: 0,
    cacheHitPrice: 0,
    billingMultiplier: 1.0,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code', 'multimodal'],
    speed: 'powerful',
  },
  {
    id: 'minimaxai/minimax-m2',
    name: 'MiniMax M2',
    provider: 'minimax',
    tier: 'minimax',
    description: 'High-performance model with excellent cost efficiency for diverse tasks.',
    contextLength: 128000,
    inputPrice: 0.5,
    outputPrice: 2.0,
    cacheWritePrice: 0,
    cacheHitPrice: 0,
    billingMultiplier: 1.0,
    capabilities: ['function-calling', 'code'],
    speed: 'fast',
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 Instruct',
    provider: 'moonshot',
    tier: 'kimi',
    description: 'Advanced instruction-following model with strong reasoning capabilities.',
    contextLength: 128000,
    inputPrice: 1.0,
    outputPrice: 1.0,
    cacheWritePrice: 0,
    cacheHitPrice: 0,
    billingMultiplier: 1.0,
    capabilities: ['function-calling', 'reasoning', 'code'],
    speed: 'balanced',
  },
  {
    id: 'openai-gpt-oss-20b',
    name: 'OpenAI GPT OSS 20B',
    provider: 'openai',
    tier: 'gpt-oss',
    description: 'Lightweight open-source model. Great for simple tasks at minimal cost.',
    contextLength: 128000,
    inputPrice: 0.07,
    outputPrice: 0.30,
    cacheWritePrice: 0,
    cacheHitPrice: 0,
    billingMultiplier: 1.0,
    capabilities: ['code'],
    speed: 'fast',
  },
  {
    id: 'openai-gpt-oss-120b',
    name: 'OpenAI GPT OSS 120B',
    provider: 'openai',
    tier: 'gpt-oss',
    description: 'Larger open-source model with improved reasoning at low cost.',
    contextLength: 128000,
    inputPrice: 0.15,
    outputPrice: 0.60,
    cacheWritePrice: 0,
    cacheHitPrice: 0,
    billingMultiplier: 1.0,
    capabilities: ['reasoning', 'code'],
    speed: 'balanced',
  },
]

const tierColors = {
  opus: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
  sonnet: { bg: 'from-violet-500 to-purple-600', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
  haiku: { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  'gpt-5': { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10' },
  'gemini-pro': { bg: 'from-pink-500 to-rose-600', text: 'text-pink-400', border: 'border-pink-500/20', glow: 'shadow-pink-500/10' },
  'minimax': { bg: 'from-sky-500 to-indigo-600', text: 'text-sky-400', border: 'border-sky-500/20', glow: 'shadow-sky-500/10' },
  'kimi': { bg: 'from-blue-500 to-cyan-600', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-blue-500/10' },
  'gpt-oss': { bg: 'from-slate-500 to-zinc-600', text: 'text-slate-400', border: 'border-slate-500/20', glow: 'shadow-slate-500/10' },
}

const providerColors = {
  anthropic: 'text-orange-400',
  openai: 'text-cyan-400',
  google: 'text-pink-400',
  minimax: 'text-sky-400',
  moonshot: 'text-blue-400',
}

function getProviderIcon(provider: Provider, className?: string) {
  switch (provider) {
    case 'anthropic':
      return <AnthropicIcon className={className} />
    case 'openai':
      return <OpenAIIcon className={className} />
    case 'google':
      return <GoogleIcon className={className} />
    case 'minimax':
      return <MiniMaxIcon className={className} />
    case 'moonshot':
      return <KimiIcon className={className} />
  }
}

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(0)}`
}

// ===== PROVIDER FILTER =====
const providers: { id: Provider | 'all'; name: string; icon?: React.ReactNode }[] = [
  { id: 'all', name: 'All' },
  { id: 'anthropic', name: 'Anthropic', icon: <AnthropicIcon className="w-4 h-4" /> },
  { id: 'openai', name: 'OpenAI', icon: <OpenAIIcon className="w-4 h-4" /> },
  { id: 'google', name: 'Google', icon: <GoogleIcon className="w-4 h-4" /> },
  { id: 'minimax', name: 'MiniMax', icon: <MiniMaxIcon className="w-4 h-4" /> },
  { id: 'moonshot', name: 'Moonshot', icon: <KimiIcon className="w-4 h-4" /> },
]

// ===== MAIN PAGE =====
export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<Provider | 'all'>('all')
  const { t } = useLanguage()

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
  }, [searchQuery, selectedProvider])

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]">
      <Header activeLink="models" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        {/* Background with grid - Same as Homepage */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
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
              <div className="text-2xl font-bold text-[var(--theme-text)]">{models.length}</div>
              <div className="text-[var(--theme-text-subtle)] text-sm">{t.models.stats.models}</div>
            </div>
            <div className="h-8 w-px bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--theme-text)]">5</div>
              <div className="text-[var(--theme-text-subtle)] text-sm">{t.models.stats.providers}</div>
            </div>
            <div className="h-8 w-px bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-3">
                <AnthropicIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <OpenAIIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                <GoogleIcon className="w-5 h-5 text-pink-500 dark:text-pink-400" />
                <MiniMaxIcon className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <KimiIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-[var(--theme-text-subtle)] text-sm mt-1">{t.models.stats.available}</div>
            </div>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedProvider === provider.id
                    ? 'bg-[var(--theme-text)] text-[var(--theme-bg)]'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--theme-text-muted)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--theme-text)] border border-black/5 dark:border-white/5'
                }`}
              >
                {provider.icon && <span className={selectedProvider === provider.id ? 'text-[var(--theme-bg)]' : providerColors[provider.id as Provider]}>{provider.icon}</span>}
                {provider.name}
                {provider.id === 'all' && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${selectedProvider === 'all' ? 'bg-[var(--theme-bg)]/20 text-[var(--theme-bg)]' : 'bg-black/10 dark:bg-white/10 text-[var(--theme-text-subtle)]'}`}>
                    {models.length}
                  </span>
                )}
                {provider.id !== 'all' && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${selectedProvider === provider.id ? 'bg-[var(--theme-bg)]/20 text-[var(--theme-bg)]' : 'bg-black/10 dark:bg-white/10 text-[var(--theme-text-subtle)]'}`}>
                    {models.filter(m => m.provider === provider.id).length}
                  </span>
                )}
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
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-[var(--theme-text)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-black/10 dark:focus:border-white/10 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Models Table */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/[0.03] dark:bg-white/[0.03]">
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
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredModels.map((model) => {
                    const colors = tierColors[model.tier]
                    const providerColor = providerColors[model.provider]
                    return (
                      <tr key={model.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        {/* Model Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 sm:hidden">
                              {getProviderIcon(model.provider, `w-4 h-4 ${providerColor}`)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--theme-text)] font-medium">{model.name}</span>
                                {(model.id === 'gpt-5.1' || model.id === 'gemini-3-pro-preview') && (
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
                                    : 'bg-black/10 dark:bg-white/10'
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
                                className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[var(--theme-text-subtle)] text-[10px] capitalize"
                              >
                                {cap}
                              </span>
                            ))}
                            {model.capabilities.length > 3 && (
                              <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[var(--theme-text-subtle)] text-[10px]">
                                +{model.capabilities.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* API ID */}
                        <td className="px-4 py-4 hidden xl:table-cell">
                          <code className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[var(--theme-text-muted)] text-xs font-mono">{model.id}</code>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredModels.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-[var(--theme-text-subtle)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-[var(--theme-text)] mb-1">{t.models.empty.title}</h3>
              <p className="text-[var(--theme-text-subtle)] text-sm">{t.models.empty.description}</p>
            </div>
          )}

          {/* Launch Promotion Banner */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-1">
                  {t.models.promotion.title}
                </p>
                <p className="text-[var(--theme-text-muted)] text-sm">
                  {t.models.promotion.description} <strong className="text-[var(--theme-text)]">1x</strong> {t.models.promotion.original}, {t.models.promotion.opus} <strong className="text-[var(--theme-text)]">1.1x</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-black/5 dark:border-white/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--theme-text)] mb-4">
            {t.models.ctaTitle}
          </h2>
          <p className="text-lg text-[var(--theme-text-subtle)] mb-8">
            {t.models.ctaDescription}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-[var(--theme-text)] text-[var(--theme-bg)] font-semibold hover:opacity-90 transition-colors">
              {t.models.getApiKey}
            </Link>
            <Link href="/docs" className="px-8 py-4 rounded-xl border border-black/10 dark:border-white/10 text-[var(--theme-text)] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              {t.models.viewDocs}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-black/5 dark:border-white/5">
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
