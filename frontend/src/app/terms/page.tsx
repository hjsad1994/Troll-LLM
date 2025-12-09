'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

export default function TermsPage() {
  const { t } = useLanguage()
  const terms = t.legal?.terms || defaultTerms

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
              {terms.backToHome}
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--theme-text)] mb-4">
              {terms.title}
            </h1>
            <p className="text-[var(--theme-text-subtle)]">
              {terms.lastUpdated}: December 10, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <p className="text-[var(--theme-text-muted)] leading-relaxed">
                {terms.intro}
              </p>
            </section>

            {/* Service Description */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.service.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {terms.service.description}
              </p>
            </section>

            {/* Account Terms */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.account.title}
              </h2>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {terms.account.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Acceptable Use */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.acceptableUse.title}
              </h2>
              <p className="text-[var(--theme-text-muted)] mb-4">
                {terms.acceptableUse.description}
              </p>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {terms.acceptableUse.prohibited.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Payment Terms */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.payment.title}
              </h2>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {terms.payment.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* API Usage */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.apiUsage.title}
              </h2>
              <ul className="space-y-2 text-[var(--theme-text-muted)]">
                {terms.apiUsage.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.liability.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {terms.liability.description}
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.termination.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {terms.termination.description}
              </p>
            </section>

            {/* Changes */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.changes.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {terms.changes.description}
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--theme-text)] mb-4">
                {terms.contact.title}
              </h2>
              <p className="text-[var(--theme-text-muted)]">
                {terms.contact.description}{' '}
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
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-[var(--theme-border)]">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors">
                {terms.seeAlso.privacy}
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

const defaultTerms = {
  title: 'Terms of Service',
  lastUpdated: 'Last updated',
  backToHome: 'Back to home',
  intro: 'Welcome to TrollLLM. By accessing or using our API proxy service, you agree to be bound by these Terms of Service. Please read them carefully before using our service.',
  service: {
    title: 'Service Description',
    description: 'TrollLLM provides an API proxy service that allows you to access AI models from various providers (including Anthropic and OpenAI) through a unified API endpoint. We act as an intermediary between you and the upstream AI providers.'
  },
  account: {
    title: 'Account Terms',
    items: [
      'You must provide accurate information when creating an account',
      'You are responsible for maintaining the security of your API key',
      'You must not share your API key with unauthorized parties',
      'You are responsible for all activity that occurs under your account',
      'You must be at least 18 years old to use this service'
    ]
  },
  acceptableUse: {
    title: 'Acceptable Use Policy',
    description: 'You agree not to use TrollLLM for:',
    prohibited: [
      'Any illegal or unauthorized purpose',
      'Generating content that violates the terms of upstream AI providers',
      'Attempting to circumvent rate limits or abuse the service',
      'Reselling or redistributing API access without authorization',
      'Automated scraping or data harvesting',
      'Harassment, spam, or malicious activities'
    ]
  },
  payment: {
    title: 'Payment Terms',
    items: [
      'Credits are purchased in advance and deducted based on API usage',
      'All payments are non-refundable unless required by law',
      'Credits expire according to the plan terms (typically 7 days)',
      'Prices are subject to change with notice',
      'You are responsible for any applicable taxes'
    ]
  },
  apiUsage: {
    title: 'API Usage',
    items: [
      'API access is subject to rate limits based on your subscription tier',
      'We reserve the right to throttle or suspend access for abuse',
      'Uptime is not guaranteed; we provide the service "as is"',
      'API responses depend on upstream providers and may vary'
    ]
  },
  liability: {
    title: 'Limitation of Liability',
    description: 'TrollLLM is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid in the last 30 days.'
  },
  termination: {
    title: 'Termination',
    description: 'We may suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion. You may close your account at any time by contacting us. Upon termination, your remaining credits will be forfeited.'
  },
  changes: {
    title: 'Changes to Terms',
    description: 'We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes via email or website notice.'
  },
  contact: {
    title: 'Contact',
    description: 'For questions about these Terms of Service, please contact us via'
  },
  seeAlso: {
    privacy: 'Privacy Policy'
  }
}
