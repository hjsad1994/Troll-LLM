'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

const API_BASE_URL = 'https://chat.trollllm.xyz'

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
      { title: 'Claude Code CLI', href: '/docs/integrations/claude-code', active: true },
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

// ===== CODE BLOCK =====
function Code({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg border border-white/10 overflow-hidden mb-4">
      {title && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/10 text-slate-500 text-xs">
          {title}
        </div>
      )}
      <pre className="p-4 bg-black overflow-x-auto">
        <code className="text-sm text-slate-300 font-mono">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
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
      <div className="flex border-b border-white/10 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === i ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-white'
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
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-semibold text-white">TrollLLM</Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-500 text-sm">Docs</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-500 hover:text-white transition-colors text-sm">Sign In</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex pt-[65px]">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-white text-black flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-64 h-[calc(100vh-65px)] bg-black border-r border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="p-4 space-y-6">
            {sidebarNavTranslated.map((section) => (
              <div key={section.title}>
                <h3 className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-2">{section.title}</h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block px-3 py-1.5 rounded text-sm ${
                          item.active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
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
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">Claude Code CLI</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">Claude Code CLI</h1>
          <p className="text-slate-500 mb-8">Connect Anthropic&apos;s terminal AI assistant to TrollLLM.</p>

          {/* Requirements */}
          <p className="text-slate-400 mb-6">
            <strong className="text-white">Requirements:</strong> Node.js 18+
          </p>

          {/* Step 1 */}
          <h2 id="install" className="text-xl font-semibold text-white mt-10 mb-4">1. Install</h2>
          <Code>{`npm install -g @anthropic-ai/claude-code`}</Code>

          {/* Step 2 */}
          <h2 id="configure" className="text-xl font-semibold text-white mt-10 mb-4">2. Configure</h2>

          <Tabs tabs={['settings.json', 'macOS/Linux', 'Windows']}>
            <div>
              <p className="text-slate-400 text-sm mb-3">
                Create <code className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">~/.claude/settings.json</code>:
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
              <p className="text-slate-400 text-sm mb-3">
                Add to <code className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">~/.bashrc</code> or <code className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">~/.zshrc</code>:
              </p>
              <Code>{`export ANTHROPIC_AUTH_TOKEN="your_api_key"
export ANTHROPIC_BASE_URL="${API_BASE_URL}"
export API_TIMEOUT_MS="600000"`}</Code>
              <p className="text-slate-500 text-sm">Then run: <code className="text-slate-300">source ~/.bashrc</code></p>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-3">Run in CMD (Admin):</p>
              <Code>{`setx ANTHROPIC_AUTH_TOKEN your_api_key
setx ANTHROPIC_BASE_URL ${API_BASE_URL}
setx API_TIMEOUT_MS 600000`}</Code>
              <p className="text-slate-500 text-sm">Restart terminal after running.</p>
            </div>
          </Tabs>

          {/* Step 3 */}
          <h2 id="run" className="text-xl font-semibold text-white mt-10 mb-4">3. Run</h2>
          <Code>{`cd your-project
claude`}</Code>

          {/* Models */}
          <h2 id="models" className="text-xl font-semibold text-white mt-10 mb-4">Model Configuration</h2>
          <p className="text-slate-400 text-sm mb-4">Optional environment variables to customize models:</p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-slate-500 font-medium">Variable</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Default</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr className="border-b border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_OPUS_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-opus-4-5-20250514</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_SONNET_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-sonnet-4-5-20250514</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 font-mono text-xs">ANTHROPIC_DEFAULT_HAIKU_MODEL</td>
                  <td className="py-2 font-mono text-xs">claude-haiku-4-5-20250514</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Troubleshooting */}
          <h2 id="troubleshooting" className="text-xl font-semibold text-white mt-10 mb-4">Troubleshooting</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-white font-medium mb-1">Authentication error</h3>
              <p className="text-slate-500">Check API key is correct, no extra spaces. Try deleting ~/.claude/settings.json and reconfigure.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Timeout error</h3>
              <p className="text-slate-500">Increase API_TIMEOUT_MS to 600000 or higher.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Connection error</h3>
              <p className="text-slate-500">Check internet connection. Ensure {API_BASE_URL} is not blocked by firewall.</p>
            </div>
          </div>

          {/* Verify */}
          <h2 id="verify" className="text-xl font-semibold text-white mt-10 mb-4">Verify Setup</h2>
          <p className="text-slate-400 text-sm mb-3">Run Claude Code and check status:</p>
          <Code>{`claude
# Then type: /status`}</Code>

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-6 border-t border-white/5 text-sm">
            <Link href="/docs/integrations/roo-code" className="text-slate-500 hover:text-white">
              ← Roo Code
            </Link>
            <Link href="/docs/integrations/droid" className="text-slate-500 hover:text-white">
              Droid →
            </Link>
          </div>
        </main>

        {/* TOC */}
        <aside className="hidden xl:block w-48 sticky top-[65px] h-[calc(100vh-65px)] p-6">
          <h4 className="text-slate-600 text-xs font-medium uppercase mb-3">On this page</h4>
          <nav className="space-y-2 text-sm">
            <a href="#install" className="block text-slate-500 hover:text-white">1. Install</a>
            <a href="#configure" className="block text-slate-500 hover:text-white">2. Configure</a>
            <a href="#run" className="block text-slate-500 hover:text-white">3. Run</a>
            <a href="#models" className="block text-slate-500 hover:text-white">Models</a>
            <a href="#troubleshooting" className="block text-slate-500 hover:text-white">Troubleshooting</a>
            <a href="#verify" className="block text-slate-500 hover:text-white">Verify</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
