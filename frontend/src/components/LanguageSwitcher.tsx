'use client'

import { useLanguage } from '@/components/LanguageProvider'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm"
    >
      <span className={`${language === 'vi' ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-text-subtle)]'}`}>VI</span>
      <span className="text-[var(--theme-text-subtle)]">/</span>
      <span className={`${language === 'en' ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-text-subtle)]'}`}>EN</span>
    </button>
  )
}
