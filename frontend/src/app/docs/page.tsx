'use client'

import Link from 'next/link'
import { useState } from 'react'

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
      className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-white/20 transition-all mb-4">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-1 group-hover:text-white/90">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
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

// ===== MODEL BADGE =====
function ModelBadge({ name, isNew }: { name: string; isNew?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
      <span className="text-white text-sm font-medium">{name}</span>
      {isNew && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">New</span>}
    </span>
  )
}

// ===== MAIN PAGE =====
export default function DocsPage() {
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
              <span className="text-slate-400">Introduction</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-4">Introduction to TrollLLM</h1>
            <p className="text-lg text-slate-400 mb-8">
              TrollLLM is a unified API gateway that provides access to Claude AI models through an OpenAI-compatible interface.
              Use your favorite AI coding tools with the power of Claude.
            </p>

            {/* Model highlight */}
            <Tip>
              <strong className="text-emerald-400">New!</strong> We now support the latest Claude 4.5 models including
              <span className="text-white mx-1">Opus 4.5</span>,
              <span className="text-white mx-1">Sonnet 4.5</span>, and
              <span className="text-white mx-1">Haiku 4.5</span> with 200K context window.
            </Tip>

            {/* Available Models */}
            <div className="flex flex-wrap gap-3 mb-8">
              <ModelBadge name="claude-opus-4-5" isNew />
              <ModelBadge name="claude-sonnet-4-5" isNew />
              <ModelBadge name="claude-haiku-4-5" isNew />
            </div>

            <Note>
              TrollLLM is fully compatible with the OpenAI SDK format. Just change the base URL and you&apos;re ready to go.
            </Note>

            {/* Divider */}
            <hr className="border-white/5 my-10" />

            {/* Get Started */}
            <h2 className="text-2xl font-semibold text-white mb-6">Get Started</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              <Card
                title="Quickstart"
                description="Get up and running with TrollLLM in under 5 minutes."
                href="/docs/quickstart"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <Card
                title="Authentication"
                description="Learn how to authenticate your API requests."
                href="/docs/authentication"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
              <Card
                title="API Reference"
                description="Explore the full API documentation."
                href="/docs/api/chat"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
              />
            </div>

            {/* Quick Example */}
            <h2 className="text-2xl font-semibold text-white mb-6">Quick Example</h2>
            <p className="text-slate-400 mb-4">
              Connect to TrollLLM using the OpenAI SDK with just a few lines of code:
            </p>
            <CodeBlock
              title="example.py"
              language="python"
              code={`from openai import OpenAI

client = OpenAI(
    base_url="https://api.trollllm.io/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`}
            />

            {/* Divider */}
            <hr className="border-white/5 my-10" />

            {/* Integrations */}
            <h2 className="text-2xl font-semibold text-white mb-4">Integrations</h2>
            <p className="text-slate-400 mb-6">
              TrollLLM works with your favorite AI coding tools. Configure them to use Claude models through our API.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <Card
                title="Kilo Code"
                description="Configure Kilo Code to use Claude models for AI-assisted coding."
                href="/docs/integrations/kilo-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title="Roo Code"
                description="Use Roo Code with Claude for intelligent code completion."
                href="/docs/integrations/roo-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title="Claude Code CLI"
                description="Connect Claude Code command line tool to TrollLLM."
                href="/docs/integrations/claude-code"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title="Droid"
                description="Configure Droid AI assistant to use Claude models."
                href="/docs/integrations/droid"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Card
                title="Cursor"
                description="Set up Cursor IDE to work with Claude through TrollLLM."
                href="/docs/integrations/cursor"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                }
              />
              <Card
                title="Continue"
                description="Integrate Continue extension with Claude models."
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
            <hr className="border-white/5 my-10" />

            {/* Support */}
            <h2 className="text-2xl font-semibold text-white mb-6">Support</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card
                title="API Status"
                description="Check the current status of TrollLLM services."
                href="/status"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <Card
                title="Contact Support"
                description="Get help from our support team."
                href="mailto:support@trollllm.io"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
              <div></div>
              <Link href="/docs/quickstart" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span>Quickstart</span>
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
            <a href="#" className="block text-sm text-white">Introduction</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Get Started</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Quick Example</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Integrations</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Support</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
