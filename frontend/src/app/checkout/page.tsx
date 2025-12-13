'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCheckout, getPaymentStatus, isAuthenticated } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'

const MIN_AMOUNT = 20
const MAX_AMOUNT = 100
const VND_RATE = 1000 // 1000 VND = $1

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const [customAmount, setCustomAmount] = useState(MIN_AMOUNT)
  const [discordId, setDiscordId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select')
  const [paymentData, setPaymentData] = useState<{
    paymentId: string
    qrCodeUrl: string
    amount: number
    tokens: number
    orderCode: string
  } | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [discordRoleAssigned, setDiscordRoleAssigned] = useState(false)

  const vndAmount = customAmount * VND_RATE

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/checkout')
    }
  }, [router])

  const handleCheckout = async () => {
    if (customAmount < MIN_AMOUNT || customAmount > MAX_AMOUNT) {
      setError(`Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}`)
      return
    }

    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      setError(t.checkout.discord.invalidId)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await createCheckout(customAmount, discordId || undefined)
      setPaymentData({
        paymentId: data.paymentId,
        qrCodeUrl: data.qrCodeUrl,
        amount: data.amount,
        tokens: data.credits,
        orderCode: data.orderCode,
      })
      const expiresAt = new Date(data.expiresAt)
      setRemainingSeconds(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
      setStep('payment')
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step !== 'payment' || !paymentData) return

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getPaymentStatus(paymentData.paymentId)
        setRemainingSeconds(statusData.remainingSeconds)

        if (statusData.status === 'success') {
          setDiscordRoleAssigned(!!discordId)
          setStep('success')
          clearInterval(pollInterval)
        } else if (statusData.status === 'expired') {
          setError(t.checkout.payment.expired)
          setStep('select')
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Failed to poll status:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [step, paymentData, discordId, router])

  useEffect(() => {
    if (step !== 'payment' || remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setError(t.checkout.payment.expired)
          setStep('select')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step, remainingSeconds])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[var(--theme-bg)] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl animate-gradient-xy" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 dark:from-pink-500/10 dark:via-purple-500/10 dark:to-indigo-500/10 rounded-full blur-3xl animate-float-delayed" />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--theme-bg)_100%)]" />
      </div>

      {/* Header */}
      <header className="border-b border-gray-200/80 dark:border-white/5 bg-white/95 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-50 shadow-sm dark:shadow-none relative">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg rotate-6" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
                  <path d="M12 3c2.5 0 5 4 5 9" />
                  <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Troll<span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">LLM</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm bg-white dark:bg-transparent shadow-sm dark:shadow-none"
            >
              <span className={language === 'vi' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-400'}>VI</span>
              <span className="text-gray-300 dark:text-gray-400">/</span>
              <span className={language === 'en' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-400'}>EN</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all bg-white dark:bg-transparent shadow-sm dark:shadow-none"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link href="/" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-transparent transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-6 py-8">
        {/* Step: Select Amount */}
        {step === 'select' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t.checkout.title}
              </h1>
            </div>

            {/* Amount Selection Card with enhanced design */}
            <div className="relative group">
              {/* Animated gradient border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-60 group-hover:opacity-100 blur-sm transition-all duration-500 animate-gradient-xy" />

              <div className="relative p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-white/50 dark:border-white/10">
                {/* Header */}
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'vi' ? 'Chọn số tiền' : 'Select Amount'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'vi' ? `Tối thiểu $${MIN_AMOUNT} - Tối đa $${MAX_AMOUNT}` : `Min $${MIN_AMOUNT} - Max $${MAX_AMOUNT}`}
                  </p>
                </div>

                {/* Quick Amount Buttons with enhanced styling */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[20, 50, 75, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCustomAmount(amount)}
                      className={`relative py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                        customAmount === amount
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 scale-105'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                      }`}
                    >
                      {customAmount === amount && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-shimmer" />
                      )}
                      <span className="relative">${amount}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input with enhanced design */}
                <div className="relative mb-4">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">$</div>
                  <input
                    type="number"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    value={customAmount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || MIN_AMOUNT
                      setCustomAmount(Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, val)))
                    }}
                    className="w-full pl-12 pr-5 py-3.5 text-2xl font-bold text-center rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                {/* Enhanced Slider */}
                <div className="mb-5">
                  <input
                    type="range"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    style={{
                      background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(168, 85, 247) ${((customAmount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100}%, rgb(209, 213, 219) ${((customAmount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100}%, rgb(209, 213, 219) 100%)`
                    }}
                  />
                </div>

                {/* Elegant Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent mb-5" />

                {/* Enhanced Summary */}
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
                    <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">{language === 'vi' ? 'Số tiền USD' : 'USD Amount'}</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">${customAmount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{language === 'vi' ? 'Số tiền VND' : 'VND Amount'}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(vndAmount)} VND</span>
                  </div>
                  <div className="flex justify-between items-center text-xs px-3">
                    <span className="text-gray-500 dark:text-gray-500">{language === 'vi' ? 'Tỷ giá' : 'Rate'}</span>
                    <span className="text-gray-500 dark:text-gray-500">1,000 VND = $1</span>
                  </div>
                </div>

                {/* Enhanced Features Grid */}
                <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { text: t.checkout.features.allModels },
                      { text: language === 'vi' ? 'Hiệu lực 1 tuần' : 'Valid for 1 week' },
                      { text: language === 'vi' ? 'Bảo hành 1:1' : '1:1 Warranty' },
                      { text: t.checkout.features.prioritySupport }
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-transparent">
                        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Discord ID Input */}
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5865F2] to-[#7289DA] rounded-2xl opacity-50 group-hover:opacity-100 blur-sm transition-opacity" />
              <div className="relative p-4 rounded-2xl bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.checkout.discord.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{t.checkout.discord.optional}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{t.checkout.discord.shortDesc}</p>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.checkout.discord.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs placeholder-gray-400 focus:outline-none focus:border-[#5865F2] focus:ring-4 focus:ring-[#5865F2]/20 transition-all"
                  maxLength={19}
                />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <a href="https://support.discord.com/hc/en-us/articles/206346498" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-[10px] font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.checkout.discord.howToFind}
                  </a>
                  <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors text-[10px] font-medium shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    {t.checkout.discord.joinServer}
                  </a>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Enhanced Pay Button Section */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.checkout.summary.total}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(vndAmount)}
                    <span className="text-base font-normal text-gray-400 ml-1.5">VND</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credits</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">${customAmount}</p>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="relative w-full py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-base hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" />
                    <span>{t.checkout.payment.processing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.pricing.buyNow}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Purchase</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Please review before proceeding</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-4 border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Credits</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">${customAmount}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Valid for</span>
                  <span className="font-semibold text-gray-900 dark:text-white">7 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t.checkout.summary.total}</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{formatPrice(vndAmount)} VND</span>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  <strong>Note:</strong> Credits will be added to your account balance after successful payment.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {(t.checkout as any).confirm?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false)
                    handleCheckout()
                  }}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
                >
                  {loading ? t.checkout.payment.processing : ((t.checkout as any).confirm?.proceed || 'Proceed')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Payment QR */}
        {step === 'payment' && paymentData && (
          <div className="max-w-2xl mx-auto min-h-[60vh] flex items-center pt-[10vh]">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0 text-center">
                <div className="bg-white p-4 rounded-2xl shadow-xl dark:shadow-lg border border-gray-100 dark:border-transparent inline-block mb-4">
                  <img src={paymentData.qrCodeUrl} alt="QR" className="w-52 h-52" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(paymentData.amount)} VND</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">{t.checkout.payment.exactAmount}</p>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mt-3 ${
                  remainingSeconds < 60 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-green-500/20 text-emerald-600 dark:text-green-400'
                }`}>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                  <span className="font-mono font-semibold text-lg">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.checkout.payment.scanToPay}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{t.checkout.payment.useApp}</p>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2 border border-gray-100 dark:border-transparent">
                  <p className="font-medium text-gray-700 dark:text-gray-300">{t.checkout.payment.instructions}</p>
                  <ol className="text-sm text-gray-500 dark:text-gray-400 list-decimal list-inside space-y-1">
                    <li>{t.checkout.payment.step1}</li>
                    <li>{t.checkout.payment.step2}</li>
                    <li>{t.checkout.payment.step3}</li>
                    <li>{t.checkout.payment.step4}</li>
                  </ol>
                </div>

                <div className="bg-amber-50 dark:bg-yellow-500/10 rounded-xl p-3 flex items-start gap-3 border border-amber-200 dark:border-transparent">
                  <svg className="w-5 h-5 text-amber-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-700 dark:text-yellow-300">
                    {t.checkout.payment.warningText}{' '}
                    <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] hover:underline font-medium">Discord</a>.
                  </p>
                </div>

                <button onClick={() => { setStep('select'); setPaymentData(null) }} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 whitespace-nowrap">
                  ← {t.checkout.payment.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 dark:bg-green-500/20 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-none">
              <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.checkout.success.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {language === 'vi' ? `Bạn đã nhận được $${customAmount} credits!` : `You have received $${customAmount} credits!`}
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Credits</span>
                <span className="font-semibold text-gray-900 dark:text-white">${customAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">{language === 'vi' ? 'Hiệu lực' : 'Valid for'}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{language === 'vi' ? '7 ngày' : '7 days'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">{language === 'vi' ? 'Đã thanh toán' : 'Amount Paid'}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(vndAmount)} VND</span>
              </div>
            </div>

            {discordRoleAssigned && (
              <div className="bg-indigo-50 dark:bg-[#5865F2]/10 rounded-xl p-4 flex items-center gap-3 border border-indigo-200 dark:border-transparent">
                <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <div className="text-left">
                  <p className="font-medium text-[#5865F2]">{t.checkout.success.discordRole}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Check Discord for your role!</p>
                </div>
              </div>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-500 text-white font-semibold text-lg hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/20 hover:shadow-xl"
            >
              {t.checkout.success.goToDashboard}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
