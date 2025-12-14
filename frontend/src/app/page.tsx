'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'


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

    // Apply syntax highlighting with light/dark support
    escaped = escaped
      .replace(/\b(from|import|const|let|var|await|async|return)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
      .replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="text-emerald-600 dark:text-emerald-400">$1</span>')
      .replace(/\b(OpenAI|client|response|chat|completions|create)\b/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>')
      .replace(/\b(curl)\b/g, '<span class="text-yellow-600 dark:text-yellow-400">$1</span>')
      .replace(/(-H|-d)/g, '<span class="text-slate-400 dark:text-slate-500">$1</span>')

    return escaped
  }

  return (
    <div className="relative group">
      {/* Window chrome */}
      <div className="bg-gray-100 dark:bg-[#111] rounded-t-xl border border-gray-300 dark:border-white/5 border-b-0 px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex gap-0.5 sm:gap-1 bg-gray-200 dark:bg-black/50 rounded-lg p-0.5 sm:p-1">
            {([
              { key: 'python', label: 'Python' },
              { key: 'nodejs', label: 'NodeJS' },
              { key: 'curl', label: 'cURL' }
            ] as const).map((lang) => (
              <button
                key={lang.key}
                onClick={() => handleLangChange(lang.key)}
                className={`px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-medium transition-all ${
                  currentLang === lang.key
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-[var(--theme-text)] shadow-sm'
                    : 'text-gray-600 dark:text-[var(--theme-text-subtle)] hover:text-gray-900 dark:hover:text-[var(--theme-text-muted)]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-8 sm:w-16" />
      </div>

      {/* Code content */}
      <div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-b-xl border border-gray-300 dark:border-white/5 border-t-0 p-3 sm:p-6 overflow-hidden">
        <pre className="font-mono text-[10px] sm:text-sm overflow-x-auto text-gray-800 dark:text-slate-300">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(currentConfig.before) }} />
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{displayedModel}</span>
          <span className="inline-block w-0.5 h-3 sm:h-4 bg-indigo-600 dark:bg-indigo-400 ml-0.5 animate-blink align-middle" />
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

// ===== FEATURE ICONS =====
const featureIcons = [
  <svg key="1" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>,
  <svg key="2" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
  <svg key="3" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>,
]

// ===== STATS =====
const statsData = [
  { value: '5', suffix: '', labelKey: 'models' },
  { value: '99.9', suffix: '%', labelKey: 'uptime' },
  { value: '50', suffix: 'ms', labelKey: 'latency' },
  { value: '200', suffix: 'K', labelKey: 'context' },
]

// ===== MAIN COMPONENT =====
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { t } = useLanguage()

  const features = [
    { title: t.features.feature1.title, description: t.features.feature1.description, icon: featureIcons[0] },
    { title: t.features.feature2.title, description: t.features.feature2.description, icon: featureIcons[1] },
    { title: t.features.feature3.title, description: t.features.feature3.description, icon: featureIcons[2] },
  ]

  const faqs = [
    { question: t.faq.q1.question, answer: t.faq.q1.answer },
    { question: t.faq.q2.question, answer: t.faq.q2.answer },
    { question: t.faq.q3.question, answer: t.faq.q3.answer },
    { question: t.faq.q4.question, answer: t.faq.q4.answer },
  ]

  const stats = statsData.map(stat => ({
    ...stat,
    label: t.stats[stat.labelKey as keyof typeof t.stats]
  }))

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] overflow-x-hidden">
      <Header />

      {/* Discord Banner - fixed below header */}
      <div className="fixed top-[52px] sm:top-[68px] left-0 right-0 z-40 bg-gradient-to-r from-indigo-500 to-purple-500 py-1.5 sm:py-2 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span className="truncate">{t.banner.discord}</span>
          <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0">
            {t.banner.joinNow}
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
        {/* Background with grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.15)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="flex justify-center lg:justify-start mb-4 sm:mb-6 opacity-0 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-[var(--theme-text-muted)] text-xs sm:text-sm">{t.hero.badge}</span>
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight opacity-0 animate-fade-in-up animation-delay-100">
                <span className="text-[var(--theme-text)]">
                  {t.hero.title1}
                </span>
                <br />
                <span className="bg-gradient-to-r from-slate-500 to-slate-400 dark:from-slate-400 dark:to-slate-600 bg-clip-text text-transparent">
                  {t.hero.title2}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--theme-text-subtle)] mb-6 sm:mb-8 opacity-0 animate-fade-in-up animation-delay-200 max-w-lg mx-auto lg:mx-0">
                {t.hero.description}
              </p>

              {/* CTA Buttons */}
              <div className="opacity-0 animate-fade-in-up animation-delay-300">
                <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {t.hero.cta}
                </a>
              </div>
            </div>

            {/* Right side - Code Block */}
            <div className="opacity-0 animate-fade-in-up animation-delay-400 order-first lg:order-last">
              <TypingCodeBlock />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-20 border-y border-gray-200 dark:border-white/5 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-1 sm:mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[var(--theme-text-subtle)] text-xs sm:text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--theme-text)] mb-3 sm:mb-4">
              {t.features.title}
            </h2>
            <p className="text-base sm:text-lg text-[var(--theme-text-subtle)] max-w-xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors shadow-sm"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-3 sm:mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)] mb-2">{feature.title}</h3>
                <p className="text-[var(--theme-text-subtle)] text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28 border-t border-gray-200 dark:border-white/5 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 text-sm font-medium">Limited Time Offer</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-base sm:text-lg text-[var(--theme-text-muted)] max-w-xl mx-auto">
              {t.pricing.subtitle}
            </p>
          </div>

          {/* Main Pricing Card */}
          <div className="max-w-lg mx-auto">
            <div className="group relative">
              {/* Animated gradient border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-3xl opacity-60 group-hover:opacity-100 blur-sm transition-all duration-500 animate-gradient-x" />
              <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-3xl opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900/95 backdrop-blur">
                {/* Popular badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30">
                    ⚡ Most Popular
                  </div>
                </div>

                {/* Price display */}
                <div className="text-center mb-8 pt-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-[var(--theme-text-muted)] text-lg line-through">$30</span>
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-semibold">-33%</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-[var(--theme-text-muted)] text-2xl">$</span>
                    <span className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      20
                    </span>
                  </div>
                  <div className="text-[var(--theme-text-muted)] text-sm mt-2">{t.pricing.minPurchase}</div>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: '💎', text: t.pricing.dev.features.credits, highlight: true },
                    { icon: '🤖', text: t.pricing.dev.features.models, highlight: false },
                    { icon: '⚡', text: 'Instant API Access', highlight: false },
                    { icon: '🛡️', text: t.pricing.dev.features.support, highlight: false },
                    { icon: '🔄', text: 'No Monthly Fees', highlight: false },
                    { icon: '📊', text: 'Usage Analytics', highlight: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        item.highlight
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-white/5'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className={`text-sm ${item.highlight ? 'text-emerald-400 font-medium' : 'text-[var(--theme-text)]'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link
                  href="/checkout"
                  className="group/btn relative flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-lg hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <span>{t.pricing.buyNow}</span>
                  <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)] text-xs">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)] text-xs">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Instant Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats / Social proof */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto">
            {[
              { value: '500+', label: 'Active Users' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{stat.value}</div>
                <div className="text-xs text-[var(--theme-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Discord CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 p-4 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-[var(--theme-text)] text-sm font-medium">{t.pricing.internationalNote}</span>
            </div>
            <a
              href="https://discord.gg/WA3NzpXuq9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752C4] transition-colors flex items-center gap-2"
            >
              Join Discord
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Compare link */}
          <div className="text-center mt-8">
            <Link href="/models" className="inline-flex items-center gap-2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors text-sm group">
              {t.pricing.compareAll}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 border-t border-gray-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--theme-text)]">
              {t.faq.title}
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden bg-white dark:bg-transparent"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[var(--theme-text)] text-xs sm:text-sm font-medium pr-4">{faq.question}</span>
                  <svg
                    className={`w-4 h-4 text-[var(--theme-text-subtle)] transition-transform duration-200 flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === index ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="px-4 sm:px-5 pb-3 sm:pb-4">
                    <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 border-t border-gray-200 dark:border-white/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--theme-text)] mb-3 sm:mb-4">
            {t.cta.title}
          </h2>
          <p className="text-base sm:text-lg text-[var(--theme-text-subtle)] mb-6 sm:mb-8">
            {t.cta.subtitle}
          </p>

          <Link href="/docs" className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[var(--theme-text)] text-[var(--theme-bg)] font-semibold text-base sm:text-lg hover:opacity-90 transition-colors">
            {t.cta.button}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-gray-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Footer Logo Icon */}
              <div className="relative w-5 h-5 sm:w-6 sm:h-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md rotate-6" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                    <path d="M12 3c2.5 0 5 4 5 9" />
                    <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold text-[var(--theme-text)] tracking-tight">
                Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
              </span>
              <span className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-[var(--theme-text-subtle)] text-xs sm:text-sm">
              <a href="/privacy" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.privacy}</a>
              <a href="/terms" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.terms}</a>
              <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="hover:text-[#5865F2] transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="hidden sm:inline">{t.footer.discord}</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
