'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface Model {
  name: string
  id: string
  type: 'anthropic' | 'openai' | 'google' | 'openhands'
  reasoning: string
  thinking_budget?: number
  input_price_per_mtok: number
  output_price_per_mtok: number
  cache_write_price_per_mtok: number
  cache_hit_price_per_mtok: number
  billing_multiplier: number
  upstream: string
  upstream_model_id?: string
  context?: string
  capabilities?: string[]
  description?: string
  isPriority?: boolean
  priorityMultiplier?: number
}

// Models configuration from goproxy config
const models: Model[] = [
  {
    name: 'Claude Opus 4.5',
    id: 'claude-opus-4-5-20251101',
    type: 'anthropic',
    reasoning: 'high',
    thinking_budget: 31999,
    input_price_per_mtok: 5.0,
    output_price_per_mtok: 25.0,
    cache_write_price_per_mtok: 6.25,
    cache_hit_price_per_mtok: 0.50,
    billing_multiplier: 1.1,
    upstream: 'main',
    upstream_model_id: 'claude-opus-4.5',
    context: '200K',
    capabilities: ['Vision', 'Function-calling', 'Reasoning'],
    description: 'Most powerful. Exceptional for highly complex tasks',
    priorityMultiplier: 1.1
  },
  {
    name: 'Claude Sonnet 4.5',
    id: 'claude-sonnet-4-5-20250929',
    type: 'anthropic',
    reasoning: 'high',
    thinking_budget: 31999,
    input_price_per_mtok: 3.0,
    output_price_per_mtok: 15.0,
    cache_write_price_per_mtok: 3.75,
    cache_hit_price_per_mtok: 0.30,
    billing_multiplier: 1.1,
    upstream: 'main',
    upstream_model_id: 'claude-sonnet-4.5',
    context: '200K',
    capabilities: ['Vision', 'Function-calling', 'Code'],
    description: 'Best balance. Ideal for enterprise workloads and coding',
    priorityMultiplier: 1.1
  },
  {
    name: 'Claude Haiku 4.5',
    id: 'claude-haiku-4-5-20251001',
    type: 'anthropic',
    reasoning: 'high',
    thinking_budget: 8000,
    input_price_per_mtok: 1.0,
    output_price_per_mtok: 5.0,
    cache_write_price_per_mtok: 1.25,
    cache_hit_price_per_mtok: 0.10,
    billing_multiplier: 1.3,
    upstream: 'troll',
    context: '200K',
    capabilities: ['Vision', 'Function-calling', 'Code'],
    description: 'Fastest and most affordable for high-volume tasks',
    priorityMultiplier: 1.1
  },
  {
    name: 'GPT-5.1',
    id: 'gpt-5.1',
    type: 'openai',
    reasoning: 'high',
    input_price_per_mtok: 1.25,
    output_price_per_mtok: 10.0,
    cache_write_price_per_mtok: 1.4625,
    cache_hit_price_per_mtok: 0.125,
    billing_multiplier: 1.05,
    upstream: 'main',
    context: '128K',
    capabilities: ['Vision', 'Function-calling', 'Reasoning'],
    description: 'Advanced reasoning model for complex problem-solving',
    priorityMultiplier: 1.05
  },
  {
    name: 'GPT-5.1 Codex Max',
    id: 'gpt-5.1-codex-max',
    type: 'openai',
    reasoning: 'high',
    input_price_per_mtok: 2.0,
    output_price_per_mtok: 16.0,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.2,
    billing_multiplier: 1.1,
    upstream: 'openhands',
    context: '128K',
    capabilities: ['Code', 'Reasoning'],
    description: 'Enhanced GPT-5.1 optimized for code generation',
    isPriority: true,
    priorityMultiplier: 1.1
  },
  {
    name: 'Gemini 3 Pro Preview',
    id: 'gemini-3-pro-preview',
    type: 'google',
    reasoning: 'high',
    input_price_per_mtok: 2.0,
    output_price_per_mtok: 12.0,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.2,
    billing_multiplier: 1.1,
    upstream: 'main',
    context: '1000K',
    capabilities: ['Vision', 'Function-calling', 'Reasoning', 'Multimodal'],
    description: 'Next-gen Google model with exceptional reasoning',
    priorityMultiplier: 1.1
  },
  {
    name: 'Qwen3 Coder 480B',
    id: 'qwen3-coder-480b',
    type: 'openhands',
    reasoning: 'high',
    input_price_per_mtok: 0.5,
    output_price_per_mtok: 2.0,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.05,
    billing_multiplier: 1.0,
    upstream: 'openhands',
    context: '128K',
    capabilities: ['Code', 'Reasoning'],
    description: 'Alibaba massive coding model with 480B parameters',
    isPriority: true
  },
  {
    name: 'Kimi K2',
    id: 'kimi-k2-0711-preview',
    type: 'openhands',
    reasoning: 'high',
    input_price_per_mtok: 0.3,
    output_price_per_mtok: 1.5,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.03,
    billing_multiplier: 1.0,
    upstream: 'openhands',
    context: '128K',
    capabilities: ['Code', 'Reasoning'],
    description: 'Moonshot AI powerful reasoning and coding model',
    isPriority: true
  },
  {
    name: 'Kimi K2 Thinking',
    id: 'kimi-k2-thinking',
    type: 'openhands',
    reasoning: 'high',
    input_price_per_mtok: 0.5,
    output_price_per_mtok: 2.5,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.05,
    billing_multiplier: 1.0,
    upstream: 'openhands',
    context: '128K',
    capabilities: ['Code', 'Reasoning', 'Chain-of-thought'],
    description: 'Kimi K2 with enhanced thinking capabilities',
    isPriority: true
  },
  {
    name: 'GLM-4.6',
    id: 'glm-4.6',
    type: 'openhands',
    reasoning: 'medium',
    input_price_per_mtok: 0.2,
    output_price_per_mtok: 1.0,
    cache_write_price_per_mtok: 0,
    cache_hit_price_per_mtok: 0.02,
    billing_multiplier: 1.0,
    upstream: 'openhands',
    context: '128K',
    capabilities: ['Code', 'Multilingual'],
    description: 'Zhipu AI efficient model for general tasks',
    isPriority: true
  }
]

