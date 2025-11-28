'use client'

import { ReactNode } from 'react'
import AdminGuard from '@/components/AdminGuard'

export default function ProxiesLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>
}
