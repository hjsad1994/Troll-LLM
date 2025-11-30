'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

// ===== SIDEBAR NAVIGATION =====
const getSidebarNav = (t: any) => [
  {
    title: t.docs.sidebar.gettingStarted,
    items: [
      { title: t.docs.sidebar.introduction, href: '/docs' },
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
      { title: t.docs.sidebar.pricing, href: '/docs/pricing', active: true },
      { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
      { title: t.docs.sidebar.changelog, href: '/docs/changelog' },
    ]
  },
]

// ===== NOTE COMPONENT =====
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
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

// ===== MAIN PAGE =====
export default function PricingDocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()
  const sidebarNav = getSidebarNav(t)

  const models = [
    {
      name: 'Claude Opus 4.5',
      id: 'claude-opus-4-5-20251101',
      context: '200K',
      inputPrice: '$5.00',
      outputPrice: '$25.00',
      multiplier: '1.1x',
    },
    {
      name: 'Claude Sonnet 4.5',
      id: 'claude-sonnet-4-5-20250929',
      context: '200K',
      inputPrice: '$3.00',
      outputPrice: '$15.00',
      multiplier: '1x',
    },
    {
      name: 'Claude Haiku 4.5',
      id: 'claude-haiku-4-5-20251001',
      context: '200K',
      inputPrice: '$1.00',
      outputPrice: '$5.00',
      multiplier: '1x',
    },
    {
      name: 'GPT-5.1',
      id: 'gpt-5.1',
      context: '128K',
      inputPrice: '$1.25',
      outputPrice: '$10.00',
      multiplier: '1x',
    },
    {
      name: 'Gemini 3 Pro Preview',
      id: 'gemini-3-pro-preview',
      context: '1M',
      inputPrice: '$2.00',
      outputPrice: '$12.00',
      multiplier: '1x',
    },
  ]

  const plans = [
    {
      name: 'Dev',
      price: '35K',
      originalPrice: '49K',
      discount: '29%',
      features: [
        '300 requests/minute',
        '225 credits/month',
        'All Claude models',
        'Community support',
      ],
      recommended: false,
    },
    {
      name: 'Pro',
      price: '79K',
      originalPrice: '115K',
      discount: '31%',
      features: [
        '1,000 requests/minute',
        '500 credits/month',
        'All Claude models',
        'Priority support',
      ],
      recommended: true,
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header activeLink="docs" />

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
              {sidebarNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            item.active
                              ? 'bg-indigo-50 dark:bg-white/10 text-indigo-700 dark:text-white'
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
              <span className="text-gray-600 dark:text-slate-400">Pricing</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t.docsPricing.title}</h1>
            <p className="text-lg text-gray-700 dark:text-slate-400 mb-8">
              {t.docsPricing.description}
            </p>

            <Note>
              {t.docsPricing.note}
            </Note>

            {/* Plans */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">{t.docsPricing.subscriptionPlans}</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative p-6 rounded-xl border ${
                    plan.recommended
                      ? 'border-indigo-400 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/5'
                      : 'border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-medium">
                        {t.docsPricing.recommended}
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                      <span className="text-gray-500 dark:text-slate-500">{t.docsPricing.vndMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 dark:text-slate-600 line-through text-sm">{plan.originalPrice}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        -{plan.discount}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-3 h-3 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://discord.gg/Prs3RxwnyQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                      plan.recommended
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    {t.docsPricing.getStarted}
                  </a>
                </div>
              ))}
            </div>

            {/* Model Pricing */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t.docsPricing.modelPricing}</h2>
            <p className="text-gray-700 dark:text-slate-400 mb-6">
              {t.docsPricing.modelPricingDesc}
            </p>

            <div className="rounded-xl border border-gray-300 dark:border-white/10 overflow-hidden mb-8 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-white/[0.02] border-b border-gray-300 dark:border-white/5">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-slate-400">{t.docsPricing.model}</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-slate-400">{t.docsPricing.inputMTok}</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-slate-400">{t.docsPricing.outputMTok}</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-slate-400">{t.docsPricing.multiplier}</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model, index) => (
                    <tr key={model.id} className={index !== models.length - 1 ? 'border-b border-gray-300 dark:border-white/5' : ''}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-gray-900 dark:text-white font-medium">{model.name}</div>
                          <div className="text-gray-500 dark:text-slate-500 text-xs font-mono mt-0.5">{model.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-mono">{model.inputPrice}</td>
                      <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-mono">{model.outputPrice}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-mono">{model.multiplier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Tip>
              <strong>{t.docsPricing.costTip}</strong> {t.docsPricing.costTipDesc}
            </Tip>

            {/* Credits Explanation */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t.docsPricing.billingMultipliers}</h2>
            <p className="text-gray-700 dark:text-slate-400 mb-6">
              {t.docsPricing.billingMultipliersDesc}
            </p>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">Claude Opus 4.5</div>
                  <div className="text-gray-500 dark:text-slate-500 text-sm">{t.docsPricing.mostCapable}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-purple-200 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-mono text-sm">1.1x</span>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">Claude Sonnet 4.5</div>
                  <div className="text-gray-500 dark:text-slate-500 text-sm">{t.docsPricing.balanced}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-mono text-sm">1x</span>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">Claude Haiku 4.5</div>
                  <div className="text-gray-500 dark:text-slate-500 text-sm">{t.docsPricing.fastAffordable}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-sm">1x</span>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">GPT-5.1</div>
                  <div className="text-gray-500 dark:text-slate-500 text-sm">{t.docsPricing.openaiLatest}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-sky-200 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-mono text-sm">1x</span>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">Gemini 3 Pro Preview</div>
                  <div className="text-gray-500 dark:text-slate-500 text-sm">{t.docsPricing.googleLatest}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-sm">1x</span>
              </div>
            </div>

            {/* FAQ */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">{t.docsPricing.pricingFaq}</h2>
            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docsPricing.faq1Q}</h3>
                <p className="text-gray-700 dark:text-slate-400 text-sm">{t.docsPricing.faq1A}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docsPricing.faq2Q}</h3>
                <p className="text-gray-700 dark:text-slate-400 text-sm">{t.docsPricing.faq2A}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docsPricing.faq3Q}</h3>
                <p className="text-gray-700 dark:text-slate-400 text-sm">{t.docsPricing.faq3A}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/5">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">{t.docsPricing.faq4Q}</h3>
                <p className="text-gray-700 dark:text-slate-400 text-sm">{t.docsPricing.faq4A}</p>
              </div>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/integrations/continue" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Continue Integration</span>
              </Link>
              <Link href="/docs/rate-limits" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>Rate Limits</span>
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
            <a href="#" className="block text-sm text-gray-900 dark:text-white">Pricing</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Subscription Plans</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Model Pricing</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Billing Multipliers</a>
            <a href="#" className="block text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors pl-3">Pricing FAQ</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
