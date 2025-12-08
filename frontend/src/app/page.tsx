'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'
import { PAYMENT_ENABLED, paymentDisabled, Language } from '@/lib/i18n'


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

// Sale end date: 3 days from December 6, 2025
const SALE_END_DATE = new Date('2025-12-09T23:59:59')

// ===== MAIN COMPONENT =====
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const { t, language } = useLanguage()

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const distance = SALE_END_DATE.getTime() - now

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [])

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
          <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0">
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
                <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors text-sm sm:text-base">
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
      <section id="pricing" className="py-16 sm:py-24 border-t border-gray-200 dark:border-white/5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--theme-text)] mb-3 sm:mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-base sm:text-lg text-[var(--theme-text-muted)] max-w-xl mx-auto">
              {t.pricing.subtitle}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {/* Dev Tier */}
            <div className="group relative">
              {/* Card glow on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-400/30 dark:from-slate-600/50 to-slate-500/30 dark:to-slate-700/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

              <div className="relative p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/50 backdrop-blur-sm hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 h-full flex flex-col shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-5 sm:mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2 sm:mb-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--theme-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="text-[var(--theme-text-muted)] text-[10px] sm:text-xs font-medium">{t.pricing.dev.badge}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{t.pricing.dev.name}</h3>
                    <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm mt-1">{t.pricing.dev.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <span className="text-base sm:text-lg text-[var(--theme-text-subtle)] line-through">49K</span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs font-bold">-29%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-bold text-[var(--theme-text)]">35K</span>
                    <span className="text-[var(--theme-text-subtle)] text-base sm:text-lg">VND</span>
                    <span className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">/month</span>
                  </div>
                  <div className="h-8 sm:h-10"></div>
                </div>

                {/* Sale Countdown */}
                <div className="mb-5 sm:mb-6 p-2 rounded-lg bg-gradient-to-r from-rose-500/5 to-orange-500/5 border border-rose-500/20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-rose-500 dark:text-rose-400">{t.pricing.saleEndsIn}</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{countdown.days}d {countdown.hours.toString().padStart(2, '0')}h {countdown.minutes.toString().padStart(2, '0')}m {countdown.seconds.toString().padStart(2, '0')}s</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent mb-5 sm:mb-6" />

                {/* Features */}
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-grow">
                  {[
                    { text: t.pricing.dev.features.requests, highlight: true },
                    { text: t.pricing.dev.features.credits, highlight: true },
                    { text: t.pricing.dev.features.models, highlight: true },
                    { text: t.pricing.dev.features.support, highlight: true },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.highlight ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-[var(--theme-text-muted)]'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${item.highlight ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-text-muted)]'}`}>{item.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {PAYMENT_ENABLED ? (
                  <Link href="/checkout?plan=dev" className="flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 rounded-xl bg-indigo-500 text-white font-semibold text-center hover:bg-indigo-600 transition-all duration-300 shadow-md shadow-indigo-500/20 text-sm sm:text-base">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t.pricing.buyNow}
                  </Link>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 w-full py-3 sm:py-3.5 rounded-xl bg-gray-400 dark:bg-gray-600 text-white font-medium text-center cursor-not-allowed text-xs sm:text-sm whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {paymentDisabled[language as Language].contactDiscord}
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tier */}
            <div className="group relative">
              {/* Card glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur-xl" />

              <div className="relative p-6 sm:p-8 rounded-2xl border border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-slate-900/80 backdrop-blur-sm h-full flex flex-col shadow-md">
                {/* Popular badge */}
                <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2">
                <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] sm:text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1 sm:gap-1.5">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    {t.pricing.pro.popular}
                  </div>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-5 sm:mb-6 mt-2">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-2 sm:mb-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-indigo-500 dark:text-indigo-400 text-[10px] sm:text-xs font-medium">{t.pricing.pro.badge}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{t.pricing.pro.name}</h3>
                    <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm mt-1">{t.pricing.pro.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <span className="text-base sm:text-lg text-[var(--theme-text-subtle)] line-through">99K</span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs font-bold">-20%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-bold text-[var(--theme-text)]">79K</span>
                    <span className="text-[var(--theme-text-subtle)] text-base sm:text-lg">VND</span>
                    <span className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">/month</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t.pricing.pro.usdPrice}</span>
                    <span className="text-[var(--theme-text-subtle)] text-xs">/month</span>
                  </div>
                  {t.pricing.pro.note && (
                    <p className="text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs mt-1">{t.pricing.pro.note}</p>
                  )}
                </div>

                {/* Sale Countdown */}
                <div className="mb-5 sm:mb-6 p-2 rounded-lg bg-gradient-to-r from-rose-500/5 to-orange-500/5 border border-rose-500/20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-rose-500 dark:text-rose-400">{t.pricing.saleEndsIn}</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{countdown.days}d {countdown.hours.toString().padStart(2, '0')}h {countdown.minutes.toString().padStart(2, '0')}m {countdown.seconds.toString().padStart(2, '0')}s</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mb-5 sm:mb-6" />

                {/* Features */}
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-grow">
                  {[
                    { text: t.pricing.pro.features.requests, highlight: true, badge: '2x' },
                    { text: t.pricing.pro.features.credits, highlight: true, badge: '2.2x' },
                    { text: t.pricing.pro.features.models, highlight: true },
                    { text: t.pricing.pro.features.support, highlight: true },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.highlight ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-[var(--theme-text-muted)]'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${item.highlight ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-text-muted)]'}`}>{item.text}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-[10px] font-bold">{item.badge}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {PAYMENT_ENABLED ? (
                  <Link href="/checkout?plan=pro" className="flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-center hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-md shadow-indigo-500/20 text-sm sm:text-base">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t.pricing.buyNow}
                  </Link>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 w-full py-3 sm:py-3.5 rounded-xl bg-gray-400 dark:bg-gray-600 text-white font-medium text-center cursor-not-allowed text-xs sm:text-sm whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {paymentDisabled[language as Language].contactDiscord}
                  </div>
                )}
              </div>
            </div>

            {/* Pro Troll Tier */}
            <div className="group relative">
              {/* Card glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur-xl" />

              <div className="relative p-6 sm:p-8 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-900/80 backdrop-blur-sm h-full flex flex-col shadow-md">
                {/* Header */}
                <div className="flex items-start justify-between mb-5 sm:mb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 mb-2 sm:mb-3">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-medium">{t.pricing.proTroll.badge}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--theme-text)]">{t.pricing.proTroll.name}</h3>
                    <p className="text-[var(--theme-text-subtle)] text-xs sm:text-sm mt-1">{t.pricing.proTroll.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <span className="text-base sm:text-lg text-[var(--theme-text-subtle)] line-through">199K</span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs font-bold">-10%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-bold text-[var(--theme-text)]">180K</span>
                    <span className="text-[var(--theme-text-subtle)] text-base sm:text-lg">VND</span>
                    <span className="text-[var(--theme-text-subtle)] text-xs sm:text-sm">/month</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{t.pricing.proTroll.usdPrice}</span>
                    <span className="text-[var(--theme-text-subtle)] text-xs">/month</span>
                  </div>
                  {t.pricing.proTroll.note && (
                    <p className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs mt-1">{t.pricing.proTroll.note}</p>
                  )}
                </div>

                {/* Sale Countdown */}
                <div className="mb-5 sm:mb-6 p-2 rounded-lg bg-gradient-to-r from-rose-500/5 to-orange-500/5 border border-rose-500/20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-rose-500 dark:text-rose-400">{t.pricing.saleEndsIn}</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{countdown.days}d {countdown.hours.toString().padStart(2, '0')}h {countdown.minutes.toString().padStart(2, '0')}m {countdown.seconds.toString().padStart(2, '0')}s</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mb-5 sm:mb-6" />

                {/* Features */}
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-grow">
                  {[
                    { text: t.pricing.proTroll.features.requests, highlight: true, badge: '4x' },
                    { text: t.pricing.proTroll.features.credits, highlight: true, badge: '5.5x' },
                    { text: t.pricing.proTroll.features.models, highlight: true },
                    { text: t.pricing.proTroll.features.support, highlight: true },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.highlight ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-[var(--theme-text-muted)]'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${item.highlight ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-text-muted)]'}`}>{item.text}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-bold">{item.badge}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {PAYMENT_ENABLED ? (
                  <Link href="/checkout?plan=pro-troll" className="flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-center hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-md shadow-amber-500/20 text-sm sm:text-base">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t.pricing.buyNow}
                  </Link>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 w-full py-3 sm:py-3.5 rounded-xl bg-gray-400 dark:bg-gray-600 text-white font-medium text-center cursor-not-allowed text-xs sm:text-sm whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {paymentDisabled[language as Language].contactDiscord}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* International users note */}
          <div className="text-center mt-8 sm:mt-10">
            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <svg className="w-5 h-5 text-[#5865F2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-[var(--theme-text-muted)] text-sm">{t.pricing.internationalNote}</span>
              <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] font-semibold hover:underline text-sm">
                Discord
              </a>
            </div>
          </div>

          {/* Compare link */}
          <div className="text-center mt-6 sm:mt-8">
            <Link href="/models" className="inline-flex items-center gap-2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors text-xs sm:text-sm">
              <span>{t.pricing.compareAll}</span>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <a href="#" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.privacy}</a>
              <a href="#" className="hover:text-[var(--theme-text)] transition-colors">{t.footer.terms}</a>
              <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="hover:text-[#5865F2] transition-colors flex items-center gap-1.5">
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
