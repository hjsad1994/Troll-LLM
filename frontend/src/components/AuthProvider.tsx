'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { isAuthenticated, login as apiLogin, logout as apiLogout } from '@/lib/api'

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    setIsLoggedIn(isAuthenticated())
    setLoading(false)
  }, [])
  
  async function login(username: string, password: string) {
    await apiLogin(username, password)
    setIsLoggedIn(true)
  }
  
  function logout() {
    apiLogout()
    setIsLoggedIn(false)
  }
  
  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
