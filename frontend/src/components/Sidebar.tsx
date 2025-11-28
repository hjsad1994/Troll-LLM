'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/keys', label: 'User Keys', icon: '🔑' },
  { href: '/factory-keys', label: 'Factory Keys', icon: '🏭' },
  { href: '/proxies', label: 'Proxies', icon: '🌐' },
  { href: '/status', label: 'Status Page', icon: '📡', external: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  
  return (
    <nav className="w-64 bg-dark-card p-5 flex flex-col border-r border-dark-border min-h-screen">
      <div className="text-xl font-bold text-sky-400 mb-8 py-2">
        🔧 F-Proxy Admin
      </div>
      
      <ul className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          if (item.external) {
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-all"
                >
                  {item.icon} {item.label}
                </a>
              </li>
            )
          }
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
      
      <div className="pt-5 border-t border-dark-border flex justify-between items-center">
        <span className="text-slate-400">admin</span>
        <button
          onClick={logout}
          className="px-3 py-1.5 border border-slate-600 text-slate-500 rounded-md hover:border-red-400 hover:text-red-400 transition-all"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
