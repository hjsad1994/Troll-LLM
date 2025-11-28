'use client'

import { ReactNode } from 'react'
import AdminGuard from '@/components/AdminGuard'

export default function KeysLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>
}
