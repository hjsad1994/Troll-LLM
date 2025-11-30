import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/components/AuthProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'TrollLLM - Premium Claude API',
  description: 'Premium access to Claude models. Access Opus, Sonnet, and Haiku through a single API.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-slate-200 antialiased">
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
