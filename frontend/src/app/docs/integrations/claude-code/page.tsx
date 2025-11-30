'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

const API_BASE_URL = 'https://chat.trollllm.xyz'

// ===== CODE BLOCK =====
function Code({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden mb-4">
      {title && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-500 text-xs">
          {title}
        </div>
      )}
      <pre className="p-4 bg-gray-900 dark:bg-black overflow-x-auto">
        <code className="text-sm text-gray-200 dark:text-slate-300 font-mono">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-800 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 text-gray-400 dark:text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ===== TABS =====
function Tabs({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="mb-6">
      <div className="flex border-b border-gray-200 dark:border-white/10 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === i ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  )
}

// ===== MAIN PAGE =====
export default function ClaudeCodePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()

  const sidebarNavTranslated = [
    { title: t.docs.sidebar.gettingStarted, items: [
      { title: t.docs.sidebar.introduction, href: '/docs' },
      { title: t.docs.sidebar.quickstart, href: '/docs/quickstart' },
      { title: t.docs.sidebar.authentication, href: '/docs/authentication' },
    ]},
    { title: t.docs.sidebar.apiReference, items: [
      { title: t.docs.sidebar.chatCompletions, href: '/docs/api/chat' },
      { title: t.docs.sidebar.models, href: '/docs/api/models' },
      { title: t.docs.sidebar.streaming, href: '/docs/api/streaming' },
    ]},
    { title: t.docs.sidebar.integrations, items: [
      { title: t.docs.sidebar.kiloCode, href: '/docs/integrations/kilo-code' },
      { title: t.docs.sidebar.rooCode, href: '/docs/integrations/roo-code' },
      { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code', active: true },
      { title: t.docs.sidebar.droid, href: '/docs/integrations/droid' },
      { title: t.docs.sidebar.cursor, href: '/docs/integrations/cursor' },
      { title: t.docs.sidebar.continue, href: '/docs/integrations/continue' },
    ]},
    { title: t.docs.sidebar.resources, items: [
      { title: t.docs.sidebar.pricing, href: '/docs/pricing' },
      { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
      { title: t.docs.sidebar.changelog, href: '/docs/changelog' },
    ]},
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header activeLink="docs" />

      <div className="flex pt-[65px]">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-64 h-[calc(100vh-65px)] bg-white dark:bg-black border-r border-gray-200 dark:border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="p-4 space-y-6">
            {sidebarNavTranslated.map((section) => (
              <div key={section.title}>
                <h3 className="text-gray-500 dark:text-slate-600 text-xs font-medium uppercase tracking-wider mb-2">{section.title}</h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block px-3 py-1.5 rounded text-sm ${
                          item.active ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
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
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-10 max-w-3xl">
          {/* Breadcrumb */}
          <div className="text-sm text-gray-500 dark:text-slate-500 mb-6">
            <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white">Docs</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 dark:text-slate-400">Claude Code CLI</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.docs.integrations.claudeCode.title}</h1>
          <p className="text-gray-500 dark:text-slate-500 mb-8">{t.docs.integrations.claudeCode.description}</p>

          {/* Requirements */}
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            <strong className="text-gray-900 dark:text-white">{t.docs.integrations.claudeCode.requirements}</strong> {t.docs.integrations.claudeCode.nodejs}
          </p>

          {/* Step 1 */}
          <h2 id="install" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.install}</h2>
          <Code>{`npm install -g @anthropic-ai/claude-code`}</Code>

          {/* Step 2 */}
          <h2 id="configure" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.configure}</h2>

          <Tabs tabs={[t.docs.integrations.claudeCode.settingsJson, t.docs.integrations.claudeCode.macLinux, t.docs.integrations.claudeCode.windows]}>
            <div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
                {t.docs.integrations.claudeCode.createSettings} <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">~/.claude/settings.json</code>:
              </p>
              <Code title="~/.claude/settings.json">{`{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your_api_key",
    "ANTHROPIC_BASE_URL": "${API_BASE_URL}",
    "API_TIMEOUT_MS": "600000"
  }
}`}</Code>
            </div>

            <div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
                {t.docs.integrations.claudeCode.addToShell} <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">~/.bashrc</code> {t.docs.integrations.claudeCode.or} <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">~/.zshrc</code>:
              </p>
              <Code>{`export ANTHROPIC_AUTH_TOKEN="your_api_key"
export ANTHROPIC_BASE_URL="${API_BASE_URL}"
export API_TIMEOUT_MS="600000"`}</Code>
              <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.integrations.claudeCode.thenRun} <code className="text-gray-800 dark:text-slate-300">source ~/.bashrc</code></p>
            </div>

            <div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">{t.docs.integrations.claudeCode.runInCmd}</p>
              <Code>{`setx ANTHROPIC_AUTH_TOKEN your_api_key
setx ANTHROPIC_BASE_URL ${API_BASE_URL}
setx API_TIMEOUT_MS 600000`}</Code>
              <p className="text-gray-500 dark:text-slate-500 text-sm">{t.docs.integrations.claudeCode.restartTerminal}</p>
            </div>
          </Tabs>

          {/* Step 3 */}
          <h2 id="run" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.run}</h2>
          <Code>{`cd your-project
claude`}</Code>

          {/* Models */}
          <h2 id="models" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.modelConfig}</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">{t.docs.integrations.claudeCode.modelConfigDesc}</p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 text-gray-500 dark:text-slate-500 font-medium">{t.docs.integrations.claudeCode.variable}</th>
                  <th className="text-left py-2 text-gray-500 dark:text-slate-500 font-medium">{t.docs.integrations.claudeCode.default}</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-slate-400">
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_OPUS_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-opus-4-5-20250514</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_SONNET_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-sonnet-4-5-20250514</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_HAIKU_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-haiku-4-5-20250514</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Troubleshooting */}
          <h2 id="troubleshooting" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.troubleshooting}</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.integrations.claudeCode.authError}</h3>
              <p className="text-gray-500 dark:text-slate-500">{t.docs.integrations.claudeCode.authErrorDesc}</p>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.integrations.claudeCode.timeoutError}</h3>
              <p className="text-gray-500 dark:text-slate-500">{t.docs.integrations.claudeCode.timeoutErrorDesc}</p>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">{t.docs.integrations.claudeCode.connError}</h3>
              <p className="text-gray-500 dark:text-slate-500">{t.docs.integrations.claudeCode.connErrorDesc} {API_BASE_URL} {t.docs.integrations.claudeCode.notBlocked}</p>
            </div>
          </div>

          {/* Verify */}
          <h2 id="verify" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.claudeCode.verifySetup}</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">{t.docs.integrations.claudeCode.verifyDesc}</p>
          <Code>{`claude
# ${t.docs.integrations.claudeCode.thenType} /status`}</Code>

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-6 border-t border-gray-200 dark:border-white/5 text-sm">
            <Link href="/docs/integrations/roo-code" className="text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">
              ← Roo Code
            </Link>
            <Link href="/docs/integrations/droid" className="text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">
              Droid →
            </Link>
          </div>
        </main>

        {/* TOC */}
        <aside className="hidden xl:block w-48 sticky top-[65px] h-[calc(100vh-65px)] p-6">
          <h4 className="text-gray-500 dark:text-slate-600 text-xs font-medium uppercase mb-3">On this page</h4>
          <nav className="space-y-2 text-sm">
            <a href="#install" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">1. Install</a>
            <a href="#configure" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">2. Configure</a>
            <a href="#run" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">3. Run</a>
            <a href="#models" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Models</a>
            <a href="#troubleshooting" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Troubleshooting</a>
            <a href="#verify" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Verify</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
