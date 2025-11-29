'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'

// ===== CODE TEMPLATES WITH DIFFERENT MODELS PER LANGUAGE =====
const codeConfigs = {
  python: {
    model: 'claude-opus-4-5',
    before: `from openai import OpenAI

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="`,
    after: `",
    messages=[{"role": "user", "content": "Hello!"}]
)`
  },
  nodejs: {
    model: 'claude-sonnet-4-5',
    before: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-api-key'
});

const response = await client.chat.completions.create({
  model: '`,
    after: `',
  messages: [{ role: 'user', content: 'Hello!' }]
});`
  },
  curl: {
    model: 'claude-haiku-4-5',
    before: `curl https://chat.trollllm.xyz/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "`,
    after: `",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`
  }
}

type CodeLang = 'python' | 'nodejs' | 'curl'

function TypingCodeBlock() {
  const [currentLang, setCurrentLang] = useState<CodeLang>('python')
  const [displayedModel, setDisplayedModel] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentConfig = codeConfigs[currentLang]

  const typeModel = useCallback(() => {
    const fullModel = currentConfig.model

    if (isTyping && !isDeleting) {
      if (displayedModel.length < fullModel.length) {
        const timeout = setTimeout(() => {
          setDisplayedModel(fullModel.slice(0, displayedModel.length + 1))
        }, 80)
        return () => clearTimeout(timeout)
      } else {
        const timeout = setTimeout(() => {
          setIsDeleting(true)
          setIsTyping(false)
        }, 2500)
        return () => clearTimeout(timeout)
      }
    }

    if (isDeleting) {
      if (displayedModel.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedModel(displayedModel.slice(0, -1))
        }, 40)
        return () => clearTimeout(timeout)
      } else {
        setIsDeleting(false)
        setIsTyping(true)
      }
    }
  }, [displayedModel, isTyping, isDeleting, currentConfig.model])

  useEffect(() => {
    const cleanup = typeModel()
    return cleanup
  }, [typeModel])

  // Reset animation when switching language
  const handleLangChange = (lang: CodeLang) => {
    setCurrentLang(lang)
    setDisplayedModel('')
    setIsTyping(true)
    setIsDeleting(false)
  }

  const highlightCode = (code: string) => {
    // Escape HTML first
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Apply syntax highlighting
    escaped = escaped
      .replace(/\b(from|import|const|let|var|await|async|return)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="text-emerald-400">$1</span>')
      .replace(/\b(OpenAI|client|response|chat|completions|create)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\b(curl)\b/g, '<span class="text-yellow-400">$1</span>')
      .replace(/(-H|-d)/g, '<span class="text-slate-500">$1</span>')

    return escaped
  }

  return (
    <div className="relative group">
      {/* Window chrome */}
      <div className="bg-[#111] rounded-t-xl border border-white/5 border-b-0 px-4 py-3 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex gap-1 bg-black/50 rounded-lg p-1">
            {([
              { key: 'python', label: 'Python' },
              { key: 'nodejs', label: 'NodeJS' },
              { key: 'curl', label: 'cURL' }
            ] as const).map((lang) => (
              <button
                key={lang.key}
                onClick={() => handleLangChange(lang.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  currentLang === lang.key
                    ? 'bg-white/10 text-white'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-16" />
      </div>

      {/* Code content */}
      <div className="bg-[#0a0a0a] rounded-b-xl border border-white/5 border-t-0 p-6 overflow-hidden">
        <pre className="font-mono text-sm overflow-x-auto text-slate-300">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(currentConfig.before) }} />
          <span className="text-indigo-400 font-semibold">{displayedModel}</span>
          <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-blink align-middle" />
          <code dangerouslySetInnerHTML={{ __html: highlightCode(currentConfig.after) }} />
        </pre>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute -inset-1 bg-indigo-500/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
    </div>
  )
}

// ===== ANIMATED COUNTER =====
function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState('0')

  useEffect(() => {
    const num = parseInt(value.replace(/[^0-9]/g, ''))
    if (isNaN(num)) {
      setDisplayed(value)
      return
    }

    let start = 0
    const duration = 2000
    const increment = num / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= num) {
        setDisplayed(value)
        clearInterval(timer)
      } else {
        setDisplayed(Math.floor(start).toString())
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{displayed}{suffix}</span>
}

// ===== FEATURES =====
const features = [
  {
    title: 'One API, All Models',
    description: 'Access Claude Opus, Sonnet, and Haiku through a single unified API endpoint.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    title: 'Smart Fallbacks',
    description: 'Automatic failover between models. Requests seamlessly route when needed.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Analytics',
    description: 'Track usage, monitor costs, and analyze performance across all operations.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

// ===== STATS =====
const stats = [
  { value: '3', suffix: '', label: 'Models' },
  { value: '99.9', suffix: '%', label: 'Uptime' },
  { value: '50', suffix: 'ms', label: 'Latency' },
  { value: '200', suffix: 'K', label: 'Context' },
]

// ===== FAQ =====
const faqs = [
  {
    question: 'How does pricing work?',
    answer: 'Pay-as-you-go with transparent per-token rates. No monthly minimums. Volume discounts available.',
  },
  {
    question: 'Which Claude models are supported?',
    answer: 'We support Claude Opus 4.5, Claude Sonnet 4.5, and Claude Haiku 4.5 - the latest and most capable Claude models from Anthropic.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Zero-log policy. All data encrypted in transit and at rest. SOC 2 Type II compliant.',
  },
  {
    question: 'Can I use existing Anthropic SDK code?',
    answer: 'Yes! Our API is fully compatible with the Anthropic SDK. Just change the base URL and you\'re ready to go.',
  },
]

// ===== MAIN COMPONENT =====
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background with grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div>
              {/* Badge */}
              <div className="flex justify-start mb-6 opacity-0 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-slate-400 text-sm">Claude 4.5 Available</span>
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight opacity-0 animate-fade-in-up animation-delay-100">
                <span className="text-white">
                  Access Opus 4.5
                </span>
                <br />
                <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent">
                  with One API Key
                </span>
              </h1>

              <p className="text-lg text-slate-500 mb-8 opacity-0 animate-fade-in-up animation-delay-200">
                Premium access to Claude models. Access Opus, Sonnet, and Haiku through a single API.
              </p>

              {/* CTA Buttons */}
              <div className="opacity-0 animate-fade-in-up animation-delay-300">
                <a href="https://discord.gg/qp6HMPvj" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Get Started
                </a>
              </div>
            </div>

            {/* Right side - Code Block */}
            <div className="opacity-0 animate-fade-in-up animation-delay-400">
              <TypingCodeBlock />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-slate-600 text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for developers
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Everything you need to integrate AI into your applications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-t border-white/5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Simple, transparent pricing. No hidden fees. Cancel anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Dev Tier */}
            <div className="group relative">
              {/* Card glow on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-600/50 to-slate-700/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

              <div className="relative p-8 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm hover:border-white/20 transition-all duration-300 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 mb-3">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="text-slate-400 text-xs font-medium">DEVELOPER</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Dev</h3>
                    <p className="text-slate-500 text-sm mt-1">Perfect for side projects</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg text-slate-600 line-through">49K</span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-xs font-bold">-29%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">35K</span>
                    <span className="text-slate-500 text-lg">VND</span>
                    <span className="text-slate-600 text-sm">/month</span>
                  </div>
                  <p className="text-emerald-400 text-sm font-medium mt-2">Save 14,000 VND</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-6" />

                {/* Features */}
                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    { text: '300 requests/minute', highlight: false },
                    { text: '225 credits/month', highlight: false },
                    { text: 'All Claude models', highlight: true },
                    { text: 'Community support', highlight: false },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${item.highlight ? 'text-white font-medium' : 'text-slate-400'}`}>{item.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a href="https://discord.gg/qp6HMPvj" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/10 text-white font-medium text-center hover:bg-white/5 hover:border-white/20 transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Join Discord
                </a>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="group relative">
              {/* Card glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur-xl" />

              <div className="relative p-8 rounded-2xl border border-indigo-500/30 bg-slate-900/80 backdrop-blur-sm h-full flex flex-col">
                {/* Popular badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    MOST POPULAR
                  </div>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-6 mt-2">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-3">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-indigo-400 text-xs font-medium">PROFESSIONAL</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Pro</h3>
                    <p className="text-slate-500 text-sm mt-1">Best for teams & production</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg text-slate-600 line-through">115K</span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-xs font-bold">-31%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">79K</span>
                    <span className="text-slate-500 text-lg">VND</span>
                    <span className="text-slate-600 text-sm">/month</span>
                  </div>
                  <p className="text-emerald-400 text-sm font-medium mt-2">Save 36,000 VND</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mb-6" />

                {/* Features */}
                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    { text: '1000 requests/minute', highlight: true, badge: '3.3x' },
                    { text: '500 credits/month', highlight: true, badge: '2.2x' },
                    { text: 'All Claude models', highlight: false },
                    { text: 'Priority support', highlight: true },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${item.highlight ? 'text-white font-medium' : 'text-slate-400'}`}>{item.text}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">{item.badge}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a href="https://discord.gg/qp6HMPvj" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#5865F2] text-white font-semibold text-center hover:bg-[#4752C4] transition-all duration-300 shadow-md shadow-[#5865F2]/20">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Join Discord
                </a>
              </div>
            </div>
          </div>

          {/* Compare link */}
          <div className="text-center mt-8">
            <Link href="/models" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm">
              <span>Compare all features</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              FAQ
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-white text-sm font-medium">{faq.question}</span>
                  <svg
                    className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === index ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="px-5 pb-4">
                    <p className="text-slate-500 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
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
            Check out our documentation to get started with the API.
          </p>

          <Link href="/docs" className="inline-block px-8 py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-slate-200 transition-colors">
            View Documentation
          </Link>
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
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="https://discord.gg/qp6HMPvj" target="_blank" rel="noopener noreferrer" className="hover:text-[#5865F2] transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
