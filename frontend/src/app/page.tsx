'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

// ===== CODE TEMPLATES WITH DIFFERENT MODELS PER LANGUAGE =====
const codeConfigs = {
  python: {
    model: 'claude-opus-4-5',
    before: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.trollllm.io/v1",
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
  baseURL: 'https://api.trollllm.io/v1',
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
    before: `curl https://api.trollllm.io/v1/chat/completions \\
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
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-semibold text-white">
              TrollLLM
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/models" className="text-slate-500 hover:text-white transition-colors text-sm">Models</Link>
              <a href="#features" className="text-slate-500 hover:text-white transition-colors text-sm">Features</a>
              <a href="#pricing" className="text-slate-500 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="#faq" className="text-slate-500 hover:text-white transition-colors text-sm">FAQ</a>
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
                The unified AI gateway for Claude models. Access Opus, Sonnet, and Haiku through a single API.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up animation-delay-300">
                <Link href="/register" className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-slate-200 transition-colors text-center">
                  Get Started Free
                </Link>
                <Link href="/models" className="px-6 py-3 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors text-center">
                  View Models
                </Link>
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
      <section id="pricing" className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple pricing
            </h2>
            <p className="text-lg text-slate-500">
              Pay only for what you use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-lg font-semibold text-white mb-1">Free</h3>
              <p className="text-slate-600 text-sm mb-4">For trying out</p>
              <div className="text-4xl font-bold text-white mb-6">
                $0<span className="text-base text-slate-600 font-normal">/mo</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['10K tokens/month', 'All models', 'Community support'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-400 text-sm">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm text-center hover:bg-white/5 transition-colors">
                Get Started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-6 rounded-xl border border-white/20 bg-white/[0.04] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-black text-xs font-medium">
                Popular
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Pro</h3>
              <p className="text-slate-600 text-sm mb-4">For teams</p>
              <div className="text-4xl font-bold text-white mb-6">
                $49<span className="text-base text-slate-600 font-normal">/mo</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['1M tokens/month', 'Priority access', 'Email support', 'Analytics'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-400 text-sm">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-2.5 rounded-lg bg-white text-black font-medium text-sm text-center hover:bg-slate-200 transition-colors">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-lg font-semibold text-white mb-1">Enterprise</h3>
              <p className="text-slate-600 text-sm mb-4">For organizations</p>
              <div className="text-4xl font-bold text-white mb-6">
                Custom
              </div>
              <ul className="space-y-3 mb-6">
                {['Unlimited tokens', 'Dedicated support', 'SLA guarantee', 'On-premise'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-400 text-sm">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="mailto:sales@trollllm.com" className="block w-full py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm text-center hover:bg-white/5 transition-colors">
                Contact Sales
              </a>
            </div>
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
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">TrollLLM</span>
              <span className="text-slate-600 text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-6 text-slate-600 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