function getProviderColor(type: string) {
  switch (type) {
    case 'anthropic':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'openai':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'google':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'openhands':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
}

function getProviderIcon(type: string) {
  if (type === 'anthropic') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 10.69L8.453 7.687l-2.248 6.52h4.496z"/>
      </svg>
    )
  }
  if (type === 'google') {
    // Google/Gemini icon
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  }
  if (type === 'openhands') {
    // OpenHands/Priority icon (lightning bolt)
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }
  // OpenAI/GPT icon
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

function getProviderName(type: string) {
  switch (type) {
    case 'anthropic':
      return 'Anthropic'
    case 'openai':
      return 'OpenAI'
    case 'google':
      return 'Google'
    case 'openhands':
      return 'Priority'
    default:
      return type
  }
}

export default function ModelsPage() {
  const [filter, setFilter] = useState<'all' | 'anthropic' | 'openai' | 'google' | 'other'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { t } = useLanguage()

  const filteredModels = filter === 'all'
    ? models
    : filter === 'other'
      ? models.filter(m => m.type === 'openhands')
      : models.filter(m => m.type === filter)

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const anthropicCount = models.filter(m => m.type === 'anthropic').length
  const openaiCount = models.filter(m => m.type === 'openai').length
  const googleCount = models.filter(m => m.type === 'google').length
  const otherCount = models.filter(m => m.type === 'openhands').length

  return (
    <div className="min-h-screen">
      <div className="relative max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="pt-4 sm:pt-8 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">{t.dashboardModels.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--theme-text)] mb-1 sm:mb-2">
            {t.dashboardModels.title}
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-sm sm:text-base">
            {t.dashboardModels.subtitle}
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 opacity-0 animate-fade-in-up animation-delay-100">
          <div className="p-3 sm:p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{models.length}</p>
                <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-sm truncate">{t.dashboardModels.stats.total}</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 10.69L8.453 7.687l-2.248 6.52h4.496z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{anthropicCount}</p>
                <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-sm truncate">{t.dashboardModels.stats.anthropic}</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{openaiCount}</p>
                <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-sm truncate">{t.dashboardModels.stats.openai}</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{googleCount}</p>
                <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-sm truncate">{t.dashboardModels.stats.google}</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{otherCount}</p>
                <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-sm truncate">Other</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap opacity-0 animate-fade-in-up animation-delay-200 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10'
            }`}
          >
            {t.dashboardModels.filters.all} ({models.length})
          </button>
          <button
            onClick={() => setFilter('anthropic')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'anthropic'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10'
            }`}
          >
            Anthropic ({anthropicCount})
          </button>
          <button
            onClick={() => setFilter('openai')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'openai'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10'
            }`}
          >
            OpenAI ({openaiCount})
          </button>
          <button
            onClick={() => setFilter('google')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'google'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10'
            }`}
          >
            Google ({googleCount})
          </button>
          <button
            onClick={() => setFilter('other')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'other'
                ? 'bg-violet-500 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[var(--theme-text-muted)] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10'
            }`}
          >
            Other ({otherCount})
          </button>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 pb-6 sm:pb-8">
          {filteredModels.map((model, index) => (
            <div
              key={model.id}
              className={`p-4 sm:p-5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.06] shadow-sm dark:shadow-none transition-all opacity-0 animate-fade-in-up`}
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              {/* Model Header */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border shrink-0 ${getProviderColor(model.type)}`}>
                    {getProviderIcon(model.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--theme-text)] truncate">{model.name}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getProviderColor(model.type)}`}>
                        {getProviderName(model.type)}
                      </span>
                      {model.reasoning === 'high' && (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Reasoning
                        </span>
                      )}
                      {model.isPriority && (
                        <span
                          className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 cursor-help"
                          title="Model này chỉ có trên Priority Endpoint (priority-chat.trollllm.xyz)"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Priority Only
                        </span>
                      )}
                      {model.priorityMultiplier && !model.isPriority && (
                        <span
                          className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1 cursor-help"
                          title={`Model này hỗ trợ Priority Endpoint với hệ số nhân ${model.priorityMultiplier}x`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          +Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Model ID */}
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs sm:text-sm font-mono text-slate-600 dark:text-[var(--theme-text-muted)] truncate">
                    {model.id}
                  </code>
                  <button
                    onClick={() => handleCopyId(model.id)}
                    className="shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-[var(--theme-text-subtle)] hover:text-slate-700 dark:hover:text-[var(--theme-text)] transition-colors"
                    title="Copy Model ID"
                  >
                    {copiedId === model.id ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">{t.dashboardModels.card.input}</p>
                  <p className="text-[var(--theme-text)] text-xs sm:text-sm font-semibold">${model.input_price_per_mtok.toFixed(2)}<span className="text-[10px] sm:text-xs text-[var(--theme-text-subtle)] font-normal">{t.dashboardModels.card.perMTok}</span></p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">{t.dashboardModels.card.output}</p>
                  <p className="text-[var(--theme-text)] text-xs sm:text-sm font-semibold">${model.output_price_per_mtok.toFixed(2)}<span className="text-[10px] sm:text-xs text-[var(--theme-text-subtle)] font-normal">{t.dashboardModels.card.perMTok}</span></p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">{t.dashboardModels.card.cacheWrite}</p>
                  <p className="text-[var(--theme-text)] text-xs sm:text-sm font-semibold">${model.cache_write_price_per_mtok.toFixed(2)}<span className="text-[10px] sm:text-xs text-[var(--theme-text-subtle)] font-normal">{t.dashboardModels.card.perMTok}</span></p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">{t.dashboardModels.card.cacheHit}</p>
                  <p className="text-[var(--theme-text)] text-xs sm:text-sm font-semibold">${model.cache_hit_price_per_mtok.toFixed(2)}<span className="text-[10px] sm:text-xs text-[var(--theme-text-subtle)] font-normal">{t.dashboardModels.card.perMTok}</span></p>
                </div>
              </div>

              {/* Priority Note */}
              {model.priorityMultiplier && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <p className="text-[var(--theme-text-subtle)] text-[10px] sm:text-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-cyan-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Hỗ trợ Priority Endpoint với hệ số nhân <strong className="text-cyan-600 dark:text-cyan-400">{model.priorityMultiplier}x</strong></span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-300 dark:border-white/10 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 opacity-0 animate-fade-in-up animation-delay-600 mb-6 sm:mb-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-[var(--theme-text)] font-semibold mb-1 text-sm sm:text-base">{t.dashboardModels.info.title}</h4>
              <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">
                {t.dashboardModels.info.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
