'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import Header from '@/components/Header'

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

// ===== MODEL DATA =====
type Provider = 'anthropic' | 'openai' | 'google'
type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'gpt-5' | 'gemini-pro'

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
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'opus',
    description: 'Most powerful. Exceptional for highly complex tasks and deep analysis.',
    contextLength: 200000,
    inputPrice: 5,
    outputPrice: 25,
    cacheWritePrice: 6.25,
    cacheHitPrice: 0.50,
    billingMultiplier: 1.35,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code'],
    speed: 'powerful',
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'sonnet',
    description: 'Best balance. Ideal for enterprise workloads and coding tasks.',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    cacheWritePrice: 3.75,
    cacheHitPrice: 0.30,
    billingMultiplier: 1.25,
    capabilities: ['vision', 'function-calling', 'code'],
    speed: 'balanced',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'haiku',
    description: 'Fastest and most affordable. Perfect for quick, high-volume tasks.',
    contextLength: 200000,
    inputPrice: 1,
    outputPrice: 5,
    cacheWritePrice: 1.25,
    cacheHitPrice: 0.10,
    billingMultiplier: 1.25,
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
    billingMultiplier: 1.3,
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
    billingMultiplier: 1.3,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code', 'multimodal'],
    speed: 'powerful',
  },
]

