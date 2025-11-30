import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/components/AuthProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
