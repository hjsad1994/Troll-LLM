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
      { title: 'Rate Limits', href: '/docs/rate-limits', active: true },
      { title: 'Changelog', href: '/docs/changelog' },
    ]
  },
]

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

// ===== WARNING COMPONENT =====
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== CODE BLOCK COMPONENT =====
function CodeBlock({ code, language = 'json', title }: { code: string; language?: string; title?: string }) {
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

// ===== MAIN PAGE =====
export default function RateLimitsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const rateLimits = [
    {
      tier: 'Dev',
      rpm: '300',
      creditsPerMonth: '225',
      description: 'Perfect for side projects and testing',
    },
    {
      tier: 'Pro',
      rpm: '1,000',
      creditsPerMonth: '500',
      description: 'Best for teams and production apps',
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6 group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                    <path d="M12 3c2.5 0 5 4 5 9" />
                    <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
              </span>
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
              <span className="text-slate-400">Rate Limits</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-4">Rate Limits</h1>
            <p className="text-lg text-slate-400 mb-8">
              TrollLLM enforces rate limits to ensure fair usage and maintain service quality for all users.
            </p>

            <Note>
              Rate limits are applied per API key. If you need higher limits, consider upgrading to the Pro tier or contact us for custom plans.
            </Note>

            {/* Rate Limits Table */}
            <h2 className="text-2xl font-semibold text-white mb-6">Limits by Tier</h2>
            <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Tier</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Requests/Minute</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Credits/Month</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.map((limit, index) => (
                    <tr key={limit.tier} className={index !== rateLimits.length - 1 ? 'border-b border-white/5' : ''}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            limit.tier === 'Pro' 
                              ? 'bg-indigo-500/20 text-indigo-400' 
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {limit.tier}
                          </span>
                          <span className="text-slate-500 text-sm">{limit.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-mono">{limit.rpm}</td>
                      <td className="px-6 py-4 text-white font-mono">{limit.creditsPerMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rate Limit Headers */}
            <h2 className="text-2xl font-semibold text-white mb-4">Rate Limit Headers</h2>
            <p className="text-slate-400 mb-6">
              Every API response includes headers to help you track your rate limit status:
            </p>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <code className="text-emerald-400 font-mono text-sm">X-RateLimit-Limit</code>
                <p className="text-slate-400 text-sm mt-2">Maximum number of requests allowed per minute</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <code className="text-emerald-400 font-mono text-sm">X-RateLimit-Remaining</code>
                <p className="text-slate-400 text-sm mt-2">Number of requests remaining in the current window</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <code className="text-emerald-400 font-mono text-sm">X-RateLimit-Reset</code>
                <p className="text-slate-400 text-sm mt-2">Unix timestamp when the rate limit window resets</p>
              </div>
            </div>

            {/* 429 Response */}
            <h2 className="text-2xl font-semibold text-white mb-4">Handling Rate Limits</h2>
            <p className="text-slate-400 mb-6">
              When you exceed the rate limit, you&apos;ll receive a <code className="px-1.5 py-0.5 rounded bg-white/10 text-amber-400 font-mono text-sm">429 Too Many Requests</code> response:
            </p>

            <CodeBlock
              title="429 Response"
              language="json"
              code={`{
  "error": {
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}`}
            />

            <Warning>
              Repeatedly hitting rate limits may result in temporary API key suspension. Implement exponential backoff in your applications.
            </Warning>

            {/* Best Practices */}
            <h2 className="text-2xl font-semibold text-white mb-4">Best Practices</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">Implement exponential backoff when receiving 429 errors</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">Monitor rate limit headers to avoid hitting limits</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">Use request queuing for batch operations</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">Cache responses when possible to reduce API calls</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">Upgrade to Pro tier for higher limits in production</span>
              </li>
            </ul>

            {/* Retry Example */}
            <h2 className="text-2xl font-semibold text-white mb-4">Retry Example</h2>
            <p className="text-slate-400 mb-6">
              Here&apos;s an example of implementing exponential backoff in Python:
            </p>

            <CodeBlock
              title="retry_example.py"
              language="python"
              code={`import time
import random
from openai import OpenAI

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-api-key"
)

def make_request_with_retry(max_retries=5):
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="claude-sonnet-4-5",
                messages=[{"role": "user", "content": "Hello!"}]
            )
            return response
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                wait_time = (2 ** attempt) + random.random()
                print(f"Rate limited. Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
            else:
                raise e`}
            />

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
              <Link href="/docs/pricing" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Pricing</span>
              </Link>
              <Link href="/docs/changelog" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span>Changelog</span>
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
            <a href="#" className="block text-sm text-white">Rate Limits</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">Limits by Tier</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">Rate Limit Headers</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">Handling Rate Limits</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">Best Practices</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">Retry Example</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
