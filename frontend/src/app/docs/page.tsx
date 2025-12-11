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
      { title: 'Introduction', href: '/docs', active: true },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ]
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Chat Completions', href: '/docs/api/chat' },
      { title: 'Models', href: '/docs/api/models' },
      { title: 'Streaming', href: '/docs/api/streaming' },
    ]
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Kilo Code', href: '/docs/integrations/kilo-code' },
      { title: 'Roo Code', href: '/docs/integrations/roo-code' },
      { title: 'Claude Code CLI', href: '/docs/integrations/claude-code' },
      { title: 'Droid', href: '/docs/integrations/droid' },
      { title: 'Cursor', href: '/docs/integrations/cursor' },
      { title: 'Continue', href: '/docs/integrations/continue' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { title: 'Pricing', href: '/docs/pricing' },
      { title: 'Rate Limits', href: '/docs/rate-limits' },
      { title: 'Changelog', href: '/docs/changelog' },
    ]
  },
]

// ===== TIP COMPONENT =====
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed flex-1">{children}</div>
      </div>
    </div>
  )
}

// ===== NOTE COMPONENT =====
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 mb-6">
      <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

// ===== CARD COMPONENT =====
function Card({
  title,
  description,
  href,
  icon
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group p-5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all shadow-sm"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-slate-500 text-sm leading-relaxed">{description}</p>
    </Link>
  )
}

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

    // Use placeholders to avoid regex conflicts with inserted HTML
    const strings: string[] = []
    const comments: string[] = []

    if (lang === 'python') {
      // Extract comments first
      escaped = escaped.replace(/(#.*$)/gm, (match) => {
        comments.push(match)
        return `__COMMENT_${comments.length - 1}__`
      })
      // Extract strings
      escaped = escaped.replace(/(".*?"|'.*?')/g, (match) => {
        strings.push(match)
        return `__STRING_${strings.length - 1}__`
      })
      // Highlight keywords and identifiers
      escaped = escaped
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
        .replace(/\b(OpenAI|client|response|chat|completions|create|base_url|api_key|model|messages|role|content|print|choices|message)\b/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>')
      // Restore strings and comments with highlighting
      strings.forEach((s, i) => {
        escaped = escaped.replace(`__STRING_${i}__`, `<span class="text-emerald-600 dark:text-emerald-400">${s}</span>`)
      })
      comments.forEach((c, i) => {
        escaped = escaped.replace(`__COMMENT_${i}__`, `<span class="text-gray-400 dark:text-slate-500">${c}</span>`)
      })
    } else if (lang === 'javascript' || lang === 'typescript') {
      // Extract comments first
      escaped = escaped.replace(/(\/\/.*$)/gm, (match) => {
        comments.push(match)
        return `__COMMENT_${comments.length - 1}__`
      })
      // Extract strings
      escaped = escaped.replace(/(".*?"|'.*?'|`.*?`)/g, (match) => {
        strings.push(match)
        return `__STRING_${strings.length - 1}__`
      })
      // Highlight keywords and identifiers
      escaped = escaped
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
        .replace(/\b(OpenAI|client|response|chat|completions|create|baseURL|apiKey|model|messages|role|content|console|log)\b/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>')
      // Restore strings and comments with highlighting
      strings.forEach((s, i) => {
        escaped = escaped.replace(`__STRING_${i}__`, `<span class="text-emerald-600 dark:text-emerald-400">${s}</span>`)
      })
      comments.forEach((c, i) => {
        escaped = escaped.replace(`__COMMENT_${i}__`, `<span class="text-gray-400 dark:text-slate-500">${c}</span>`)
      })
    } else if (lang === 'bash' || lang === 'shell') {
      // Extract comments first
      escaped = escaped.replace(/(#.*$)/gm, (match) => {
        comments.push(match)
        return `__COMMENT_${comments.length - 1}__`
      })
      // Extract strings
      escaped = escaped.replace(/(".*?"|'.*?')/g, (match) => {
        strings.push(match)
        return `__STRING_${strings.length - 1}__`
      })
      // Extract flags (before adding any HTML to avoid matching class names)
      const flags: string[] = []
      escaped = escaped.replace(/(\s)(-[a-zA-Z]|--[a-zA-Z-]+)/g, (match, space, flag) => {
        flags.push(flag)
        return `${space}__FLAG_${flags.length - 1}__`
      })
      // Highlight commands
      escaped = escaped
        .replace(/\b(curl|echo|export|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|node|npm|python|pip)\b/g, '<span class="text-yellow-600 dark:text-yellow-400">$1</span>')
      // Restore flags with highlighting
      flags.forEach((f, i) => {
        escaped = escaped.replace(`__FLAG_${i}__`, `<span class="text-cyan-600 dark:text-cyan-400">${f}</span>`)
      })
      // Restore strings with highlighting
      strings.forEach((s, i) => {
        escaped = escaped.replace(`__STRING_${i}__`, `<span class="text-emerald-600 dark:text-emerald-400">${s}</span>`)
      })
      // Restore comments with highlighting
      comments.forEach((c, i) => {
        escaped = escaped.replace(`__COMMENT_${i}__`, `<span class="text-gray-400 dark:text-slate-500">${c}</span>`)
      })
    }

    return escaped
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden mb-6 shadow-sm">
      {title && (
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">{title}</span>
          <span className="text-gray-400 dark:text-slate-600 text-xs font-mono uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-gray-900 dark:bg-[#0a0a0a] overflow-x-auto">
          <code
            className="text-sm text-gray-200 dark:text-slate-300 font-mono leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
          />
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 rounded bg-gray-800 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 border border-gray-700 dark:border-white/10 text-gray-400 dark:text-slate-500 hover:text-white transition-all"
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

// ===== MODEL BADGE =====
function ModelBadge({ name, isNew }: { name: string; isNew?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs whitespace-nowrap">
      <span className="text-gray-900 dark:text-white font-medium">{name}</span>
      {isNew && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">New</span>}
    </span>
  )
}

// ===== MAIN PAGE =====
export default function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()

  const sidebarNavTranslated = [
    {
      title: t.docs.sidebar.gettingStarted,
      items: [
        { title: t.docs.sidebar.introduction, href: '/docs', active: true },
        { title: t.docs.sidebar.quickstart, href: '/docs/quickstart' },
        { title: t.docs.sidebar.authentication, href: '/docs/authentication' },
      ]
    },
    {
      title: t.docs.sidebar.apiReference,
      items: [
        { title: t.docs.sidebar.chatCompletions, href: '/docs/api/chat' },
        { title: t.docs.sidebar.models, href: '/docs/api/models' },
        { title: t.docs.sidebar.streaming, href: '/docs/api/streaming' },
      ]
    },
    {
      title: t.docs.sidebar.integrations,
      items: [
        { title: t.docs.sidebar.kiloCode, href: '/docs/integrations/kilo-code' },
        { title: t.docs.sidebar.rooCode, href: '/docs/integrations/roo-code' },
        { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code' },
        { title: t.docs.sidebar.droid, href: '/docs/integrations/droid' },
        { title: t.docs.sidebar.cursor, href: '/docs/integrations/cursor' },
        { title: t.docs.sidebar.continue, href: '/docs/integrations/continue' },
      ]
    },
    {
      title: t.docs.sidebar.resources,
      items: [
        { title: t.docs.sidebar.pricing, href: '/docs/pricing' },
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
          className="fixed bottom-6 right-6 z-50 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-white dark:bg-black/95 backdrop-blur-xl lg:bg-transparent border-r border-gray-200 dark:border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-8">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.docs.sidebar.searchDocs}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-500 dark:text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNavTranslated.map((section) => (
                <div key={section.title}>
                  <h3 className="text-gray-500 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                    {section.title === t.docs.sidebar.gettingStarted && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {section.title === t.docs.sidebar.apiReference && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    )}
                    {section.title === t.docs.sidebar.integrations && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                    {section.title === t.docs.sidebar.resources && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group block px-3 py-2 rounded-lg text-sm transition-all ${
                            item.active
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            {item.title}
                            {item.active && (
                              <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
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
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 mb-8">
              <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-700 dark:text-slate-400">Introduction</span>
            </div>

            {/* Title with gradient */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {t.docs.intro.title}
              </h1>
              <p className="text-xl text-gray-500 dark:text-slate-400 leading-relaxed">
                {t.docs.intro.description}
              </p>
            </div>

            {/* Model highlight */}
            <Tip>
              <strong className="text-emerald-600 dark:text-emerald-400">{t.docs.intro.tipNew}</strong> {t.docs.intro.tipModels}
              <span className="text-gray-900 dark:text-white mx-1">Claude 4.5 series</span>,
              <span className="text-gray-900 dark:text-white mx-1">GPT-5.1</span>, and
              <span className="text-gray-900 dark:text-white mx-1">Gemini 3 Pro</span> {t.docs.intro.tipContext}
            </Tip>

            {/* Available Models */}
            <div className="flex flex-wrap gap-2 mb-6">
              <ModelBadge name="claude-opus-4-5-20251101" />
              <ModelBadge name="claude-sonnet-4-5-20250929" />
              <ModelBadge name="claude-haiku-4-5-20251001" />
              <ModelBadge name="gpt-5.1" isNew />
              <ModelBadge name="gemini-3-pro-preview" isNew />
            </div>

            <Note>
              {t.docs.intro.noteCompatible}
            </Note>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-white/10 my-12" />

            {/* Get Started */}
            <div id="quickstart" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.docs.intro.getStarted}</h2>
              <p className="text-gray-500 dark:text-slate-500 mb-6">
                {t.docs.intro.getStartedDesc}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              <Card
                title={t.docs.intro.quickstartTitle}
                description={t.docs.intro.quickstartDesc}
                href="/docs/quickstart"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.intro.authTitle}
                description={t.docs.intro.authDesc}
                href="/docs/authentication"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.intro.apiRefTitle}
                description={t.docs.intro.apiRefDesc}
                href="/docs/api/chat"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
              />
            </div>

            {/* Quick Example */}
            <div className="h-px bg-gray-200 dark:bg-white/10 my-12" />

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.docs.intro.quickExample}</h2>
              <p className="text-gray-500 dark:text-slate-500 mb-6">
                {t.docs.intro.quickExampleDesc}
              </p>
            </div>
            <CodeBlock
              title="example.py"
              language="python"
              code={`from openai import OpenAI

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`}
            />

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-white/10 my-12" />

            {/* Integrations */}
            <div id="integrations" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.docs.intro.integrationsTitle}</h2>
              <p className="text-gray-500 dark:text-slate-500 mb-6">
                {t.docs.intro.integrationsDesc}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mb-12">
              <Card
                title={t.docs.sidebar.kiloCode}
                description={t.docs.intro.kiloCodeDesc}
                href="/docs/integrations/kilo-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.sidebar.rooCode}
                description={t.docs.intro.rooCodeDesc}
                href="/docs/integrations/roo-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.sidebar.claudeCode}
                description={t.docs.intro.claudeCodeDesc}
                href="/docs/integrations/claude-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.sidebar.droid}
                description={t.docs.intro.droidDesc}
                href="/docs/integrations/droid"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.sidebar.cursor}
                description={t.docs.intro.cursorDesc}
                href="/docs/integrations/cursor"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.sidebar.continue}
                description={t.docs.intro.continueDesc}
                href="/docs/integrations/continue"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-white/10 my-12" />

            {/* Support */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.docs.intro.supportTitle}</h2>
              <p className="text-gray-500 dark:text-slate-500 mb-6">
                {t.docs.intro.supportDesc}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Card
                title={t.docs.intro.apiStatus}
                description={t.docs.intro.apiStatusDesc}
                href="/status"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <Card
                title={t.docs.intro.contactSupport}
                description={t.docs.intro.contactSupportDesc}
                href="mailto:support@trollllm.io"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="text-gray-500 dark:text-slate-600 text-sm">
                {t.docs.intro.lastUpdated} November 2024
              </div>
              <Link href="/docs/quickstart" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                <span className="font-medium">{t.docs.intro.next} {t.docs.intro.quickstartTitle}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        <aside className="hidden xl:block w-64 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-gray-200 dark:border-white/5 p-6">
          <h3 className="text-gray-500 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {t.docs.intro.onThisPage}
          </h3>
          <nav className="space-y-3">
            <a href="#" className="group flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              {t.docs.sidebar.introduction}
            </a>
            <a href="#quickstart" className="group flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">
              {t.docs.intro.getStarted}
            </a>
            <a href="#" className="group flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">
              {t.docs.intro.quickExample}
            </a>
            <a href="#integrations" className="group flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">
              {t.docs.intro.integrationsTitle}
            </a>
            <a href="#" className="group flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">
              {t.docs.intro.supportTitle}
            </a>
          </nav>

          {/* Help Card */}
          <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-1">{t.docs.intro.needHelp}</h4>
                <p className="text-gray-500 dark:text-slate-400 text-xs leading-relaxed mb-3">
                  {t.docs.intro.needHelpDesc}
                </p>
                <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium transition-colors">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {t.docs.intro.joinDiscord}
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
