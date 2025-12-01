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

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden mb-6">
      {title && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <span className="text-gray-500 dark:text-slate-500 text-xs font-medium">{title}</span>
          <span className="text-gray-400 dark:text-slate-600 text-xs">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-gray-900 dark:bg-[#0a0a0a] overflow-x-auto">
          <code className="text-sm text-gray-200 dark:text-slate-300 font-mono">{code}</code>
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

// ===== STEP COMPONENT =====
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12 pb-8 border-l border-gray-200 dark:border-white/10 last:border-0 last:pb-0">
      <div className="absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 flex items-center justify-center text-gray-900 dark:text-white text-sm font-medium">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="text-gray-600 dark:text-slate-400">{children}</div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function RooCodePage() {
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
      { title: t.docs.sidebar.rooCode, href: '/docs/integrations/roo-code', active: true },
      { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code' },
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
                              ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
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
              <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white transition-colors">Integrations</Link>
              <span>/</span>
              <span className="text-gray-700 dark:text-slate-400">Roo Code</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
                R
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t.docs.integrations.rooCode.title}</h1>
                <p className="text-gray-500 dark:text-slate-500">{t.docs.integrations.rooCode.subtitle}</p>
              </div>
            </div>

            <p className="text-lg text-gray-600 dark:text-slate-400 mb-8">
              {t.docs.integrations.rooCode.description}
            </p>

            <Tip>
              {t.docs.integrations.rooCode.tip}
            </Tip>

            {/* Prerequisites */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.rooCode.prerequisites}</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-slate-400 space-y-2 mb-8">
              <li>{t.docs.integrations.rooCode.prereq1}</li>
              <li>{t.docs.integrations.rooCode.prereq2}</li>
              <li>{t.docs.integrations.rooCode.prereq3} (<Link href="/register" className="text-sky-600 dark:text-sky-400 hover:underline">{t.docs.integrations.kiloCode.getOneHere}</Link>)</li>
            </ul>

            {/* Configuration Steps */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-10 mb-6">{t.docs.integrations.rooCode.configuration}</h2>

            <div className="mt-6">
              <Step number={1} title={t.docs.integrations.rooCode.step1Title}>
                <p className="mb-4">
                  {t.docs.integrations.rooCode.step1Desc} (<code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-sm">Cmd/Ctrl + Shift + P</code>) {t.docs.integrations.rooCode.step1Search}
                </p>
              </Step>

              <Step number={2} title={t.docs.integrations.rooCode.step2Title}>
                <p className="mb-4">
                  {t.docs.integrations.rooCode.step2Desc}
                </p>
                <CodeBlock
                  title="Roo Code Settings"
                  language="json"
                  code={`{
  "rooCode.apiProvider": "openai-compatible",
  "rooCode.openaiCompatible.baseUrl": "https://chat.trollllm.xyz/v1",
  "rooCode.openaiCompatible.apiKey": "your-trollllm-api-key",
  "rooCode.openaiCompatible.model": "claude-sonnet-4-5-20250929"
}`}
                />
              </Step>

              <Step number={3} title={t.docs.integrations.rooCode.step3Title}>
                <p className="mb-4">
                  {t.docs.integrations.rooCode.step3Desc}
                </p>
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                    <code className="text-emerald-600 dark:text-emerald-400">claude-opus-4-5</code>
                    <span className="text-gray-500 dark:text-slate-500 ml-2">— {t.docs.integrations.rooCode.modelOpusDesc}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                    <code className="text-sky-600 dark:text-sky-400">claude-sonnet-4-5</code>
                    <span className="text-gray-500 dark:text-slate-500 ml-2">— {t.docs.integrations.rooCode.modelSonnetDesc}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                    <code className="text-amber-600 dark:text-amber-400">claude-haiku-4-5</code>
                    <span className="text-gray-500 dark:text-slate-500 ml-2">— {t.docs.integrations.rooCode.modelHaikuDesc}</span>
                  </div>
                </div>
              </Step>

              <Step number={4} title={t.docs.integrations.rooCode.step4Title}>
                <p className="mb-4">
                  {t.docs.integrations.rooCode.step4Desc}
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-slate-400 space-y-1">
                  <li>{t.docs.integrations.rooCode.feature1}</li>
                  <li>{t.docs.integrations.rooCode.feature2}</li>
                  <li>{t.docs.integrations.rooCode.feature3}</li>
                </ul>
              </Step>
            </div>

            {/* Troubleshooting */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">{t.docs.integrations.rooCode.troubleshooting}</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docs.integrations.rooCode.noCompletions}</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.integrations.rooCode.noCompletionsDesc} <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-slate-300">/v1</code> {t.docs.integrations.rooCode.andKeyCorrect}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docs.integrations.rooCode.slowResponses}</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm">{t.docs.integrations.rooCode.slowResponsesDesc} <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-slate-300">claude-haiku-4-5</code> {t.docs.integrations.rooCode.forFaster}</p>
              </div>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/integrations/kilo-code" className="group flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Kilo Code</span>
              </Link>
              <Link href="/docs/integrations/claude-code" className="group flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>Claude Code CLI</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-gray-200 dark:border-white/5 p-6">
          <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">On this page</h3>
          <nav className="space-y-2">
            <a href="#" className="block text-sm text-gray-900 dark:text-white">Roo Code</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Prerequisites</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Configuration</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">Troubleshooting</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
