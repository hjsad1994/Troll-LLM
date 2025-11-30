'use client'

import Link from 'next/link'
import { useState, ReactNode } from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

interface SidebarItem {
  title: string
  href: string
  active?: boolean
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
}

interface DocsLayoutProps {
  children: ReactNode
  title: string
  description: string
  breadcrumb: string
  sidebarNav: SidebarSection[]
  tocItems?: { label: string; href: string; active?: boolean }[]
  prevPage?: { label: string; href: string }
  nextPage?: { label: string; href: string }
}

export default function DocsLayout({
  children,
  title,
  description,
  breadcrumb,
  sidebarNav,
  tocItems,
  prevPage,
  nextPage
}: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header activeLink="docs" />

      <div className="flex pt-[65px]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-white dark:bg-black/95 backdrop-blur-xl lg:bg-transparent border-r border-gray-200 dark:border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-8">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.docs.sidebar.searchDocs}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-500 dark:text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-gray-500 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group block px-3 py-2 rounded-lg text-sm transition-all ${
                            item.active
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
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
              <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
              <span>/</span>
              <span className="text-gray-700 dark:text-slate-400">{breadcrumb}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
            <p className="text-lg text-gray-500 dark:text-slate-400 mb-8">{description}</p>

            {/* Content */}
            {children}

            {/* Footer navigation */}
            {(prevPage || nextPage) && (
              <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
                {prevPage ? (
                  <Link href={prevPage.href} className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>{prevPage.label}</span>
                  </Link>
                ) : <div />}
                {nextPage ? (
                  <Link href={nextPage.href} className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span>{nextPage.label}</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : <div />}
              </div>
            )}
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        {tocItems && tocItems.length > 0 && (
          <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-gray-200 dark:border-white/5 p-6">
            <h3 className="text-gray-500 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">On this page</h3>
            <nav className="space-y-2">
              {tocItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={`block text-sm transition-colors ${
                    item.active
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white pl-3'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  )
}

// ===== SHARED COMPONENTS =====

export function Note({ children }: { children: ReactNode }) {
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

export function Warning({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          {title && <h4 className="text-amber-700 dark:text-amber-400 font-medium text-sm mb-1">{title}</h4>}
          <div className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function Tip({ children }: { children: ReactNode }) {
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

export function CodeBlock({
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
    <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden mb-6 shadow-sm">
      {title && (
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">{title}</span>
          <span className="text-gray-400 dark:text-slate-600 text-xs font-mono uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-gray-900 dark:bg-[#0a0a0a] overflow-x-auto">
          <code className="text-sm text-gray-200 dark:text-slate-300 font-mono leading-relaxed">
            {code}
          </code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 rounded bg-gray-800 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 border border-gray-700 dark:border-white/10 text-gray-400 dark:text-slate-500 hover:text-white transition-all"
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

export function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="relative pl-12 pb-8 border-l border-gray-200 dark:border-white/10 last:border-0 last:pb-0" id={`step-${number}`}>
      <div className="absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-700 dark:text-white text-sm font-medium">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="text-gray-600 dark:text-slate-400">{children}</div>
    </div>
  )
}

export function Card({
  title,
  description,
  href,
  icon
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all shadow-sm"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-300 dark:group-hover:border-white/20 transition-all mb-4">
        {icon}
      </div>
      <h3 className="text-gray-900 dark:text-white font-medium mb-1 group-hover:text-gray-900 dark:group-hover:text-white/90">{title}</h3>
      <p className="text-gray-500 dark:text-slate-500 text-sm leading-relaxed">{description}</p>
    </Link>
  )
}

export function InfoCard({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 ${className}`}>
      {children}
    </div>
  )
}

export function Table({
  headers,
  children
}: {
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden mb-8 overflow-x-auto shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
            {headers.map((header, index) => (
              <th key={index} className="px-6 py-4 text-left text-sm font-medium text-gray-600 dark:text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 mb-8">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-gray-700 dark:text-slate-300 text-sm">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{children}</h2>
  )
}

export function SectionDesc({ children }: { children: ReactNode }) {
  return (
    <p className="text-gray-500 dark:text-slate-400 mb-6">{children}</p>
  )
}

export function Divider() {
  return <hr className="border-gray-200 dark:border-white/5 my-10" />
}
