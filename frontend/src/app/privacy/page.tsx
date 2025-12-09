'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

export default function PrivacyPage() {
  const { t } = useLanguage()
  const privacy = t.legal?.privacy || defaultPrivacy

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]">
      <Header />

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] text-sm mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {privacy.backToHome}
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--theme-text)] mb-4">
              {privacy.title}
            </h1>
            <p className="text-[var(--theme-text-subtle)]">
              {privacy.lastUpdated}: December 10, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <p className="text-[var(--theme-text-muted)] leading-relaxed">
                {privacy.intro}
              </p>
            </section>

            {/* Data Collection */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.dataCollection.title}
              </h2>
              <p className="text-[var(--theme-text-muted)] mb-4">
                {privacy.dataCollection.description}
              </p>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {privacy.dataCollection.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* How We Use Data */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.dataUsage.title}
              </h2>
              <p className="text-[var(--theme-text-muted)] mb-4">
                {privacy.dataUsage.description}
              </p>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {privacy.dataUsage.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.dataSecurity.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {privacy.dataSecurity.description}
              </p>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.dataSharing.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {privacy.dataSharing.description}
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.yourRights.title}
              </h2>
              <p className="text-[var(--theme-text-muted)] mb-4">
                {privacy.yourRights.description}
              </p>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {privacy.yourRights.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.contact.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {privacy.contact.description}{' '}
                <a
                  href="https://discord.gg/Prs3RxwnyQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:text-indigo-400 transition-colors"
                >
                  Discord
                </a>
              </p>
            </section>

            {/* Changes */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {privacy.changes.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {privacy.changes.description}
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-[var(--theme-border)]">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/terms" className="text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors">
                {privacy.seeAlso.terms}
              </Link>
              <span className="text-[var(--theme-text-subtle)]">•</span>
              <a
                href="https://discord.gg/Prs3RxwnyQ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const defaultPrivacy = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated',
  backToHome: 'Back to home',
  intro: 'TrollLLM ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our API proxy service.',
  dataCollection: {
    title: 'Information We Collect',
    description: 'We collect the following types of information:',
    items: [
      'Account information: username and hashed password for authentication',
      'API usage data: request counts, token usage, and timestamps for billing purposes',
      'Payment information: transaction records (payment details are processed by third-party providers)',
      'Technical data: IP addresses and request logs for security and debugging'
    ]
  },
  dataUsage: {
    title: 'How We Use Your Information',
    description: 'We use your information to:',
    items: [
      'Provide and maintain our API proxy service',
      'Process payments and manage your subscription',
      'Monitor usage and enforce rate limits',
      'Improve our services and user experience',
      'Communicate with you about service updates'
    ]
  },
  dataSecurity: {
    title: 'Data Security',
    description: 'We implement industry-standard security measures to protect your data. All API communications are encrypted using TLS. We do not store the content of your API requests - they are proxied directly to upstream AI providers and not logged.'
  },
  dataSharing: {
    title: 'Data Sharing',
    description: 'We do not sell your personal information. We only share data with upstream AI providers (Anthropic, OpenAI) as necessary to fulfill API requests. These providers have their own privacy policies governing the use of data sent through their APIs.'
  },
  yourRights: {
    title: 'Your Rights',
    description: 'You have the right to:',
    items: [
      'Access your personal data',
      'Request deletion of your account and associated data',
      'Export your usage data',
      'Opt out of non-essential communications'
    ]
  },
  contact: {
    title: 'Contact Us',
    description: 'If you have any questions about this Privacy Policy, please contact us via'
  },
  changes: {
    title: 'Changes to This Policy',
    description: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting a notice on our website or sending you an email.'
  },
  seeAlso: {
    terms: 'Terms of Service'
  }
}
