'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCheckout, getPaymentStatus, isAuthenticated } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'

const PACKAGES = {
  '6m': {
    price: 20000,
    originalPrice: 25000,
    discount: 20,
    tokens: 6000000,
    days: 7,
    popular: false,
  },
  '12m': {
    price: 40000,
    originalPrice: 50000,
    discount: 20,
    tokens: 12000000,
    days: 7,
    popular: true,
  },
}

type PackageType = '6m' | '12m'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const packageParam = searchParams.get('package') as PackageType | null

  const [selectedPackage, setSelectedPackage] = useState<PackageType>(
    packageParam === '12m' ? '12m' : '6m'
  )
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

  const pkg = PACKAGES[selectedPackage]
  
  const formatTokens = (tokens: number) => {
    return `${(tokens / 1000000).toFixed(0)}M`
  }
  
  const getFeatures = (pkgKey: PackageType) => {
    const p = PACKAGES[pkgKey]
    return [
      `${formatTokens(p.tokens)} tokens`,
      `Valid for ${p.days} days`,
      t.checkout.features.allModels,
      t.checkout.features.prioritySupport,
    ]
  }
  
  const features = getFeatures(selectedPackage)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/checkout' + (packageParam ? `?package=${packageParam}` : ''))
    }
  }, [router, packageParam])

  const handleCheckout = async () => {
    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      setError(t.checkout.discord.invalidId)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await createCheckout(selectedPackage, discordId || undefined)
      setPaymentData({
        paymentId: data.paymentId,
        qrCodeUrl: data.qrCodeUrl,
        amount: data.amount,
        tokens: data.tokens,
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-gray-950 dark:to-black">
      {/* Header */}
      <header className="border-b border-gray-200/80 dark:border-white/5 bg-white/90 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm dark:shadow-none">
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

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Step: Select Plan */}
        {step === 'select' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {t.checkout.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.checkout.subtitle}
              </p>
            </div>

            {/* Selected Plan Info */}
            <div className="relative group">
              <div
                className="absolute -inset-1 rounded-2xl opacity-60 dark:opacity-75 blur-md"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #6366f1)',
                  backgroundSize: '300% 100%',
                  animation: 'ledBorder 3s linear infinite',
                }}
              />
              <div
                className="absolute -inset-[2px] rounded-2xl"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #6366f1)',
                  backgroundSize: '300% 100%',
                  animation: 'ledBorder 3s linear infinite',
                }}
              />

              <div className="relative p-6 rounded-[14px] bg-white dark:bg-gray-900 shadow-sm dark:shadow-none">
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span
                      className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
                      style={{
                        background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #6366f1)',
                        backgroundSize: '300% 100%',
                        animation: 'ledBorder 3s linear infinite',
                      }}
                    >
                      BEST VALUE
                    </span>
                  </div>
                )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatTokens(pkg.tokens)} Tokens</h3>
                  <p className="text-gray-500 dark:text-gray-400">Valid for {pkg.days} days</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(pkg.price)}</span>
                    <span className="text-gray-500">VND</span>
                  </div>
                  {pkg.price < pkg.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">{formatPrice(pkg.originalPrice)} VND</span>
                  )}
                </div>
              </div>
              <div className="h-px bg-gray-200 dark:bg-white/10 my-4" />
              <ul className="grid grid-cols-2 gap-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <Link href="/#pricing" className="text-sm text-indigo-500 hover:text-indigo-600 transition-colors">
                  ← {t.checkout.changePlan || 'Change plan'}
                </Link>
              </div>
              </div>
            </div>

            {/* Discord ID Input */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/5 border border-slate-400/80 dark:border-white/10 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t.checkout.discord.title}</span>
                <span className="text-xs text-gray-400">({t.checkout.discord.optional})</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 ml-7">{t.checkout.discord.shortDesc}</p>
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                placeholder={t.checkout.discord.placeholder}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-400/80 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20 transition-all"
                maxLength={19}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <a href="https://support.discord.com/hc/en-us/articles/206346498" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.checkout.discord.howToFind}
                </a>
                <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {t.checkout.discord.joinServer}
                </a>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Summary & Pay Button */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t.checkout.summary.total}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(pkg.price)} <span className="text-lg font-normal text-gray-400">VND</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Package</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTokens(pkg.tokens)} Tokens</p>
                </div>
              </div>

              <button
                disabled
                className="w-full py-4 rounded-xl bg-gray-400 text-white font-semibold text-lg cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
              >
                {t.pricing.unavailable}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal - simplified for token packages */}
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
                  <span className="text-gray-600 dark:text-gray-400">Package</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatTokens(pkg.tokens)} Tokens</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Valid for</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{pkg.days} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t.checkout.summary.total}</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{formatPrice(pkg.price)} VND</span>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  <strong>Note:</strong> Tokens will be added to your account balance after successful payment.
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
                    <a href="https://discord.gg/Prs3RxwnyQ" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] hover:underline font-medium">Discord</a>.
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
                You have received {formatTokens(pkg.tokens)} tokens!
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Package</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatTokens(pkg.tokens)} Tokens</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Valid for</span>
                <span className="font-semibold text-gray-900 dark:text-white">{pkg.days} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(pkg.price)} VND</span>
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
