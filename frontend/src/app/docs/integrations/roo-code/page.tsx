'use client'

import Link from 'next/link'
import { useState } from 'react'

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
      { title: 'Roo Code', href: '/docs/integrations/roo-code', active: true },
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
export default function RooCodePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
                placeholder="Search docs..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-white/10 transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/5 text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNav.map((section) => (
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
              <span className="text-slate-400">Roo Code</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
                R
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Roo Code</h1>
                <p className="text-slate-500">VS Code Extension</p>
              </div>
            </div>

            <p className="text-lg text-slate-400 mb-8">
              Configure Roo Code to use Claude models through TrollLLM for intelligent code completion and AI assistance in VS Code.
            </p>

            <Tip>
              Roo Code works seamlessly with TrollLLM&apos;s OpenAI-compatible API. Just configure the base URL and API key to get started.
            </Tip>

            {/* Prerequisites */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Prerequisites</h2>
            <ul className="list-disc list-inside text-slate-400 space-y-2 mb-8">
              <li>VS Code installed</li>
              <li>Roo Code extension from VS Code Marketplace</li>
              <li>A TrollLLM API key (<Link href="/register" className="text-sky-400 hover:underline">get one here</Link>)</li>
            </ul>

            {/* Configuration Steps */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-6">Configuration</h2>

            <div className="mt-6">
              <Step number={1} title="Open Roo Code Settings">
                <p className="mb-4">
                  In VS Code, click on the Roo Code icon in the sidebar, then click the gear icon to open settings. Or use Command Palette (<code className="px-1.5 py-0.5 rounded bg-white/10 text-white text-sm">Cmd/Ctrl + Shift + P</code>) and search for &quot;Roo Code: Settings&quot;.
                </p>
              </Step>

              <Step number={2} title="Configure API Provider">
                <p className="mb-4">
                  In the API Provider settings, select &quot;OpenAI Compatible&quot; and configure:
                </p>
                <CodeBlock
                  title="Roo Code Settings"
                  language="json"
                  code={`{
  "rooCode.apiProvider": "openai-compatible",
  "rooCode.openaiCompatible.baseUrl": "https://api.trollllm.io/v1",
  "rooCode.openaiCompatible.apiKey": "your-trollllm-api-key",
  "rooCode.openaiCompatible.model": "claude-sonnet-4-5"
}`}
                />
              </Step>

              <Step number={3} title="Choose your model">
                <p className="mb-4">
                  Select the Claude model based on your needs:
                </p>
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <code className="text-emerald-400">claude-opus-4-5</code>
                    <span className="text-slate-500 ml-2">— Complex refactoring and architecture</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <code className="text-sky-400">claude-sonnet-4-5</code>
                    <span className="text-slate-500 ml-2">— Best for everyday coding</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <code className="text-amber-400">claude-haiku-4-5</code>
                    <span className="text-slate-500 ml-2">— Fast completions</span>
                  </div>
                </div>
              </Step>

              <Step number={4} title="Test the connection">
                <p className="mb-4">
                  Open any code file and try Roo Code&apos;s features:
                </p>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>Use inline completion suggestions</li>
                  <li>Open chat panel for conversations</li>
                  <li>Select code and ask questions about it</li>
                </ul>
              </Step>
            </div>

            {/* Troubleshooting */}
            <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Troubleshooting</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">No completions showing</h3>
                <p className="text-slate-400 text-sm">Verify the base URL ends with <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">/v1</code> and your API key is correct.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-white font-medium mb-2">Slow responses</h3>
                <p className="text-slate-400 text-sm">Try using <code className="px-1 py-0.5 rounded bg-white/10 text-slate-300">claude-haiku-4-5</code> for faster inline completions.</p>
              </div>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
              <Link href="/docs/integrations/kilo-code" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Kilo Code</span>
              </Link>
              <Link href="/docs/integrations/claude-code" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span>Claude Code CLI</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-white/5 p-6">
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">On this page</h3>
          <nav className="space-y-2">
            <a href="#" className="block text-sm text-white">Roo Code</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Prerequisites</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Configuration</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Troubleshooting</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
