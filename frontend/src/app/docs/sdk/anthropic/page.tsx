'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

// ===== SIDEBAR NAVIGATION =====
const sidebarNav = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ]
  },
  {
    title: 'SDK Reference',
    items: [
      { title: 'OpenAI SDK', href: '/docs/sdk/openai' },
      { title: 'Anthropic SDK', href: '/docs/sdk/anthropic', active: true },
    ]
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Kilo Code', href: '/docs/integrations/kilo-code' },
      { title: 'Roo Code', href: '/docs/integrations/roo-code' },
      { title: 'Claude Code CLI', href: '/docs/integrations/claude-code' },
      { title: 'Droid', href: '/docs/integrations/droid' },
      { title: 'Continue', href: '/docs/integrations/continue' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { title: 'Rate Limits', href: '/docs/rate-limits' },
      { title: 'Changelog', href: '/docs/changelog' },
    ]
  },
]

// ===== CODE BLOCK COMPONENT =====
function CodeBlock({
  code,
  language = 'bash',
  title
}: {
  code: string
  language?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightCode = (code: string, lang: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const purple = '<b style="color:#c084fc;font-weight:normal">'
    const blue = '<b style="color:#60a5fa;font-weight:normal">'
    const green = '<b style="color:#34d399;font-weight:normal">'
    const gray = '<b style="color:#6b7280;font-weight:normal">'
    const yellow = '<b style="color:#fbbf24;font-weight:normal">'
    const cyan = '<b style="color:#22d3ee;font-weight:normal">'
    const end = '</b>'

    if (lang === 'python') {
      escaped = escaped
        .replace(/(#.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, `${purple}$1${end}`)
        .replace(/\b(Anthropic|client|response|messages|create|base_url|api_key|model|content|print|text|stream|text_stream|usage|input_tokens|output_tokens|max_tokens)\b/g, `${blue}$1${end}`)
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/(\/\/.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, `${purple}$1${end}`)
        .replace(/\b(Anthropic|client|response|messages|create|baseURL|apiKey|model|content|console|log|stream|text|usage|maxTokens)\b/g, `${blue}$1${end}`)
    } else if (lang === 'bash' || lang === 'shell') {
      escaped = escaped
        .replace(/^(pip|npm|yarn|pnpm)\b/gm, `${yellow}$1${end}`)
        .replace(/\b(install)\b/g, `${cyan}$1${end}`)
    }

    return escaped
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden mb-6 shadow-sm">
      {title && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <span className="text-gray-600 dark:text-slate-500 text-xs font-medium">{title}</span>
          <span className="text-gray-400 dark:text-slate-600 text-xs">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-gray-900 dark:bg-[#0a0a0a] overflow-x-auto">
          <code
            className="text-sm text-gray-200 dark:text-slate-300 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
          />
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 text-gray-400 dark:text-slate-500 hover:text-white transition-all"
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ===== NOTE COMPONENT =====
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-blue-50 dark:bg-sky-500/10 border border-blue-200 dark:border-sky-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-blue-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== TIP COMPONENT =====
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== WARNING COMPONENT =====
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== TABBED CODE BLOCK =====
function TabbedCodeBlock({
  tabs
}: {
  tabs: Array<{ label: string; language: string; code: string }>
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tabs[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightCode = (code: string, lang: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const purple = '<b style="color:#c084fc;font-weight:normal">'
    const blue = '<b style="color:#60a5fa;font-weight:normal">'
    const green = '<b style="color:#34d399;font-weight:normal">'
    const gray = '<b style="color:#6b7280;font-weight:normal">'
    const end = '</b>'

    if (lang === 'python') {
      escaped = escaped
        .replace(/(#.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, `${purple}$1${end}`)
        .replace(/\b(Anthropic|client|response|messages|create|base_url|api_key|model|content|print|text|stream|text_stream|usage|input_tokens|output_tokens|max_tokens)\b/g, `${blue}$1${end}`)
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/(\/\/.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, `${purple}$1${end}`)
        .replace(/\b(Anthropic|client|response|messages|create|baseURL|apiKey|model|content|console|log|stream|text|usage|maxTokens)\b/g, `${blue}$1${end}`)
    }

    return escaped
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden mb-6 shadow-sm">
      <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === i
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-600 hover:text-gray-900 dark:hover:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-gray-400 dark:text-slate-600 text-xs">{tabs[activeTab].language}</span>
      </div>
      <div className="relative">
        <pre className="p-4 bg-gray-900 dark:bg-[#0a0a0a] overflow-x-auto">
          <code
            className="text-sm text-gray-200 dark:text-slate-300 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightCode(tabs[activeTab].code, tabs[activeTab].language) }}
          />
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 text-gray-400 dark:text-slate-500 hover:text-white transition-all"
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function AnthropicSDKPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()

  const sidebarNavTranslated = [
    {
      title: t.docs.sidebar.gettingStarted,
      items: [
        { title: t.docs.sidebar.introduction, href: '/docs' },
        { title: t.docs.sidebar.quickstart, href: '/docs/quickstart' },
        { title: t.docs.sidebar.authentication, href: '/docs/authentication' },
      ]
    },
    {
      title: t.docs.sidebar.sdkReference,
      items: [
        { title: t.docs.sidebar.openaiSdk, href: '/docs/sdk/openai' },
        { title: t.docs.sidebar.anthropicSdk, href: '/docs/sdk/anthropic', active: true },
      ]
    },
    {
      title: t.docs.sidebar.integrations,
      items: [
        { title: t.docs.sidebar.kiloCode, href: '/docs/integrations/kilo-code' },
        { title: t.docs.sidebar.rooCode, href: '/docs/integrations/roo-code' },
        { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code' },
        { title: t.docs.sidebar.droid, href: '/docs/integrations/droid' },
        { title: t.docs.sidebar.continue, href: '/docs/integrations/continue' },
      ]
    },
    {
      title: t.docs.sidebar.resources,
      items: [
        { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
        { title: t.docs.sidebar.changelog, href: '/docs/changelog' },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header activeLink="docs" />

      <div className="flex pt-[65px]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-white dark:bg-black lg:bg-transparent border-r border-gray-200 dark:border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.docs.sidebar.searchDocs}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-gray-300 dark:focus:border-white/10 transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNavTranslated.map((section) => (
                <div key={section.title}>
                  <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            item.active
                              ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white border border-indigo-200 dark:border-transparent'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-12">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 mb-8">
              <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white transition-colors">Docs</Link>
              <span>/</span>
              <span>SDK</span>
              <span>/</span>
              <span className="text-gray-700 dark:text-slate-400">Anthropic SDK</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 dark:bg-[#D4A574]/10 border border-[#D4A574]/20 dark:border-[#D4A574]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#D4A574]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0H10.172L16.74 20.48h-3.603l-1.283-3.36H5.697l-1.283 3.36H.852L6.569 3.52zm.831 10.56h4.097L9.447 8.12l-2.047 5.96z"/>
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t.docs.sdk.anthropic.title}</h1>
            </div>
            <p className="text-lg text-gray-500 dark:text-slate-400 mb-8">
              {t.docs.sdk.anthropic.description}
            </p>

            <Tip>
              {t.docs.sdk.anthropic.tip}
            </Tip>

            {/* Installation */}
            <h2 id="installation" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.installation}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.installationDesc}
            </p>
            <TabbedCodeBlock
              tabs={[
                { label: 'Python', language: 'bash', code: 'pip install anthropic' },
                { label: 'Node.js', language: 'bash', code: 'npm install @anthropic-ai/sdk' },
                { label: 'Yarn', language: 'bash', code: 'yarn add @anthropic-ai/sdk' },
                { label: 'pnpm', language: 'bash', code: 'pnpm add @anthropic-ai/sdk' },
              ]}
            />

            {/* Configuration */}
            <h2 id="configuration" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.configuration}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.configurationDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});`
                }
              ]}
            />

            <Note>
              <strong>{t.docs.sdk.anthropic.configNote}</strong>
            </Note>

            {/* Cloudflare Warning */}
            <h2 id="cloudflare" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.cloudflare}</h2>
            <Warning>
              <strong>{t.docs.sdk.anthropic.cloudflareWarning}</strong>
            </Warning>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

# Custom User-Agent to bypass Cloudflare blocking
CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});`
                }
              ]}
            />

            {/* Basic Usage */}
            <h2 id="basic-usage" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.basicUsage}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.basicUsageDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=1024
)

print(response.content[0].text)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 1024
});

console.log(response.content[0].text);`
                }
              ]}
            />

            {/* Streaming */}
            <h2 id="streaming" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.streaming}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.streamingDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

with client.messages.stream(
    model="claude-sonnet-4-5-20250929",
    max_tokens=256,
    messages=[
        {"role": "user", "content": "Write a short poem about coding"}
    ]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Write a short poem about coding' }],
  maxTokens: 256
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}`
                }
              ]}
            />

            {/* System Messages */}
            <h2 id="system" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.systemMessages}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.systemMessagesDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    system="You are a helpful coding assistant. Always provide code examples.",
    messages=[
        {"role": "user", "content": "How do I read a file in Python?"}
    ]
)

print(response.content[0].text)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  system: 'You are a helpful coding assistant. Always provide code examples.',
  messages: [{ role: 'user', content: 'How do I read a file in Python?' }],
  maxTokens: 1024
});

