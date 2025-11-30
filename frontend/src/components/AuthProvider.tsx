'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated, login as apiLogin, logout as apiLogout } from '@/lib/api'

interface User {
  username: string
  role: string
}

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_PATHS = ['/', '/login', '/register', '/models', '/docs']
const PUBLIC_PREFIXES = ['/docs/']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  function checkAuth() {
    const authenticated = isAuthenticated()
    setIsLoggedIn(authenticated)
    
    if (authenticated) {
      const token = localStorage.getItem('adminToken')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({ username: payload.username, role: payload.role })
        } catch {
          setUser(null)
        }
      }
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    checkAuth()
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading && !isLoggedIn && !isPublicPath(pathname)) {
      router.push('/login')
    }
  }, [loading, isLoggedIn, pathname, router])
  
  async function login(username: string, password: string) {
    const data = await apiLogin(username, password)
    setUser({ username: data.username, role: data.role })
    setIsLoggedIn(true)
  }
  
  function logout() {
    apiLogout()
    setUser(null)
    setIsLoggedIn(false)
    router.push('/login')
  }
  
  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
