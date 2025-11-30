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
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm"
    >
      <span className={`${language === 'vi' ? 'text-white font-medium' : 'text-slate-500'}`}>VI</span>
      <span className="text-slate-600">/</span>
      <span className={`${language === 'en' ? 'text-white font-medium' : 'text-slate-500'}`}>EN</span>
    </button>
  )
}