console.log(response.content[0].text);`
                }
              ]}
            />

            {/* Environment Variables */}
            <h2 id="env-vars" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.envVars}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.envVarsDesc}
            </p>

            <CodeBlock
              code={`# Set these in your .env file or shell
export ANTHROPIC_API_KEY="your-trollllm-api-key"
export ANTHROPIC_BASE_URL="https://chat.trollllm.xyz"`}
              language="bash"
              title=".env"
            />

            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.envVarsNote}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from anthropic import Anthropic

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Will automatically use ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL
client = Anthropic(
    default_headers=CUSTOM_HEADERS
)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=1024
)
print(response.content[0].text)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import Anthropic from '@anthropic-ai/sdk';

// Will automatically use ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL
const client = new Anthropic({
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 1024
});
console.log(response.content[0].text);`
                }
              ]}
            />

            {/* Available Models */}
            <h2 id="models" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.anthropic.availableModels}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.anthropic.availableModelsDesc}
            </p>

            <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-400">{t.docs.sdk.anthropic.modelId}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-400">{t.docs.sdk.anthropic.modelDescription}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  <tr>
                    <td className="px-4 py-3"><code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-xs font-mono text-gray-700 dark:text-slate-300">claude-opus-4-5-20251101</code></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{t.docs.sdk.anthropic.opusDesc}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3"><code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-xs font-mono text-gray-700 dark:text-slate-300">claude-sonnet-4-5-20250929</code></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{t.docs.sdk.anthropic.sonnetDesc}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3"><code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-xs font-mono text-gray-700 dark:text-slate-300">claude-haiku-4-5-20251001</code></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{t.docs.sdk.anthropic.haikuDesc}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/sdk/openai" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>OpenAI SDK</span>
              </Link>
              <Link href="/docs/integrations/kilo-code" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>Kilo Code Integration</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-gray-200 dark:border-white/5 p-6">
          <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">On this page</h3>
          <nav className="space-y-2">
            <a href="#" className="block text-sm text-indigo-600 dark:text-white">Anthropic SDK</a>
            <a href="#installation" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Installation</a>
            <a href="#configuration" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Configuration</a>
            <a href="#cloudflare" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Cloudflare Bypass</a>
            <a href="#basic-usage" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Basic Usage</a>
            <a href="#streaming" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Streaming</a>
            <a href="#system" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">System Messages</a>
            <a href="#env-vars" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Environment Variables</a>
            <a href="#models" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Available Models</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
