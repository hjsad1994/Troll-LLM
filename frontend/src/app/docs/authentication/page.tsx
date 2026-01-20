'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

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

    const strings: string[] = []
    const comments: string[] = []

    if (lang === 'python') {
      escaped = escaped.replace(/(#.*$)/gm, (match) => {
        comments.push(match)
        return `__COMMENT_${comments.length - 1}__`
      })
      escaped = escaped.replace(/(".*?"|'.*?')/g, (match) => {
        strings.push(match)
        return `__STRING_${strings.length - 1}__`
      })
      escaped = escaped
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|base_url|api_key|model|role|content|print|choices|max_tokens|os|getenv|environ)\b/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>')
      strings.forEach((s, i) => {
        escaped = escaped.replace(`__STRING_${i}__`, `<span class="text-emerald-600 dark:text-emerald-400">${s}</span>`)
      })
      comments.forEach((c, i) => {
        escaped = escaped.replace(`__COMMENT_${i}__`, `<span class="text-gray-400 dark:text-slate-500">${c}</span>`)
      })
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped.replace(/(\/\/.*$)/gm, (match) => {
        comments.push(match)
        return `__COMMENT_${comments.length - 1}__`
      })
      escaped = escaped.replace(/(".*?"|'.*?'|`.*?`)/g, (match) => {
        strings.push(match)
        return `__STRING_${strings.length - 1}__`
      })
      escaped = escaped
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|baseURL|apiKey|model|role|content|console|log|process|env)\b/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>')
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
    } else if (lang === 'json') {
      escaped = escaped
        .replace(/("[\w_-]+")(\\s*:)/g, '<span class="text-cyan-600 dark:text-cyan-400">$1</span>$2')
        .replace(/:\\s*(".*?")/g, ': <span class="text-emerald-600 dark:text-emerald-400">$1</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="text-purple-600 dark:text-purple-400">$1</span>')
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

// ===== WARNING COMPONENT =====
function Warning({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-amber-700 dark:text-amber-400 font-medium text-sm mb-1">{title}</h4>
          <div className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ===== SUCCESS COMPONENT =====
function Success({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-emerald-700 dark:text-emerald-400 font-medium text-sm mb-1">{title}</h4>
          <div className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ===== SECTION COMPONENT =====
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-12">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      <div className="text-gray-600 dark:text-slate-400">{children}</div>
    </section>
  )
}

// ===== MAIN PAGE =====
export default function AuthenticationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()

  const sidebarNavTranslated = [
    {
      title: t.docs.sidebar.gettingStarted,
      items: [
        { title: t.docs.sidebar.introduction, href: '/docs' },
        { title: t.docs.sidebar.quickstart, href: '/docs/quickstart' },
        { title: t.docs.sidebar.authentication, href: '/docs/authentication', active: true },
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
              <span className="text-gray-700 dark:text-slate-400">Authentication</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t.docs.authentication.title}</h1>
            <p className="text-lg text-gray-500 dark:text-slate-400 mb-8">
              {t.docs.authentication.description}
            </p>

            {/* Getting API Key */}
            <Section id="get-api-key" title={t.docs.authentication.getApiKey}>
              <p className="mb-4">
                {t.docs.authentication.getApiKeyDesc}
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-sm flex-shrink-0">1</div>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.step1Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">
                      {t.docs.authentication.step1Desc} <Link href="/register" className="text-indigo-600 dark:text-sky-400 hover:underline">trollllm.xyz/register</Link> {t.docs.authentication.step1Link}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-sm flex-shrink-0">2</div>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.step2Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">
                      {t.docs.authentication.step2Desc} <Link href="/dashboard" className="text-indigo-600 dark:text-sky-400 hover:underline">Dashboard</Link>.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-sm flex-shrink-0">3</div>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.step3Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">
                      {t.docs.authentication.step3Desc}
                    </p>
                  </div>
                </div>
              </div>

              <Note>
                {t.docs.authentication.noteApiKey}
              </Note>
            </Section>

            {/* Using API Key */}
            <Section id="using-api-key" title={t.docs.authentication.usingApiKey}>
              <p className="mb-4">
                {t.docs.authentication.usingApiKeyDesc}
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t.docs.authentication.openaiFormat}</h3>
              <p className="mb-4 text-sm">
                {t.docs.authentication.openaiFormatDesc}
              </p>
              <CodeBlock
                code={`curl https://chat.trollllm.xyz/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-api-key" \\
  -d '{"model": "gpt-5.1", "messages": [{"role": "user", "content": "Hello!"}]}'`}
                language="bash"
                title="cURL"
              />

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t.docs.authentication.anthropicFormat}</h3>
              <p className="mb-4 text-sm">
                {t.docs.authentication.anthropicFormatDesc}
              </p>
              <CodeBlock
                code={`curl https://chat.trollllm.xyz/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your-api-key" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{"model": "claude-sonnet-4-5-20250929", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello!"}]}'`}
                language="bash"
                title="cURL"
              />
            </Section>

            {/* Environment Variables */}
            <Section id="environment-variables" title={t.docs.authentication.envVars}>
              <p className="mb-4">
                {t.docs.authentication.envVarsDesc}
              </p>

              <CodeBlock
                code={`# Add to your .env file or shell profile
export TROLLLLM_API_KEY="your-api-key-here"

# For OpenAI SDK compatibility
export OPENAI_API_KEY="your-api-key-here"
export OPENAI_BASE_URL="https://chat.trollllm.xyz/v1"

# For Anthropic SDK compatibility
export ANTHROPIC_API_KEY="your-api-key-here"
export ANTHROPIC_BASE_URL="https://chat.trollllm.xyz"`}
                language="bash"
                title=".env / .bashrc / .zshrc"
              />

              <Success title="Pro Tip">
                {t.docs.authentication.envVarsTip}
              </Success>
            </Section>

            {/* Security Best Practices */}
            <Section id="security" title={t.docs.authentication.security}>
              <p className="mb-4">
                {t.docs.authentication.securityDesc}
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.securityTip1Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.authentication.securityTip1Desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.securityTip2Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.authentication.securityTip2Desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.securityTip3Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.authentication.securityTip3Desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.authentication.securityTip4Title}</h4>
                    <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.authentication.securityTip4Desc}</p>
                  </div>
                </div>
              </div>

              <Warning title="Important">
                {t.docs.authentication.securityWarning}
              </Warning>
            </Section>

            {/* Rotating API Key */}
            <Section id="rotate-key" title={t.docs.authentication.rotateKey}>
              <p className="mb-4">
                {t.docs.authentication.rotateKeyDesc}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-slate-400 text-xs font-medium">1</div>
                  <span className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.authentication.rotateStep1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-slate-400 text-xs font-medium">2</div>
                  <span className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.authentication.rotateStep2}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-slate-400 text-xs font-medium">3</div>
                  <span className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.authentication.rotateStep3}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-slate-400 text-xs font-medium">4</div>
                  <span className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.authentication.rotateStep4}</span>
                </div>
              </div>

              <Warning title="Warning">
                {t.docs.authentication.rotateWarning}
              </Warning>
            </Section>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/quickstart" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t.docs.authentication.prev}</span>
              </Link>
              <Link href="/docs/api/chat" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>{t.docs.authentication.next}</span>
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
            <a href="#get-api-key" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Getting Your API Key</a>
            <a href="#using-api-key" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Using Your API Key</a>
            <a href="#environment-variables" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Environment Variables</a>
            <a href="#security" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Security Best Practices</a>
            <a href="#rotate-key" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Rotating Your API Key</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
