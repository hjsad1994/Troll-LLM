'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface NewModelsAnnouncementProps {
  onDismiss?: () => void
}

export default function NewModelsAnnouncement({ onDismiss }: NewModelsAnnouncementProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage()

  useEffect(() => {
    const dismissed = localStorage.getItem('newModelsAnnouncement_dismissed_v4')
    if (dismissed !== 'true') {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('newModelsAnnouncement_dismissed_v4', 'true')
    onDismiss?.()
  }

  if (!isVisible) return null

  const isVi = language === 'vi'

  return (
    <div className="opacity-0 animate-fade-in-up">
      <div className="flex items-start gap-3 sm:gap-4 border-l-[3px] border-emerald-500 pl-4 sm:pl-5 pr-3 py-3.5 sm:py-4 rounded-r-xl bg-emerald-50/80 dark:bg-emerald-500/[0.07] border-y border-r border-y-emerald-200/60 border-r-emerald-200/60 dark:border-y-emerald-500/10 dark:border-r-emerald-500/10">
        {/* Green ping dot */}
        <div className="mt-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Main headline */}
          <p className="text-base sm:text-lg text-[var(--theme-text)] leading-snug">
            <span className="font-bold text-orange-600 dark:text-orange-400">Claude Opus 4.6</span>
            {isVi ? ' và ' : ' & '}
            <span className="font-bold text-blue-600 dark:text-blue-400">Gemini 3 Flash Preview</span>
            <span className="text-[var(--theme-text-muted)] font-normal">
              {isVi ? ' đã có sẵn' : ' are now available'}
            </span>
          </p>

          {/* Sub line with link */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              NEW
            </span>
            <a
              href="/dashboard-models"
              className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              {isVi ? 'Xem Models' : 'View Models'}
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="mt-1 shrink-0 p-1 rounded-md text-slate-400 dark:text-[var(--theme-text-subtle)] hover:text-slate-600 dark:hover:text-[var(--theme-text-muted)] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
