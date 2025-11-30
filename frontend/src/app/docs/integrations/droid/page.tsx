'use client'

import Link from 'next/link'
import { useState } from 'react'
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
      { title: 'Droid', href: '/docs/integrations/droid', active: true },
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

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
      {title && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <span className="text-slate-500 text-xs font-medium">{title}</span>
          <span className="text-slate-600 text-xs">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-[#0a0a0a] overflow-x-auto">
          <code className="text-sm text-slate-300 font-mono">{code}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
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
    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== TIP COMPONENT =====
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== STEP COMPONENT =====
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12 pb-8 border-l border-white/10 last:border-0 last:pb-0">
      <div className="absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm font-medium">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="text-slate-400">{children}</div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function DroidPage() {
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
      { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code' },
      { title: t.docs.sidebar.droid, href: '/docs/integrations/droid', active: true },
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-semibold text-white">
              TrollLLM
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 text-sm">Documentation</span>
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

      <div className="flex pt-[65px]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-black lg:bg-transparent border-r border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.docs.sidebar.searchDocs}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-white/10 transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/5 text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNavTranslated.map((section) => (
                <div key={section.title}>
                  <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            item.active
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
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
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <span>/</span>
              <Link href="/docs" className="hover:text-white transition-colors">Integrations</Link>
              <span>/</span>
              <span className="text-slate-400">Droid</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                D
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Droid</h1>
                <p className="text-slate-500">AI Software Engineering Agent by Factory</p>
              </div>
            </div>

            <p className="text-lg text-slate-400 mb-8">
              Configure Droid to use Claude models through TrollLLM for autonomous code generation and software engineering tasks.
            </p>

            <Tip>
              Droid is a powerful AI agent that can understand, write, and debug code autonomously. Using it with Claude models via TrollLLM gives you access to the latest AI capabilities.
            </Tip>

            {/* Prerequisites */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Prerequisites</h2>
            <ul className="list-disc list-inside text-slate-400 space-y-2 mb-8">
              <li>Droid installed (via npm, brew, or direct download)</li>
              <li>A TrollLLM API key (<Link href="/register" className="text-sky-400 hover:underline">get one here</Link>)</li>
              <li>Terminal access</li>
            </ul>

            {/* Configuration Steps */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-6">Configuration</h2>

            <div className="mt-6">
              <Step number={1} title="Set API configuration">
                <p className="mb-4">
                  Configure Droid to use TrollLLM by setting the API base URL and key:
                </p>
                <CodeBlock
                  title="Environment Variables"
                  language="bash"
                  code={`# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export ANTHROPIC_BASE_URL="https://chat.trollllm.xyz"
export ANTHROPIC_API_KEY="your-trollllm-api-key"`}
                />
              </Step>

              <Step number={2} title="Configure Droid settings">
                <p className="mb-4">
                  Create or update your Droid configuration file:
                </p>
                <CodeBlock
                  title="~/.droid/config.json"
                  language="json"
                  code={`{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5",
  "apiBaseUrl": "https://chat.trollllm.xyz",
  "maxTokens": 8192,
  "temperature": 0.7
}`}
                />
              </Step>

              <Step number={3} title="Select the right model">
                <p className="mb-4">
                  Choose a model based on your task complexity:
                </p>
                <div className="space-y-3 mb-4">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-emerald-400 font-mono">claude-opus-4-5</code>
                      <span className="text-emerald-400 text-xs px-2 py-0.5 rounded bg-emerald-500/20">Best Quality</span>
                    </div>
                    <p className="text-slate-500 text-sm">For complex architecture decisions, large refactoring, and difficult debugging. Maximum reasoning capability.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sky-400 font-mono">claude-sonnet-4-5</code>
                      <span className="text-sky-400 text-xs px-2 py-0.5 rounded bg-sky-500/20">Recommended</span>
                    </div>
                    <p className="text-slate-500 text-sm">Best for most development tasks. Good balance of speed and quality for everyday coding work.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-amber-400 font-mono">claude-haiku-4-5</code>
                      <span className="text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/20">Fastest</span>
                    </div>
                    <p className="text-slate-500 text-sm">Quick iterations, simple edits, and high-frequency tasks where speed matters most.</p>
                  </div>
                </div>
              </Step>

              <Step number={4} title="Test the integration">
                <p className="mb-4">
                  Verify Droid is properly connected to TrollLLM:
                </p>
                <CodeBlock
                  code={`# Start a new Droid session
droid

# Or run a quick test
droid "What's 2+2?"`}
                  language="bash"
                />
              </Step>
            </div>

            <Note>
              Droid stores conversation context locally. Your code and conversations are not sent to TrollLLM beyond the API requests for completions.
            </Note>

            {/* Usage Tips */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Usage Tips</h2>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Use Opus for complex tasks</h3>
                <p className="text-slate-400 text-sm">When you need deep analysis or architectural decisions, switch to <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">claude-opus-4-5</code> for maximum capability.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Batch simple tasks with Haiku</h3>
                <p className="text-slate-400 text-sm">For repetitive or simple tasks like formatting or basic refactoring, <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">claude-haiku-4-5</code> provides fast results at lower cost.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Leverage context window</h3>
                <p className="text-slate-400 text-sm">Claude models support 200K context window. You can feed entire codebases for comprehensive understanding.</p>
              </div>
            </div>

            {/* Troubleshooting */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Troubleshooting</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Connection errors</h3>
                <p className="text-slate-400 text-sm">Ensure <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">ANTHROPIC_BASE_URL</code> is set to <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">https://chat.trollllm.xyz</code> (without /v1 suffix for Droid).</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Model not responding</h3>
                <p className="text-slate-400 text-sm">Check your API key is valid and has available credits. You can verify in your <Link href="/dashboard" className="text-sky-400 hover:underline">dashboard</Link>.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Slow responses</h3>
                <p className="text-slate-400 text-sm">Try using <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">claude-haiku-4-5</code> for faster responses, or reduce <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">maxTokens</code> in your config.</p>
              </div>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
              <Link href="/docs/integrations/claude-code" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Claude Code CLI</span>
              </Link>
              <Link href="/docs/integrations/cursor" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span>Cursor</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-white/5 p-6">
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">On this page</h3>
          <nav className="space-y-2">
            <a href="#" className="block text-sm text-white">Droid</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Prerequisites</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Configuration</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Usage Tips</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Troubleshooting</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
