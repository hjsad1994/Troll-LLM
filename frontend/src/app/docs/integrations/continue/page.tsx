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
export default function ContinuePage() {
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
      { title: t.docs.sidebar.droid, href: '/docs/integrations/droid' },
      { title: t.docs.sidebar.cursor, href: '/docs/integrations/cursor' },
      { title: t.docs.sidebar.continue, href: '/docs/integrations/continue', active: true },
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
            <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white">Integrations</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 dark:text-slate-400">Continue</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Continue</h1>
          <p className="text-gray-500 dark:text-slate-500 text-lg mb-2">VS Code & JetBrains Extension</p>
          <p className="text-gray-600 dark:text-slate-400 mb-8">
            Configure Continue to use Claude models through TrollLLM for AI-assisted coding in VS Code and JetBrains IDEs.
          </p>

          {/* Tip Box */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-8">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Tip:</strong> Continue is an open-source AI code assistant that works with VS Code and JetBrains IDEs. It supports custom LLM providers like TrollLLM out of the box.
            </p>
          </div>

          {/* Prerequisites */}
          <h2 id="prerequisites" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-slate-400 mb-6">
            <li>VS Code or JetBrains IDE installed</li>
            <li>Continue extension installed from marketplace</li>
            <li>A TrollLLM API key — <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">get one here</Link></li>
          </ul>

          {/* Step 1: Install */}
          <h2 id="install" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">1. Install Continue</h2>

          <Tabs tabs={['VS Code', 'JetBrains']}>
            <div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
                Install from the VS Code Marketplace:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-slate-400 mb-4">
                <li>Open VS Code</li>
                <li>Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)</li>
                <li>Search for &quot;Continue&quot;</li>
                <li>Click Install</li>
              </ol>
              <p className="text-gray-500 dark:text-slate-500 text-sm">Or install via command line:</p>
              <Code>{`code --install-extension Continue.continue`}</Code>
            </div>

            <div>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
                Install from the JetBrains Marketplace:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-slate-400 mb-4">
                <li>Open your JetBrains IDE (IntelliJ, PyCharm, WebStorm, etc.)</li>
                <li>Go to Settings → Plugins</li>
                <li>Search for &quot;Continue&quot;</li>
                <li>Click Install and restart the IDE</li>
              </ol>
            </div>
          </Tabs>

          {/* Step 2: Configure */}
          <h2 id="configure" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">2. Configure Continue</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
            Open Continue settings and edit the <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">config.json</code> file:
          </p>

          <Tabs tabs={['VS Code', 'JetBrains']}>
            <div>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-slate-400 mb-4">
                <li>Click the Continue icon in the sidebar</li>
                <li>Click the gear icon (⚙️) at the bottom</li>
                <li>Or press <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Ctrl+Shift+P</code> and search &quot;Continue: Open config.json&quot;</li>
              </ol>
            </div>

            <div>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-slate-400 mb-4">
                <li>Click the Continue icon in the tool window</li>
                <li>Click the settings icon</li>
                <li>Select &quot;Open config.json&quot;</li>
              </ol>
            </div>
          </Tabs>

          <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
            Add TrollLLM as a custom model provider in your <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">config.json</code>:
          </p>

          <Code title="~/.continue/config.json">{`{
  "models": [
    {
      "title": "Claude Sonnet 4.5 (TrollLLM)",
      "provider": "openai",
      "model": "claude-sonnet-4-5-20250929",
      "apiBase": "${API_BASE_URL}/v1",
      "apiKey": "your-trollllm-api-key"
    },
    {
      "title": "Claude Opus 4.5 (TrollLLM)",
      "provider": "openai",
      "model": "claude-opus-4-5-20251101",
      "apiBase": "${API_BASE_URL}/v1",
      "apiKey": "your-trollllm-api-key"
    },
    {
      "title": "Claude Haiku 4.5 (TrollLLM)",
      "provider": "openai",
      "model": "claude-haiku-4-5-20251001",
      "apiBase": "${API_BASE_URL}/v1",
      "apiKey": "your-trollllm-api-key"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude Haiku (Autocomplete)",
    "provider": "openai",
    "model": "claude-haiku-4-5-20251001",
    "apiBase": "${API_BASE_URL}/v1",
    "apiKey": "your-trollllm-api-key"
  }
}`}</Code>

          {/* Note Box */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 mb-6">
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              <strong>Note:</strong> Replace <code className="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">your-trollllm-api-key</code> with your actual API key from the <Link href="/dashboard" className="underline">dashboard</Link>.
            </p>
          </div>

          {/* Step 3: Models */}
          <h2 id="models" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">3. Available Models</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">Choose the model based on your use case:</p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 text-gray-500 dark:text-slate-500 font-medium">Model ID</th>
                  <th className="text-left py-2 text-gray-500 dark:text-slate-500 font-medium">Best For</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-slate-400">
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-3 font-mono text-xs">claude-opus-4-5-20251101</td>
                  <td className="py-3">Complex reasoning, architecture decisions, difficult debugging</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-3 font-mono text-xs">claude-sonnet-4-5-20250929</td>
                  <td className="py-3">General coding, refactoring, code reviews (recommended)</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-3 font-mono text-xs">claude-haiku-4-5-20251001</td>
                  <td className="py-3">Fast completions, autocomplete, simple edits</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Step 4: Features */}
          <h2 id="features" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">4. Using Continue Features</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-2">Chat with AI</h3>
              <p className="text-gray-500 dark:text-slate-500 text-sm mb-2">Open the Continue panel and start chatting:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400 text-sm">
                <li>VS Code: <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Ctrl+L</code> / <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Cmd+L</code></li>
                <li>JetBrains: <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Ctrl+J</code> / <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Cmd+J</code></li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-2">Inline Edit</h3>
              <p className="text-gray-500 dark:text-slate-500 text-sm mb-2">Select code and edit it with AI:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400 text-sm">
                <li>Select the code you want to modify</li>
                <li>Press <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Ctrl+I</code> / <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Cmd+I</code></li>
                <li>Describe what you want to change</li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-2">Tab Autocomplete</h3>
              <p className="text-gray-500 dark:text-slate-500 text-sm mb-2">Get AI-powered code completions as you type:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400 text-sm">
                <li>Start typing and wait for suggestions</li>
                <li>Press <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Tab</code> to accept</li>
                <li>Use Haiku model for faster completions</li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-2">Slash Commands</h3>
              <p className="text-gray-500 dark:text-slate-500 text-sm mb-2">Use built-in commands in the chat:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400 text-sm">
                <li><code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">/edit</code> - Edit selected code</li>
                <li><code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">/comment</code> - Add comments to code</li>
                <li><code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">/test</code> - Generate tests</li>
                <li><code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">/explain</code> - Explain selected code</li>
              </ul>
            </div>
          </div>

          {/* Troubleshooting */}
          <h2 id="troubleshooting" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">Troubleshooting</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">Connection error</h3>
              <p className="text-gray-500 dark:text-slate-500">
                Verify the <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">apiBase</code> is set to <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{API_BASE_URL}/v1</code> (with /v1 suffix).
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">Authentication failed</h3>
              <p className="text-gray-500 dark:text-slate-500">
                Check your API key is correct and has available credits. Regenerate from the dashboard if needed.
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">Model not found</h3>
              <p className="text-gray-500 dark:text-slate-500">
                Use exact model IDs: <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">claude-sonnet-4-5-20250929</code>, <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">claude-opus-4-5-20251101</code>, <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">claude-haiku-4-5-20251001</code>
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">Slow autocomplete</h3>
              <p className="text-gray-500 dark:text-slate-500">
                Use <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">claude-haiku-4-5-20251001</code> for <code className="text-gray-800 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">tabAutocompleteModel</code> for faster inline completions.
              </p>
            </div>
          </div>

          {/* Verify */}
          <h2 id="verify" className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">Verify Setup</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
            Test your configuration by opening Continue and sending a simple message:
          </p>
          <Code>{`Hello, can you tell me what model you are?`}</Code>
          <p className="text-gray-500 dark:text-slate-500 text-sm">
            If configured correctly, you should receive a response from Claude via TrollLLM.
          </p>

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-6 border-t border-gray-200 dark:border-white/5 text-sm">
            <Link href="/docs/integrations/droid" className="text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">
              ← Droid
            </Link>
            <Link href="/docs/pricing" className="text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">
              Pricing →
            </Link>
          </div>
        </main>

        {/* TOC */}
        <aside className="hidden xl:block w-48 sticky top-[65px] h-[calc(100vh-65px)] p-6">
          <h4 className="text-gray-500 dark:text-slate-600 text-xs font-medium uppercase mb-3">On this page</h4>
          <nav className="space-y-2 text-sm">
            <a href="#prerequisites" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Prerequisites</a>
            <a href="#install" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">1. Install</a>
            <a href="#configure" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">2. Configure</a>
            <a href="#models" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">3. Models</a>
            <a href="#features" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">4. Features</a>
            <a href="#troubleshooting" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Troubleshooting</a>
            <a href="#verify" className="block text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white">Verify</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
