'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCheckout, getPaymentStatus, isAuthenticated } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'
import { isPromoActive, getTimeRemaining, calculateBonusCredits, getBonusAmount, PROMO_CONFIG } from '@/lib/promo'

const MIN_AMOUNT = 20
const MAX_AMOUNT = 100
const VND_RATE = 1000

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language } = useLanguage()

  const [customAmount, setCustomAmount] = useState(MIN_AMOUNT)
  const [discordId, setDiscordId] = useState('')
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
  const [promoActive, setPromoActive] = useState(isPromoActive())
  const [promoTimeLeft, setPromoTimeLeft] = useState(getTimeRemaining())

  const vndAmount = customAmount * VND_RATE

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/checkout')
    }
  }, [router])

  // Promo countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setPromoActive(isPromoActive())
      setPromoTimeLeft(getTimeRemaining())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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
    <div className="min-h-screen bg-[var(--theme-bg)]">
      <Header hideAuthButtons />

      {/* Background with grid - same as homepage */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
        {/* Step: Select Amount */}
        {step === 'select' && (
          <div className="w-full max-w-md">
            {/* Back Button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors mb-6 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">{language === 'vi' ? 'Quay lại trang chủ' : 'Back to homepage'}</span>
            </Link>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[var(--theme-text)] mb-1">
                {t.checkout.title}
              </h1>
              <p className="text-sm text-[var(--theme-text-subtle)]">
                {t.checkout.subtitle}
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-white/[0.02] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-200 dark:border-white/5 overflow-hidden">
              {/* Promo Banner */}
              {promoActive && promoTimeLeft.total > 0 && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border-b border-emerald-500/20">
                  <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                      {t.pricing.promo?.bonusTitle || 'BONUS +15% CREDITS!'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {t.pricing.promo?.endsIn || 'Ends in'}: {promoTimeLeft.days > 0 && `${promoTimeLeft.days}d `}
                      {String(promoTimeLeft.hours).padStart(2, '0')}:{String(promoTimeLeft.minutes).padStart(2, '0')}:{String(promoTimeLeft.seconds).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount Section */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <div className="text-center mb-6">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[var(--theme-text)]">${customAmount}</span>
                    <span className="text-[var(--theme-text-muted)] text-sm">USD</span>
                  </div>
                  {promoActive ? (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      → {language === 'vi' ? 'Nhận' : 'Get'} ${calculateBonusCredits(customAmount).toFixed(0)} credits (+{PROMO_CONFIG.bonusPercent}% bonus)
                    </p>
                  ) : (
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-1">
                      = {formatPrice(vndAmount)} VND
                    </p>
                  )}
                </div>

                {/* Quick Select */}
                <div className="flex gap-2 mb-4">
                  {[20, 50, 75, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCustomAmount(amount)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        customAmount === amount
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-gray-100 dark:bg-white/5 text-[var(--theme-text-muted)] hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <div className="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1">
                    <span>${MIN_AMOUNT}</span>
                    <span>${MAX_AMOUNT}</span>
                  </div>
                </div>
              </div>

              {/* Discord Section */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="text-sm font-medium text-[var(--theme-text)]">Discord ID</span>
                  <span className="text-xs text-[var(--theme-text-muted)]">({t.checkout.discord.optional})</span>
                </div>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.checkout.discord.placeholder}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[var(--theme-text)] text-sm placeholder-[var(--theme-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  maxLength={19}
                />
                <p className="text-xs text-[var(--theme-text-muted)] mt-2">{t.checkout.discord.shortDesc}</p>
              </div>

              {/* Summary & Pay */}
              <div className="p-6 bg-gray-50/50 dark:bg-white/[0.01]">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Summary with bonus */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--theme-text-subtle)]">{language === 'vi' ? 'Số tiền' : 'Amount'}</span>
                    <span className="font-semibold text-[var(--theme-text)]">${customAmount}</span>
                  </div>
                  {promoActive && (
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-600 dark:text-emerald-400">Bonus +{PROMO_CONFIG.bonusPercent}%</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+${getBonusAmount(customAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-200 dark:bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--theme-text-subtle)]">{language === 'vi' ? 'Bạn nhận' : 'You receive'}</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ${promoActive ? calculateBonusCredits(customAmount).toFixed(2) : customAmount} credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--theme-text-subtle)]">{t.checkout.summary.total}</span>
                    <span className="text-lg font-bold text-[var(--theme-text)]">{formatPrice(vndAmount)} VND</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[var(--theme-text)] hover:opacity-90 text-[var(--theme-bg)] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[var(--theme-bg)] border-t-transparent rounded-full animate-spin" />
                      {t.checkout.payment.processing}
                    </>
                  ) : (
                    <>
                      {t.pricing.buyNow}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Features */}
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--theme-text-muted)]">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t.checkout.features.allModels}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    7 days
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    1:1 Warranty
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Payment QR */}
        {step === 'payment' && paymentData && (
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-white/[0.02] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-200 dark:border-white/5 overflow-hidden">
              {/* QR Section */}
              <div className="p-8 text-center">
                <div className="bg-white p-3 rounded-2xl shadow-lg inline-block mb-4">
                  <img src={paymentData.qrCodeUrl} alt="QR" className="w-48 h-48" />
                </div>

                <div className="mb-4">
                  <p className="text-2xl font-bold text-[var(--theme-text)]">{formatPrice(paymentData.amount)} VND</p>
                  <p className="text-xs text-red-500 mt-1">{t.checkout.payment.exactAmount}</p>
                </div>

                {/* Timer */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  remainingSeconds < 60
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                  <span className="font-mono font-semibold">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="px-6 pb-6">
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-[var(--theme-text)] mb-2">{t.checkout.payment.instructions}</p>
                  <ol className="text-xs text-[var(--theme-text-subtle)] space-y-1 list-decimal list-inside">
                    <li>{t.checkout.payment.step1}</li>
                    <li>{t.checkout.payment.step2}</li>
                    <li>{t.checkout.payment.step3}</li>
                  </ol>
                </div>

                {/* Support Note */}
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {language === 'vi'
                        ? 'Nếu thanh toán thành công mà không nhận được credits, vui lòng liên hệ admin qua '
                        : 'If payment is successful but you don\'t receive credits, please contact admin via '}
                      <a href="https://discord.gg/WA3NzpXuq9" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#5865F2] hover:underline">
                        Discord
                      </a>
                      {language === 'vi' ? ' và gửi ticket.' : ' and submit a ticket.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { setStep('select'); setPaymentData(null) }}
                  className="w-full py-3 rounded-xl border border-gray-200 dark:border-white/10 text-[var(--theme-text-muted)] text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  {t.checkout.payment.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="w-full max-w-md text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[var(--theme-text)] mb-2">
              {t.checkout.success.title}
            </h1>
            <p className="text-[var(--theme-text-subtle)] mb-6">
              {language === 'vi'
                ? `+$${promoActive ? calculateBonusCredits(customAmount).toFixed(2) : customAmount} credits`
                : `+$${promoActive ? calculateBonusCredits(customAmount).toFixed(2) : customAmount} credits added`}
              {promoActive && <span className="text-emerald-500 ml-1">(+{PROMO_CONFIG.bonusPercent}% bonus!)</span>}
            </p>

            {/* Summary Card */}
            <div className="bg-white dark:bg-white/[0.02] rounded-2xl shadow-lg border border-gray-200 dark:border-white/5 p-6 mb-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-subtle)]">{language === 'vi' ? 'Số tiền' : 'Amount'}</span>
                  <span className="font-semibold text-[var(--theme-text)]">${customAmount}</span>
                </div>
                {promoActive && (
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400">Bonus +{PROMO_CONFIG.bonusPercent}%</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">+${getBonusAmount(customAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 dark:bg-white/5" />
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-subtle)]">Credits</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ${promoActive ? calculateBonusCredits(customAmount).toFixed(2) : customAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-subtle)]">{language === 'vi' ? 'Hiệu lực' : 'Valid for'}</span>
                  <span className="font-semibold text-[var(--theme-text)]">7 days</span>
                </div>
                <div className="h-px bg-gray-100 dark:bg-white/5" />
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-subtle)]">{language === 'vi' ? 'Đã thanh toán' : 'Paid'}</span>
                  <span className="font-semibold text-[var(--theme-text)]">{formatPrice(vndAmount)} VND</span>
                </div>
              </div>
            </div>

            {discordRoleAssigned && (
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 mb-6 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium">{t.checkout.success.discordRole}</span>
              </div>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[var(--theme-text)] hover:opacity-90 text-[var(--theme-bg)] font-semibold transition-all"
            >
              {t.checkout.success.goToDashboard}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
