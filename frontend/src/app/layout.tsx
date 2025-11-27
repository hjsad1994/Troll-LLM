import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/components/AuthProvider'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'F-Proxy Admin',
  description: 'Admin panel for F-Proxy API Gateway',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
