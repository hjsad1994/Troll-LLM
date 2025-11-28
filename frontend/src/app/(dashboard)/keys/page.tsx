'use client'

import Link from 'next/link'

export default function KeysPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Feature Disabled</h1>
        <p className="text-slate-400 mb-6">
          Manual API key management has been disabled. Users now receive API keys automatically when they register and can manage them from their dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/users"
            className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            Manage Users
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
