'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/login')
  }, [router])
  
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-gray-400">Redirecting to login...</div>
    </div>
  )
}
