'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'

// ===== MODEL DATA =====
interface Model {
  id: string
  name: string
  provider: string
  providerColor: string
  description: string
  contextLength: number
  inputPrice: number  // per 1M tokens
  outputPrice: number // per 1M tokens
  capabilities: string[]
  isNew?: boolean
  isFeatured?: boolean
  category: 'chat' | 'code' | 'vision' | 'embedding' | 'audio'
}

const models: Model[] = [
  // Anthropic Claude 4.5 Models
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    providerColor: 'from-orange-400 to-amber-500',
    description: 'Most powerful Claude model. Exceptional for highly complex tasks, deep analysis, and creative work requiring maximum intelligence.',
    contextLength: 200000,
    inputPrice: 15,
    outputPrice: 75,
    capabilities: ['chat', 'vision', 'function-calling', 'artifacts', 'reasoning', 'code'],
    isNew: true,
    isFeatured: true,
    category: 'chat',
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    providerColor: 'from-orange-400 to-amber-500',
    description: 'Best balance of intelligence and speed. Ideal for most enterprise workloads, coding, and complex conversations.',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: ['chat', 'vision', 'function-calling', 'artifacts', 'code'],
    isNew: true,
    isFeatured: true,
    category: 'chat',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    providerColor: 'from-orange-400 to-amber-500',
    description: 'Fastest and most cost-effective Claude model. Perfect for quick responses, high-volume tasks, and real-time applications.',
    contextLength: 200000,
    inputPrice: 0.25,
    outputPrice: 1.25,
    capabilities: ['chat', 'vision', 'function-calling', 'code'],
    isNew: true,
    isFeatured: true,
    category: 'chat',
  },
]

const providers = ['All', 'Anthropic']
const categories = ['All', 'chat']