const tierColors = {
  opus: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
  sonnet: { bg: 'from-violet-500 to-purple-600', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
  haiku: { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  'gpt-5': { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10' },
  'gemini-pro': { bg: 'from-pink-500 to-rose-600', text: 'text-pink-400', border: 'border-pink-500/20', glow: 'shadow-pink-500/10' },
}

const providerColors = {
  anthropic: 'text-orange-400',
  openai: 'text-cyan-400',
  google: 'text-pink-400',
}

function getProviderIcon(provider: Provider, className?: string) {
  switch (provider) {
    case 'anthropic':
      return <AnthropicIcon className={className} />
    case 'openai':
      return <OpenAIIcon className={className} />
    case 'google':
      return <GoogleIcon className={className} />
  }
}

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(0)}`
}

// ===== COMPACT MODEL ROW =====
function ModelRow({ model, isExpanded, onToggle }: { model: Model; isExpanded: boolean; onToggle: () => void }) {
  const colors = tierColors[model.tier]
  const providerColor = providerColors[model.provider]

  return (
    <div className={`border ${colors.border} rounded-xl overflow-hidden transition-all ${isExpanded ? 'bg-white/[0.03]' : 'bg-white/[0.01] hover:bg-white/[0.02]'}`}>
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          {getProviderIcon(model.provider, `w-5 h-5 ${providerColor}`)}
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">{model.name}</h3>
            {(model.id === 'gpt-5.1' || model.id === 'gemini-3-pro-preview') && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">New</span>
            )}
          </div>
          <p className="text-slate-500 text-sm truncate">{model.description}</p>
        </div>

        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <div className="text-white font-medium">{model.contextLength >= 1000000 ? `${model.contextLength / 1000000}M` : `${model.contextLength / 1000}K`}</div>
            <div className="text-slate-600 text-xs">Context</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${colors.text}`}>{formatPrice(model.inputPrice)}</div>
            <div className="text-slate-600 text-xs">Input/1M</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${colors.text}`}>{formatPrice(model.outputPrice)}</div>
            <div className="text-slate-600 text-xs">Output/1M</div>
          </div>
        </div>

        {/* Expand Icon */}
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-5 pb-4 pt-0 border-t border-white/5">
          {/* Mobile Stats */}
          <div className="flex md:hidden flex-wrap items-center gap-4 py-3 mb-3 border-b border-white/5">
            <div>
              <span className="text-slate-500 text-xs">Context:</span>
              <span className="text-white font-medium ml-1">{model.contextLength >= 1000000 ? `${model.contextLength / 1000000}M` : `${model.contextLength / 1000}K`}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Input:</span>
              <span className={`font-medium ml-1 ${colors.text}`}>{formatPrice(model.inputPrice)}/1M</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Output:</span>
              <span className={`font-medium ml-1 ${colors.text}`}>{formatPrice(model.outputPrice)}/1M</span>
            </div>
          </div>

          {/* Cache Pricing */}
          {(model.cacheWritePrice > 0 || model.cacheHitPrice > 0) && (
            <div className="flex items-center gap-4 py-3 border-b border-white/5">
              {model.cacheWritePrice > 0 && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="text-slate-500 text-xs">Cache Write:</span>
                  <span className={`font-medium ${colors.text}`}>{formatPrice(model.cacheWritePrice)}/1M</span>
                </div>
              )}
              {model.cacheHitPrice > 0 && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-slate-500 text-xs">Cache Hit:</span>
                  <span className="font-medium text-emerald-400">{formatPrice(model.cacheHitPrice)}/1M</span>
                </div>
              )}
            </div>
          )}

          {/* Capabilities */}
          <div className="flex flex-wrap gap-2 mt-3">
            {model.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-xs capitalize"
              >
                {cap}
              </span>
            ))}
          </div>

          {/* Speed Indicator */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-slate-500 text-xs">Speed:</span>
            <div className="flex items-center gap-1">
              {['fast', 'balanced', 'powerful'].map((speed, i) => (
                <div
                  key={speed}
                  className={`w-2 h-2 rounded-full ${
                    (model.speed === 'fast' && i === 0) ||
                    (model.speed === 'balanced' && i <= 1) ||
                    (model.speed === 'powerful' && i <= 2)
                      ? `bg-gradient-to-r ${colors.bg}`
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="text-slate-400 text-xs capitalize">{model.speed}</span>
          </div>

          {/* Billing Multiplier */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-slate-500 text-xs">Billing Multiplier:</span>
            <span className={`font-medium ${colors.text}`}>×{model.billingMultiplier}</span>
          </div>

          {/* API ID */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            <span className="text-slate-500 text-xs">API ID:</span>
            <code className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-xs font-mono">{model.id}</code>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredModels = useMemo(() => {
    if (!searchQuery) return models
    const query = searchQuery.toLowerCase()
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-black">
      <Header activeLink="models" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        {/* Background with grid - Same as Homepage */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-slate-400 text-sm">All models available</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              AI Models
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Access the latest AI models from leading providers through a unified API.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{models.length}</div>
              <div className="text-slate-600 text-sm">Models</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-slate-600 text-sm">Providers</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-3">
                <AnthropicIcon className="w-5 h-5 text-orange-400" />
                <OpenAIIcon className="w-5 h-5 text-cyan-400" />
                <GoogleIcon className="w-5 h-5 text-pink-400" />
              </div>
              <div className="text-slate-600 text-sm mt-1">Available</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-white/10 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Models List */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-3">
            {filteredModels.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                isExpanded={expandedId === model.id}
                onToggle={() => setExpandedId(expandedId === model.id ? null : model.id)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredModels.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-slate-800 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-1">No models found</h3>
              <p className="text-slate-600 text-sm">Try a different search term</p>
            </div>
          )}

          {/* Pricing Note */}
          <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm">
                  <strong className="text-white">Pricing</strong> is per 1 million tokens.
                  Prices shown will be multiplied for final billing:
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                    Opus ×1.35
                  </span>
                  <span className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    Sonnet ×1.25
                  </span>
                  <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    Haiku ×1.25
                  </span>
                  <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                    GPT-5.1 ×1.3
                  </span>
                  <span className="px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium">
                    Gemini 3 Pro ×1.3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Comparison</h2>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Model</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Context</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Speed</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Input</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Output</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Multiplier</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Haiku */}
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-emerald-400" />
                        <span className="text-white font-medium text-sm">Haiku 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">200K</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium text-sm">$1</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium text-sm">$5</td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">×1.25</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Quick tasks, high volume</td>
                  </tr>
                  {/* GPT-5.1 */}
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <OpenAIIcon className="w-5 h-5 text-cyan-400" />
                        <span className="text-white font-medium text-sm">GPT-5.1</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">New</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">128K</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-cyan-500" />
                        <div className="w-1.5 h-3 rounded-full bg-cyan-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-medium text-sm">$1.25</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-medium text-sm">$10</td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">×1.3</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Complex reasoning, analysis</td>
                  </tr>
                  {/* Gemini 3 Pro */}
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GoogleIcon className="w-5 h-5 text-pink-400" />
                        <span className="text-white font-medium text-sm">Gemini 3 Pro</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">New</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">1M</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-pink-500" />
                        <div className="w-1.5 h-3 rounded-full bg-pink-500" />
                        <div className="w-1.5 h-3 rounded-full bg-pink-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-pink-400 font-medium text-sm">$2</td>
                    <td className="px-4 py-3 text-right text-pink-400 font-medium text-sm">$12</td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">×1.3</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Multimodal, long context</td>
                  </tr>
                  {/* Sonnet */}
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-violet-400" />
                        <span className="text-white font-medium text-sm">Sonnet 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">200K</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-violet-400 font-medium text-sm">$3</td>
                    <td className="px-4 py-3 text-right text-violet-400 font-medium text-sm">$15</td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">×1.25</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Coding, enterprise</td>
                  </tr>
                  {/* Opus */}
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-amber-400" />
                        <span className="text-white font-medium text-sm">Opus 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">200K</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-amber-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 font-medium text-sm">$5</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-medium text-sm">$25</td>
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">×1.35</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Complex analysis, research</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-lg text-slate-500 mb-8">
            Get instant access to all AI models from Anthropic, OpenAI, and Google with a single API key.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-colors">
              Get API Key
            </Link>
            <Link href="/docs" className="px-8 py-4 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors">
              View Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
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
              <span className="text-lg font-bold text-white tracking-tight">
                Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
              </span>
              <span className="text-slate-600 text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-6 text-slate-600 text-sm">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
