'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'

interface HeaderProps {
  activeLink?: 'models' | 'features' | 'pricing' | 'faq' | 'docs'
}

export default function Header({ activeLink }: HeaderProps) {
  const [scrollY, setScrollY] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { isLoggedIn, user, logout } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserMenu && !(e.target as Element).closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showUserMenu])

  const navLinks = [
    { key: 'models', label: t.nav.models, href: '/models' },
    { key: 'features', label: t.nav.features, href: '/#features' },
    { key: 'pricing', label: t.nav.pricing, href: '/#pricing' },
    { key: 'faq', label: t.nav.faq, href: '/#faq' },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[var(--theme-bg)] ${
      scrollY > 50 ? 'bg-[var(--theme-bg)]/80 backdrop-blur-xl border-b border-[var(--theme-border)]' : ''
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo Icon */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6 group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                  <path d="M12 3c2.5 0 5 4 5 9" />
                  <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                </svg>
              </div>
            </div>
            {/* Logo Text */}
            <span className="text-xl font-bold text-[var(--theme-text)] tracking-tight">
              Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`text-sm transition-colors ${
                  activeLink === link.key
                    ? 'text-[var(--theme-text)] font-medium'
                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
          {isLoggedIn ? (
            <div className="relative user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center text-[var(--theme-text)] text-xs font-medium">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-[var(--theme-text)] text-sm hidden sm:block">{user?.username}</span>
                <svg className={`w-3.5 h-3.5 text-[var(--theme-text-subtle)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg bg-[var(--theme-card)] border border-[var(--theme-border)] shadow-xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-[var(--theme-border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center text-[var(--theme-text)] text-sm font-medium">
                        {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-[var(--theme-text)] text-sm font-medium">{user?.username}</p>
                        <p className="text-[var(--theme-text-subtle)] text-xs">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="text-sm">{t.nav.dashboard}</span>
                    </Link>

                    <Link
                      href="/docs"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm">{t.nav.documentation}</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-[var(--theme-border)] py-1">
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm">{t.nav.signOut}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors text-sm">
                {t.nav.signIn}
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-lg bg-[var(--theme-text)] text-[var(--theme-bg)] font-medium text-sm hover:opacity-90 transition-colors">
                {t.nav.getApiKey}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