function formatContextLength(length: number): string {
  if (length === 0) return 'N/A'
  if (length >= 1000000) return `${(length / 1000000).toFixed(0)}M`
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
  return length.toString()
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  if (price < 0.01) return `$${price.toFixed(4)}`
  if (price < 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(2)}`
}

// ===== FLOATING PARTICLES =====
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ left: string; top: string; delay: string; duration: string }>>([])

  useEffect(() => {
    setParticles(
      [...Array(15)].map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${5 + Math.random() * 5}s`,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-sky-400/20 rounded-full"
          style={{
            left: particle.left,
            top: particle.top,
            animation: `float ${particle.duration} ease-in-out infinite`,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  )
}

// ===== MODEL CARD =====
function ModelCard({ model }: { model: Model }) {
  return (
    <div className="group relative p-6 rounded-2xl glass hover:bg-white/5 transition-all duration-300 hover-lift">
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        {model.isNew && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
            New
          </span>
        )}
        {model.isFeatured && (
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-medium">
            Featured
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-sky-400 transition-colors">
            {model.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${model.providerColor}`} />
            <span className="text-slate-400 text-sm">{model.provider}</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${model.providerColor} flex items-center justify-center text-white text-sm font-bold opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
          {model.provider.charAt(0)}
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
        {model.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-slate-500 text-xs uppercase tracking-wider">Context</span>
          <p className="text-white font-medium">{formatContextLength(model.contextLength)}</p>
        </div>
        <div>
          <span className="text-slate-500 text-xs uppercase tracking-wider">Category</span>
          <p className="text-white font-medium capitalize">{model.category}</p>
        </div>
      </div>

      {/* Pricing */}
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-800/50 mb-4">
        <div className="text-center">
          <span className="text-slate-500 text-xs block">Input</span>
          <span className="text-emerald-400 font-medium text-sm">{formatPrice(model.inputPrice)}</span>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div className="text-center">
          <span className="text-slate-500 text-xs block">Output</span>
          <span className="text-sky-400 font-medium text-sm">{formatPrice(model.outputPrice)}</span>
        </div>
        <span className="text-slate-600 text-xs">/1M tokens</span>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2">
        {model.capabilities.slice(0, 4).map((cap) => (
          <span
            key={cap}
            className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400 text-xs"
          >
            {cap}
          </span>
        ))}
        {model.capabilities.length > 4 && (
          <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-500 text-xs">
            +{model.capabilities.length - 4}
          </span>
        )}
      </div>

      {/* Hover glow */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${model.providerColor} rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity -z-10`} />
    </div>
  )
}

// ===== MAIN PAGE =====
export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'context'>('name')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const filteredModels = useMemo(() => {
    let result = models

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      )
    }

    // Provider filter
    if (selectedProvider !== 'All') {
      result = result.filter((m) => m.provider === selectedProvider)
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((m) => m.category === selectedCategory)
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return a.inputPrice - b.inputPrice
      if (sortBy === 'context') return b.contextLength - a.contextLength
      return 0
    })

    return result
  }, [searchQuery, selectedProvider, selectedCategory, sortBy])

  const featuredModels = models.filter((m) => m.isFeatured)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
              TrollLLM
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/models" className="text-white text-sm font-medium">Models</Link>
              <a href="/#pricing" className="text-slate-400 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="/#faq" className="text-slate-400 hover:text-white transition-colors text-sm">FAQ</a>
              <a href="/docs" className="text-slate-400 hover:text-white transition-colors text-sm">Docs</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors text-sm">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium text-sm">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid-fade opacity-30" />
          <FloatingParticles />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 opacity-0 animate-fade-in-up">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Claude 4.5 Models
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8 opacity-0 animate-fade-in-up animation-delay-100">
            Access the latest Claude 4.5 models from Anthropic through a unified API.
            Choose the perfect model for your needs - from ultra-fast Haiku to powerful Opus.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-0 animate-fade-in-up animation-delay-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{models.length}</div>
              <div className="text-slate-500 text-sm">Models</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">200K</div>
              <div className="text-slate-500 text-sm">Context Window</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">Anthropic</div>
              <div className="text-slate-500 text-sm">Provider</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Models */}
      <section className="py-12 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured Models
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {featuredModels.map((model) => (
              <div
                key={model.id}
                className="group p-4 rounded-xl glass hover:bg-white/5 transition-all cursor-pointer hover-lift"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${model.providerColor} flex items-center justify-center text-white text-xs font-bold`}>
                    {model.provider.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm group-hover:text-sky-400 transition-colors">{model.name}</h3>
                    <span className="text-slate-500 text-xs">{model.provider}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{formatContextLength(model.contextLength)} context</span>
                  <span className="text-emerald-400">{formatPrice(model.inputPrice)}/1M</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-8 sticky top-[73px] z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Provider Filter */}
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
              >
                {providers.map((p) => (
                  <option key={p} value={p}>{p === 'All' ? 'All Providers' : p}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'context')}
                className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="context">Sort by Context</option>
              </select>

              {/* View Mode */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-slate-500 text-sm">
            Showing {filteredModels.length} of {models.length} models
          </div>
        </div>
      </section>

      {/* Models Grid/Table */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Model</th>
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Provider</th>
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Context</th>
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Input Price</th>
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Output Price</th>
                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((model) => (
                    <tr key={model.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${model.providerColor} flex items-center justify-center text-white text-xs font-bold`}>
                            {model.provider.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-medium">{model.name}</span>
                            {model.isNew && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">New</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400">{model.provider}</td>
                      <td className="py-4 px-4 text-white">{formatContextLength(model.contextLength)}</td>
                      <td className="py-4 px-4 text-emerald-400">{formatPrice(model.inputPrice)}</td>
                      <td className="py-4 px-4 text-sky-400">{formatPrice(model.outputPrice)}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs capitalize">{model.category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {filteredModels.length === 0 && (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">No models found</h3>
              <p className="text-slate-500">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start building?
          </h2>
          <p className="text-slate-400 mb-8">
            Get instant access to all models with a single API key.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold hover:shadow-lg hover:shadow-sky-500/25 transition-all hover-lift">
            Get API Key
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">TrollLLM</span>
              <span className="text-slate-500 text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-6 text-slate-500 text-sm">
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
