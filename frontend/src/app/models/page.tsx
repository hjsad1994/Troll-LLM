'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'

// ===== ANTHROPIC ICON =====
function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0H10.172L16.74 20.48h-3.603l-1.283-3.36H5.697l-1.283 3.36H.852L6.569 3.52zm.831 10.56h4.097L9.447 8.12l-2.047 5.96z"/>
    </svg>
  )
}

// ===== MODEL DATA =====
interface Model {
  id: string
  name: string
  tier: 'opus' | 'sonnet' | 'haiku'
  description: string
  contextLength: number
  inputPrice: number
  outputPrice: number
  capabilities: string[]
  speed: 'fast' | 'balanced' | 'powerful'
}

const models: Model[] = [
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    tier: 'opus',
    description: 'Most powerful. Exceptional for highly complex tasks and deep analysis.',
    contextLength: 200000,
    inputPrice: 5,
    outputPrice: 25,
    capabilities: ['vision', 'function-calling', 'reasoning', 'code'],
    speed: 'powerful',
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    tier: 'sonnet',
    description: 'Best balance. Ideal for enterprise workloads and coding tasks.',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: ['vision', 'function-calling', 'code'],
    speed: 'balanced',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    tier: 'haiku',
    description: 'Fastest and most affordable. Perfect for quick, high-volume tasks.',
    contextLength: 200000,
    inputPrice: 1,
    outputPrice: 5,
    capabilities: ['vision', 'function-calling', 'code'],
    speed: 'fast',
  },
]

const tierColors = {
  opus: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
  sonnet: { bg: 'from-violet-500 to-purple-600', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
  haiku: { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
}

function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(0)}`
}

// ===== COMPACT MODEL ROW =====
function ModelRow({ model, isExpanded, onToggle }: { model: Model; isExpanded: boolean; onToggle: () => void }) {
  const colors = tierColors[model.tier]

  return (
    <div className={`border ${colors.border} rounded-xl overflow-hidden transition-all ${isExpanded ? 'bg-white/[0.03]' : 'bg-white/[0.01] hover:bg-white/[0.02]'}`}>
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          <AnthropicIcon className={`w-5 h-5 ${colors.text}`} />
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">{model.name}</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">New</span>
          </div>
          <p className="text-slate-500 text-sm truncate">{model.description}</p>
        </div>

        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <div className="text-white font-medium">200K</div>
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
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-48' : 'max-h-0'}`}>
        <div className="px-5 pb-4 pt-0 border-t border-white/5">
          {/* Mobile Stats */}
          <div className="flex md:hidden items-center gap-4 py-3 mb-3 border-b border-white/5">
            <div>
              <span className="text-slate-500 text-xs">Context:</span>
              <span className="text-white font-medium ml-1">200K</span>
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
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      {/* Navigation - Same as Homepage */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Logo Icon */}
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6 group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                    <path d="M12 3c2.5 0 5 4 5 9" />
                    <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </div>
              {/* Logo Text */}
              <span className="text-xl font-bold text-white tracking-tight">
                Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/models" className="text-white text-sm font-medium">Models</Link>
              <a href="/#features" className="text-slate-500 hover:text-white transition-colors text-sm">Features</a>
              <a href="/#pricing" className="text-slate-500 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="/#faq" className="text-slate-500 hover:text-white transition-colors text-sm">FAQ</a>
              <Link href="/docs" className="text-slate-500 hover:text-white transition-colors text-sm">Docs</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-500 hover:text-white transition-colors text-sm">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

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
              Claude 4.5 Models
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Access the latest Claude models from Anthropic through a unified API.
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
              <div className="text-2xl font-bold text-white">200K</div>
              <div className="text-slate-600 text-sm">Context</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-2">
                <AnthropicIcon className="w-5 h-5 text-orange-400" />
                <span className="text-2xl font-bold text-orange-400">Anthropic</span>
              </div>
              <div className="text-slate-600 text-sm">Provider</div>
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
                  New users get <span className="text-emerald-400 font-medium">100K free tokens</span> to get started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Comparison</h2>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Model</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Speed</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Intelligence</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Price</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase tracking-wider font-medium">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-emerald-400" />
                        <span className="text-white font-medium text-sm">Haiku 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium text-sm">$1</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Quick tasks, high volume</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-violet-400" />
                        <span className="text-white font-medium text-sm">Sonnet 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-violet-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-violet-400 font-medium text-sm">$3</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm">Coding, enterprise</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AnthropicIcon className="w-5 h-5 text-amber-400" />
                        <span className="text-white font-medium text-sm">Opus 4.5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-amber-500" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                        <div className="w-1.5 h-3 rounded-full bg-white/10" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <div className="w-1.5 h-3 rounded-full bg-amber-500" />
                        <div className="w-1.5 h-3 rounded-full bg-amber-500" />
                        <div className="w-1.5 h-3 rounded-full bg-amber-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 font-medium text-sm">$5</td>
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
            Get instant access to all Claude 4.5 models with a single API key.
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
