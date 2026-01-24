'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'
import { ThemeToggle } from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'

interface NavItem {
  href: string
  labelKey: string
  icon: React.ReactNode
  external?: boolean
}

const adminNavItems: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    href: '/admin',
    labelKey: 'admin',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    href: '/users',
    labelKey: 'users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    href: '/users-new',
    labelKey: 'usersNew',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },

  {
    href: '/ohmygpt-keys',
    labelKey: 'ohmygptKeys',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  },

  {
    href: '/openhands-keys',
    labelKey: 'openhandsKeys',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  },

  {
    href: '/openhands-backup-keys',
    labelKey: 'openhandsBackupKeys',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  },
  {
    href: '/ohmygpt-backup-keys',
    labelKey: 'ohmygptBackupKeys',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  },
  {
    href: '/proxies',
    labelKey: 'proxies',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  },
  {
    href: '/admin/bindings',
    labelKey: 'keyBindings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  {
    href: '/admin/ohmygpt-bindings',
    labelKey: 'ohmygptBindings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  {
    href: '/dashboard-models',
    labelKey: 'models',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    href: '/admin/billing',
    labelKey: 'billing',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
]

const userNavItems: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    href: '/payments',
    labelKey: 'payments',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  // TEMPORARILY DISABLED: Friend Key navigation
  // {
  //   href: '/friend-key',
  //   labelKey: 'friendKey',
  //   icon: (
  //     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  //     </svg>
  //   )
  // },
  {
    href: '/dashboard-models',
    labelKey: 'models',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
]

// Sidebar Content Component (shared between desktop and mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const { t } = useLanguage()
  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? adminNavItems : userNavItems

  const handleLogout = () => {
    if (onNavigate) onNavigate()
    logout()
  }

  return (
    <>
      {/* Header Section */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-[var(--theme-border)]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-4 sm:mb-5 group" onClick={onNavigate}>
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6 group-hover:rotate-12 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                <path d="M12 3c2.5 0 5 4 5 9" />
                <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span></span>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider">Dashboard</p>
          </div>
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[var(--theme-bg)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{user?.username || 'User'}</p>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
                Administrator
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-xs">Member</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-600 mb-2 px-3 font-semibold">{t.sidebar.navigation}</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            if (item.external) {
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm font-medium"
                  >
                    <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                      {item.icon}
                    </span>
                    {t.sidebar[item.labelKey as keyof typeof t.sidebar]}
                    <svg className="w-3 h-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white'
                      : 'bg-slate-100 dark:bg-white/5'
                  }`}>
                    {item.icon}
                  </span>
                  {t.sidebar[item.labelKey as keyof typeof t.sidebar]}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer Section */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-[var(--theme-border)] bg-white dark:bg-[var(--theme-bg)]">
        {/* Settings */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-600 font-semibold">{t.sidebar.settings}</span>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t.nav.signOut}
        </button>
      </div>
    </>
  )
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[var(--theme-bg)] border-b border-slate-200 dark:border-[var(--theme-border)] px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                <path d="M12 3c2.5 0 5 4 5 9" />
                <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Troll<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">LLM</span></span>
        </Link>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white dark:bg-[var(--theme-bg)] border-r border-slate-200 dark:border-[var(--theme-border)] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors z-10"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-64 bg-white dark:bg-[var(--theme-bg)] flex-col border-r border-slate-200 dark:border-[var(--theme-border)] h-screen sticky top-0 shadow-sm dark:shadow-none">
        <SidebarContent />
      </nav>
    </>
  )
}
