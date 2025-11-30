'use client'

import { useEffect, useState, useCallback } from 'react'
import { getUserProfile, getFullApiKey, rotateApiKey, getBillingInfo, UserProfile, BillingInfo } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'

function formatLargeNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState('0')

  useEffect(() => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) {
      setDisplayed(value)
      return
    }

    let start = 0
    const duration = 1500
    const increment = num / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= num) {
        setDisplayed(value)
        clearInterval(timer)
      } else {
        setDisplayed(num < 100 ? start.toFixed(1) : Math.floor(start).toString())
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{displayed}{suffix}</span>
}

export default function UserDashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [showFullApiKey, setShowFullApiKey] = useState(false)
  const [fullApiKey, setFullApiKey] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const loadUserData = useCallback(async () => {
    try {
      const [profile, billing] = await Promise.all([
        getUserProfile().catch(() => null),
        getBillingInfo().catch(() => null),
      ])
      if (profile) setUserProfile(profile)
      if (billing) setBillingInfo(billing)
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const handleShowApiKey = async () => {
    if (showFullApiKey) {
      setShowFullApiKey(false)
      return
    }
    try {
      const key = await getFullApiKey()
      setFullApiKey(key)
      setShowFullApiKey(true)
      setTimeout(() => setShowFullApiKey(false), 30000)
    } catch (err) {
      console.error('Failed to get API key:', err)
    }
  }

  const handleCopyApiKey = async () => {
    try {
      const key = fullApiKey || await getFullApiKey()
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRotateApiKey = async () => {
    setRotating(true)
    try {
      const result = await rotateApiKey()
      setNewApiKey(result.newApiKey)
      setFullApiKey(result.newApiKey)
      setShowFullApiKey(true)
      setShowRotateConfirm(false)
      await loadUserData()
    } catch (err) {
      console.error('Failed to rotate API key:', err)
    } finally {
      setRotating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const usagePercentage = billingInfo?.usagePercentage || 0

  return (
    <div className="min-h-screen bg-black -m-8 p-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="pt-8 opacity-0 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-slate-500 text-sm">{getTimeGreeting()}</span>
            </div>
            {/* Plan Badge */}
            {userProfile && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm ${
                userProfile.plan === 'enterprise'
                  ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30'
                  : userProfile.plan === 'pro'
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30'
                    : 'bg-white/5 border-white/10'
              }`}>
                {userProfile.plan === 'enterprise' ? (
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                ) : userProfile.plan === 'pro' ? (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span className={`text-sm font-semibold ${
                  userProfile.plan === 'enterprise'
                    ? 'text-purple-400'
                    : userProfile.plan === 'pro'
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                }`}>
                  {userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)} Plan
                </span>
                {userProfile.plan !== 'free' && userProfile.plan !== 'dev' && (
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      userProfile.plan === 'enterprise' ? 'bg-purple-400' : 'bg-indigo-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      userProfile.plan === 'enterprise' ? 'bg-purple-400' : 'bg-indigo-400'
                    }`}></span>
                  </span>
                )}
              </div>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {user?.username || 'User'}
          </h1>
          <p className="text-slate-500 text-lg">
            Welcome to your dashboard
          </p>
        </header>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* API Key Card */}
          <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors opacity-0 animate-fade-in-up animation-delay-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">API Key</h3>
                  <p className="text-slate-600 text-sm">Your secret access key</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
                <span className="text-emerald-400 text-xs">Active</span>
              </div>
            </div>

            {userProfile ? (
              <div className="space-y-4">
                {/* API Key Display */}
                <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-slate-300 text-sm font-mono break-all">
                      {showFullApiKey && fullApiKey ? fullApiKey : userProfile.apiKey}
                    </code>
                    <button
                      onClick={handleShowApiKey}
                      className="shrink-0 p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    >
                      {showFullApiKey ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {newApiKey && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-emerald-400 text-sm font-medium">New key generated!</p>
                      <p className="text-slate-500 text-xs">Copy it now. You won't see it again.</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyApiKey}
                    className="flex-1 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy Key'}
                  </button>
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="py-2.5 px-4 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    Rotate
                  </button>
                </div>

                <p className="text-slate-600 text-xs">
                  Created {new Date(userProfile.apiKeyCreatedAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-10 bg-white/5 rounded-lg flex-1 animate-pulse" />
                  <div className="h-10 bg-white/5 rounded-lg w-24 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Credits Card */}
          <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors opacity-0 animate-fade-in-up animation-delay-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Credits</h3>
                  <p className="text-slate-600 text-sm">Your balance</p>
                </div>
              </div>
              {billingInfo && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  billingInfo.plan === 'enterprise' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' :
                  billingInfo.plan === 'pro' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' :
                  'bg-white/5 border border-white/10 text-slate-400'
                }`}>
                  {billingInfo.plan.charAt(0).toUpperCase() + billingInfo.plan.slice(1)}
                </span>
              )}
            </div>

            {userProfile ? (
              <div className="space-y-6">
                {/* Credits Display */}
                <div className="bg-[#0a0a0a] rounded-lg border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-600 text-xs uppercase tracking-wider mb-1">Available Balance</p>
                      <p className="text-4xl font-bold text-emerald-400">
                        ${(userProfile.credits || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-slate-600 text-xs">Used</p>
                    <p className="text-white font-medium">{formatLargeNumber(userProfile.tokensUsed)}</p>
                  </div>
                </div>

                {/* Plan Expiration Warning */}
                {billingInfo?.isExpiringSoon && billingInfo.daysUntilExpiration !== null && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Plan expires in {billingInfo.daysUntilExpiration} day{billingInfo.daysUntilExpiration > 1 ? 's' : ''}</p>
                      <p className="text-slate-500 text-xs">Contact admin to renew your plan</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex flex-col gap-1">
                    <span>Plan: {userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)}</span>
                    {billingInfo?.planExpiresAt && userProfile.plan !== 'free' && (
                      <span className="text-slate-500">
                        Expires: {new Date(billingInfo.planExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <a href="/#pricing" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Upgrade Plan
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Quick Start */}
        <section className="opacity-0 animate-fade-in-up animation-delay-400">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            {/* Window chrome */}
            <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <span className="text-slate-600 text-xs">example.py</span>
            </div>
            {/* Code content */}
            <div className="bg-[#0a0a0a] p-6 overflow-x-auto">
              <pre className="font-mono text-sm text-slate-300">
                <span className="text-purple-400">from</span> openai <span className="text-purple-400">import</span> OpenAI{'\n\n'}
                <span className="text-blue-400">client</span> = <span className="text-blue-400">OpenAI</span>({'\n'}
                {'    '}base_url=<span className="text-emerald-400">"https://chat.trollllm.xyz/v1"</span>,{'\n'}
                {'    '}api_key=<span className="text-emerald-400">"<span className="text-amber-400">YOUR_API_KEY</span>"</span>{'\n'}
                ){'\n\n'}
                <span className="text-blue-400">response</span> = <span className="text-blue-400">client</span>.chat.completions.create({'\n'}
                {'    '}model=<span className="text-emerald-400">"<span className="text-indigo-400">claude-opus-4-5</span>"</span>,{'\n'}
                {'    '}messages=[{'{'}role: <span className="text-emerald-400">"user"</span>, content: <span className="text-emerald-400">"Hello!"</span>{'}'}]{'\n'}
                )
              </pre>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="pb-8 opacity-0 animate-fade-in-up animation-delay-500">
          <div className="flex flex-wrap gap-4">
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Status Page
            </a>
            <a
              href="/models"
              className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              View Models
            </a>
          </div>
        </section>
      </div>

      {/* Rotate API Key Modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Rotate API Key?</h3>
                <p className="text-slate-500 text-sm">This cannot be undone</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                'Current key will be invalidated immediately',
                'All applications using this key will stop working',
                'You\'ll need to update the key everywhere'
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-amber-400 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateApiKey}
                disabled={rotating}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {rotating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Rotating...
                  </>
                ) : (
                  'Rotate Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
