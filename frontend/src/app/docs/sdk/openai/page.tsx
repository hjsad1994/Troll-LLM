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
      { title: 'OpenAI SDK', href: '/docs/sdk/openai', active: true },
      { title: 'Anthropic SDK', href: '/docs/sdk/anthropic' },
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
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|base_url|api_key|model|messages|role|content|print|choices|message|stream|delta|usage|input_tokens|output_tokens|prompt_tokens|completion_tokens)\b/g, `${blue}$1${end}`)
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/(\/\/.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, `${purple}$1${end}`)
        .replace(/\b(OpenAI|client|response|chat|completions|create|baseURL|apiKey|model|messages|role|content|console|log|stream|delta|usage)\b/g, `${blue}$1${end}`)
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
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|base_url|api_key|model|messages|role|content|print|choices|message|stream|delta|usage|input_tokens|output_tokens|prompt_tokens|completion_tokens|text|max_tokens)\b/g, `${blue}$1${end}`)
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/(\/\/.*$)/gm, `${gray}$1${end}`)
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, `${purple}$1${end}`)
        .replace(/\b(OpenAI|client|response|chat|completions|create|baseURL|apiKey|model|messages|role|content|console|log|stream|delta|usage|maxTokens)\b/g, `${blue}$1${end}`)
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
export default function OpenAISDKPage() {
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
        { title: t.docs.sidebar.openaiSdk, href: '/docs/sdk/openai', active: true },
        { title: t.docs.sidebar.anthropicSdk, href: '/docs/sdk/anthropic' },
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
              <span className="text-gray-700 dark:text-slate-400">OpenAI SDK</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t.docs.sdk.openai.title}</h1>
            </div>
            <p className="text-lg text-gray-500 dark:text-slate-400 mb-8">
              {t.docs.sdk.openai.description}
            </p>

            <Tip>
              {t.docs.sdk.openai.tip}
            </Tip>

            {/* Installation */}
            <h2 id="installation" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.installation}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.installationDesc}
            </p>
            <TabbedCodeBlock
              tabs={[
                { label: 'Python', language: 'bash', code: 'pip install openai' },
                { label: 'Node.js', language: 'bash', code: 'npm install openai' },
                { label: 'Yarn', language: 'bash', code: 'yarn add openai' },
                { label: 'pnpm', language: 'bash', code: 'pnpm add openai' },
              ]}
            />

            {/* Configuration */}
            <h2 id="configuration" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.configuration}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.configurationDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});`
                }
              ]}
            />

            <Note>
              <strong>{t.docs.sdk.openai.configNote}</strong>
            </Note>

            {/* Cloudflare Warning */}
            <h2 id="cloudflare" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.cloudflare}</h2>
            <Warning>
              <strong>{t.docs.sdk.openai.cloudflareWarning}</strong>
            </Warning>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

# Custom User-Agent to bypass Cloudflare blocking
CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'your-trollllm-api-key',
  baseURL: 'https://chat.trollllm.xyz/v1',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});`
                }
              ]}
            />

            {/* Basic Usage */}
            <h2 id="basic-usage" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.basicUsage}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.basicUsageDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=1024
)

print(response.choices[0].message.content)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 1024
});

console.log(response.choices[0].message.content);`
                }
              ]}
            />

            {/* Streaming */}
            <h2 id="streaming" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.streaming}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.streamingDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

stream = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Write a short poem about coding"}],
    max_tokens=256,
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const stream = await client.chat.completions.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Write a short poem about coding' }],
  maxTokens: 256,
  stream: true
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}`
                }
              ]}
            />

            {/* List Models */}
            <h2 id="models" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.listModels}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.listModelsDesc}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-trollllm-api-key",
    default_headers=CUSTOM_HEADERS
)

models = client.models.list()

for model in models.data:
    print(model.id)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-trollllm-api-key',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const models = await client.models.list();

for (const model of models.data) {
  console.log(model.id);
}`
                }
              ]}
            />

            {/* Environment Variables */}
            <h2 id="env-vars" className="text-2xl font-semibold text-gray-900 dark:text-white mt-12 mb-4">{t.docs.sdk.openai.envVars}</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.envVarsDesc}
            </p>

            <CodeBlock
              code={`# Set these in your .env file or shell
export OPENAI_API_KEY="your-trollllm-api-key"
export OPENAI_BASE_URL="https://chat.trollllm.xyz/v1"`}
              language="bash"
              title=".env"
            />

            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {t.docs.sdk.openai.envVarsNote}
            </p>

            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Python',
                  language: 'python',
                  code: `from openai import OpenAI

CUSTOM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Will automatically use OPENAI_API_KEY and OPENAI_BASE_URL
client = OpenAI(
    default_headers=CUSTOM_HEADERS
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=1024
)
print(response.choices[0].message.content)`
                },
                {
                  label: 'JavaScript',
                  language: 'javascript',
                  code: `import OpenAI from 'openai';

// Will automatically use OPENAI_API_KEY and OPENAI_BASE_URL
const client = new OpenAI({
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 1024
});
console.log(response.choices[0].message.content);`
                }
              ]}
            />

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/authentication" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Authentication</span>
              </Link>
              <Link href="/docs/sdk/anthropic" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>Anthropic SDK</span>
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
            <a href="#" className="block text-sm text-indigo-600 dark:text-white">OpenAI SDK</a>
            <a href="#installation" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Installation</a>
            <a href="#configuration" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Configuration</a>
            <a href="#cloudflare" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Cloudflare Bypass</a>
            <a href="#basic-usage" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Basic Usage</a>
            <a href="#streaming" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Streaming</a>
            <a href="#models" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">List Models</a>
            <a href="#env-vars" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Environment Variables</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
