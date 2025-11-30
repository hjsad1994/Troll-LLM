'use client'

import { useContext } from 'react'
import { ThemeContext } from './ThemeProvider'

// Re-export useTheme from ThemeProvider for other components
export { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const context = useContext(ThemeContext)

  // Safe fallback when context is not available
  const theme = context?.theme ?? 'dark'
  const toggleTheme = context?.toggleTheme ?? null

  const handleClick = () => {
    if (toggleTheme) {
      toggleTheme()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all group"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon - shown in dark mode */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === 'dark'
            ? 'text-slate-400 rotate-0 scale-100'
            : 'text-amber-500 rotate-90 scale-0 absolute inset-2'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>

      {/* Moon icon - shown in light mode */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === 'light'
            ? 'text-slate-700 rotate-0 scale-100'
            : 'text-slate-400 -rotate-90 scale-0 absolute inset-2'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
    </button>
  )
}
