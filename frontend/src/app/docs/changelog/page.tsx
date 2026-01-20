'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

// ===== SIDEBAR NAVIGATION =====
const getSidebarNav = (t: any) => [
  {
    title: t.docs.sidebar.gettingStarted,
    items: [
      { title: t.docs.sidebar.introduction, href: '/docs' },
      { title: t.docs.sidebar.quickstart, href: '/docs/quickstart' },
      { title: t.docs.sidebar.authentication, href: '/docs/authentication' },
    ]
  },
  {
    title: t.docs.sidebar.integrations,
    items: [
      { title: t.docs.sidebar.kiloCode, href: '/docs/integrations/kilo-code' },
      { title: t.docs.sidebar.rooCode, href: '/docs/integrations/roo-code' },
      { title: t.docs.sidebar.claudeCode, href: '/docs/integrations/claude-code' },
      { title: t.docs.sidebar.droid, href: '/docs/integrations/droid' },
      { title: t.docs.sidebar.continue, href: '/docs/integrations/continue' },
    ]
  },
  {
    title: t.docs.sidebar.resources,
    items: [
      { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
      { title: t.docs.sidebar.changelog, href: '/docs/changelog', active: true },
    ]
  },
]

// ===== CHANGELOG DATA =====
const getChangelogData = (lang: string) => [
  {
    version: 'v2.5.0',
    date: '2025-12-01',
    type: 'feature',
    title: lang === 'vi' ? 'Hỗ trợ dòng Claude 4.5' : 'Claude 4.5 Series Support',
    description: lang === 'vi' 
      ? 'Thêm hỗ trợ cho dòng mô hình Claude 4.5 mới nhất bao gồm claude-opus-4-5, claude-sonnet-4-5 và claude-haiku-4-5.'
      : 'Added support for the latest Claude 4.5 model series including claude-opus-4-5, claude-sonnet-4-5, and claude-haiku-4-5.',
    changes: lang === 'vi' ? [
      'Mô hình claude-opus-4-5-20251101 mới với khả năng suy luận nâng cao',
      'Mô hình claude-sonnet-4-5-20250929 mới với hiệu suất cân bằng',
      'Mô hình claude-haiku-4-5-20251001 mới cho phản hồi nhanh',
      'Cải thiện hiệu quả token trên tất cả các mô hình Claude',
    ] : [
      'New claude-opus-4-5-20251101 model with enhanced reasoning',
      'New claude-sonnet-4-5-20250929 model for balanced performance',
      'New claude-haiku-4-5-20251001 model for fast responses',
      'Improved token efficiency across all Claude models',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2025-11-25',
    type: 'feature',
    title: lang === 'vi' ? 'GPT-5.1 và Gemini 3 Pro' : 'GPT-5.1 and Gemini 3 Pro',
    description: lang === 'vi'
      ? 'Giới thiệu hỗ trợ cho mô hình OpenAI GPT-5.1 và Google Gemini 3 Pro Preview.'
      : 'Introducing support for OpenAI GPT-5.1 and Google Gemini 3 Pro Preview models.',
    changes: lang === 'vi' ? [
      'Mô hình GPT-5.1 với khả năng tuân theo hướng dẫn được cải thiện',
      'Gemini 3 Pro Preview với khả năng đa phương thức nâng cao',
      'Cập nhật bảng giá cho các gói mô hình mới',
    ] : [
      'GPT-5.1 model with improved instruction following',
      'Gemini 3 Pro Preview with enhanced multimodal capabilities',
      'Updated pricing for new model tiers',
    ],
  },
  {
    version: 'v2.3.2',
    date: '2025-11-20',
    type: 'improvement',
    title: lang === 'vi' ? 'Cải thiện bảng điều khiển' : 'Dashboard Improvements',
    description: lang === 'vi'
      ? 'Nâng cấp bảng điều khiển người dùng với phân tích và quản lý gói tốt hơn.'
      : 'Enhanced user dashboard with better analytics and plan management.',
    changes: lang === 'vi' ? [
      'Thêm theo dõi tổng số token đầu vào/đầu ra vào hồ sơ người dùng',
      'Cải thiện hiển thị thời hạn gói với ngày gia hạn rõ ràng',
      'Hiển thị credits chính xác số dư còn lại',
    ] : [
      'Added total input/output tokens tracking to user profile',
      'Improved plan period display with clear renewal dates',
      'Credits display now shows accurate remaining balance',
    ],
  },
  {
    version: 'v2.3.1',
    date: '2025-11-15',
    type: 'fix',
    title: lang === 'vi' ? 'Sửa lỗi và ổn định' : 'Bug Fixes and Stability',
    description: lang === 'vi'
      ? 'Các bản sửa lỗi và cải thiện hiệu suất khác nhau.'
      : 'Various bug fixes and performance improvements.',
    changes: lang === 'vi' ? [
      'Sửa lỗi giới hạn tốc độ trong các trường hợp đặc biệt cho yêu cầu lớn',
      'Giải quyết gián đoạn phản hồi streaming',
      'Cải thiện thông báo lỗi cho lỗi xác thực',
    ] : [
      'Fixed rate limiting edge cases for high-volume requests',
      'Resolved streaming response interruptions',
      'Improved error messages for authentication failures',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2025-11-10',
    type: 'feature',
    title: lang === 'vi' ? 'Cập nhật tích hợp' : 'Integration Updates',
    description: lang === 'vi'
      ? 'Cập nhật tích hợp cho KiloCode và RooCode với hậu tố phiên bản.'
      : 'Updated integrations for KiloCode and RooCode with version suffixes.',
    changes: lang === 'vi' ? [
      'Tích hợp KiloCode hỗ trợ chọn phiên bản mô hình',
      'Tích hợp RooCode cải thiện xử lý lỗi tốt hơn',
      'Thêm hỗ trợ tích hợp Droid',
    ] : [
      'KiloCode integration now supports model version selection',
      'RooCode integration improved with better error handling',
      'Added Droid integration support',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2025-11-05',
    type: 'feature',
    title: lang === 'vi' ? 'Định dạng API Anthropic' : 'Anthropic API Format',
    description: lang === 'vi'
      ? 'Hỗ trợ gốc cho định dạng API Anthropic cùng với khả năng tương thích OpenAI.'
      : 'Native support for Anthropic API format alongside OpenAI compatibility.',
    changes: lang === 'vi' ? [
      'Hỗ trợ đầy đủ Anthropic Messages API',
      'Tính năng gốc Claude như extended thinking',
      'Hỗ trợ dual endpoint cho sự linh hoạt',
    ] : [
      'Full Anthropic Messages API support',
      'Claude-native features like extended thinking',
      'Dual endpoint support for flexibility',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2025-11-01',
    type: 'improvement',
    title: lang === 'vi' ? 'Tối ưu hóa hiệu suất' : 'Performance Optimizations',
    description: lang === 'vi'
      ? 'Cải thiện hiệu suất đáng kể trên toàn nền tảng.'
      : 'Significant performance improvements across the platform.',
    changes: lang === 'vi' ? [
      'Giảm độ trễ API xuống 30%',
      'Cải thiện thời gian phản hồi streaming',
      'Cân bằng tải tốt hơn cho lưu lượng cao',
    ] : [
      'Reduced API latency by 30%',
      'Improved streaming response times',
      'Better load balancing for high traffic',
    ],
  },
]

// ===== VERSION BADGE =====
function VersionBadge({ version, type, lang }: { version: string; type: string; lang: string }) {
  const typeStyles = {
    feature: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    improvement: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
    fix: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  }

  const typeLabels = {
    feature: lang === 'vi' ? 'Tính năng mới' : 'New Feature',
    improvement: lang === 'vi' ? 'Cải tiến' : 'Improvement',
    fix: lang === 'vi' ? 'Sửa lỗi' : 'Bug Fix',
  }

  return (
    <div className="flex items-center gap-2">
      <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-sm font-mono font-medium border border-gray-200 dark:border-white/10">
        {version}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeStyles[type as keyof typeof typeStyles]}`}>
        {typeLabels[type as keyof typeof typeLabels]}
      </span>
    </div>
  )
}

// ===== CHANGELOG ENTRY =====
function ChangelogEntry({ entry, lang }: { entry: ReturnType<typeof getChangelogData>[0]; lang: string }) {
  return (
    <div className="relative pl-8 pb-10 border-l-2 border-gray-200 dark:border-white/10 last:pb-0" id={entry.version}>
      <div className="absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 dark:bg-white/20 border-2 border-white dark:border-black" />
      
      <div className="mb-3">
        <VersionBadge version={entry.version} type={entry.type} lang={lang} />
        <time className="block mt-2 text-sm text-gray-500 dark:text-slate-500">{entry.date}</time>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{entry.title}</h3>
      <p className="text-gray-600 dark:text-slate-400 mb-4">{entry.description}</p>
      
      <ul className="space-y-2">
        {entry.changes.map((change, index) => (
          <li key={index} className="flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-700 dark:text-slate-300 text-sm">{change}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function ChangelogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t, language } = useLanguage()
  const sidebarNav = getSidebarNav(t)
  const changelogData = getChangelogData(language)

  const pageTitle = language === 'vi' ? 'Nhật ký thay đổi' : 'Changelog'
  const pageDesc = language === 'vi' 
    ? 'Theo dõi các cập nhật, tính năng mới và cải tiến của TrollLLM API.'
    : 'Track updates, new features, and improvements to the TrollLLM API.'

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header activeLink="docs" />

      <div className="flex pt-[65px]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-white dark:bg-black lg:bg-transparent border-r border-gray-200 dark:border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.docs.sidebar.searchDocs}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-gray-300 dark:focus:border-white/10 transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            item.active
                              ? 'bg-indigo-50 dark:bg-white/10 text-indigo-700 dark:text-white'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-12">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 mb-8">
              <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {language === 'vi' ? 'Tài liệu' : 'Docs'}
              </Link>
              <span>/</span>
              <span className="text-gray-600 dark:text-slate-400">{t.docs.sidebar.changelog}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{pageTitle}</h1>
            <p className="text-lg text-gray-700 dark:text-slate-400 mb-8">
              {pageDesc}
            </p>

            {/* RSS Feed Link */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 mb-10">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 dark:text-white font-medium text-sm">
                  {language === 'vi' ? 'Theo dõi cập nhật' : 'Stay Updated'}
                </h3>
                <p className="text-gray-500 dark:text-slate-500 text-sm">
                  {language === 'vi' ? 'Đăng ký nhận thông báo về các bản cập nhật mới.' : 'Subscribe to get notified about new updates.'}
                </p>
              </div>
              <Link 
                href="https://discord.gg/WA3NzpXuq9" 
                target="_blank"
                className="px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </Link>
            </div>

            {/* Changelog Timeline */}
            <div className="mt-8">
              {changelogData.map((entry) => (
                <ChangelogEntry key={entry.version} entry={entry} lang={language} />
              ))}
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/5">
              <Link href="/docs/rate-limits" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t.docs.sidebar.rateLimits}</span>
              </Link>
              <Link href="/docs" className="group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span>{t.docs.sidebar.introduction}</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-gray-200 dark:border-white/5 p-6">
          <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">
            {language === 'vi' ? 'Phiên bản' : 'Versions'}
          </h3>
          <nav className="space-y-2">
            {changelogData.map((entry, index) => (
              <a 
                key={entry.version}
                href={`#${entry.version}`} 
                className={`block text-sm transition-colors ${
                  index === 0 
                    ? 'text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {entry.version}
              </a>
            ))}
          </nav>

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/5">
            <h3 className="text-gray-500 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">
              {language === 'vi' ? 'Liên kết nhanh' : 'Quick Links'}
            </h3>
            <nav className="space-y-2">
              <a 
                href="https://github.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a 
                href="https://discord.gg/WA3NzpXuq9" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </a>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  )
}
