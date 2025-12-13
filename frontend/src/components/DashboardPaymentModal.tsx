'use client'

import { useState, useEffect, useCallback } from 'react'
import { createCheckout, getPaymentStatus } from '@/lib/api'
import { useLanguage } from '@/components/LanguageProvider'

interface DashboardPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MIN_AMOUNT = 20
const MAX_AMOUNT = 100
const VND_RATE = 1000 // 1000 VND = $1

export default function DashboardPaymentModal({ isOpen, onClose, onSuccess }: DashboardPaymentModalProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<'select' | 'payment' | 'success' | 'expired'>('select')
  const [selectedAmount, setSelectedAmount] = useState<number>(20)
  const [discordId, setDiscordId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{
    paymentId: string
    qrCodeUrl: string
    amount: number
    credits: number
    orderCode: string
    expiresAt: string
  } | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const dp = t.dashboardPayment

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select')
      setSelectedAmount(20)
      setDiscordId('')
      setError(null)
      setPaymentData(null)
      setRemainingSeconds(0)
    }
  }, [isOpen])

  // Poll payment status
  useEffect(() => {
    if (!paymentData || step !== 'payment') return

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getPaymentStatus(paymentData.paymentId)
        setRemainingSeconds(statusData.remainingSeconds)

        if (statusData.status === 'success') {
          setStep('success')
          clearInterval(pollInterval)
          onSuccess?.()
        } else if (statusData.status === 'expired') {
          setStep('expired')
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Failed to poll status:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [paymentData, step, onSuccess])

  // Countdown timer
  useEffect(() => {
    if (step !== 'payment' || remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setStep('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step, remainingSeconds])

  const handleCreatePayment = useCallback(async () => {
    // Validate Discord ID if provided
    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      setError(dp?.discordIdError || 'Invalid Discord ID format. Must be 17-19 digits.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await createCheckout(selectedAmount, discordId || undefined)
      setPaymentData({
        paymentId: data.paymentId,
        qrCodeUrl: data.qrCodeUrl,
        amount: data.amount,
        credits: data.credits,
        orderCode: data.orderCode,
        expiresAt: data.expiresAt,
      })
      setStep('payment')
      const expiresAt = new Date(data.expiresAt)
      setRemainingSeconds(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout')
    } finally {
      setLoading(false)
    }
  }, [selectedAmount, discordId, dp?.discordIdError])

  const handleRetry = () => {
    setPaymentData(null)
    setStep('select')
    setError(null)
  }

  const handleClose = () => {
    setPaymentData(null)
    setStep('select')
    setError(null)
    setDiscordId('')
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-700/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {step === 'success' ? dp?.paymentSuccess || 'Payment Successful!' :
             step === 'expired' ? dp?.paymentExpired || 'Payment Expired' :
             step === 'payment' ? dp?.scanToPay || 'Scan to Pay' : dp?.title || 'Buy Credits'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Amount Selection */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Amount Options */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  {dp?.selectAmount || 'Select Amount'}
                </label>

                {/* Amount Input */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setSelectedAmount(Math.max(MIN_AMOUNT, selectedAmount - 1))}
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl transition-colors disabled:opacity-50"
                      disabled={selectedAmount <= MIN_AMOUNT}
                    >
                      −
                    </button>
                    <div className="text-center">
                      <input
                        type="number"
                        value={selectedAmount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || MIN_AMOUNT
                          setSelectedAmount(Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, val)))
                        }}
                        className="w-24 text-center text-3xl font-bold bg-transparent text-emerald-400 focus:outline-none"
                        min={MIN_AMOUNT}
                        max={MAX_AMOUNT}
                      />
                      <p className="text-slate-400 text-sm">{formatPrice(selectedAmount * VND_RATE)} VND</p>
                    </div>
                    <button
                      onClick={() => setSelectedAmount(Math.min(MAX_AMOUNT, selectedAmount + 1))}
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl transition-colors disabled:opacity-50"
                      disabled={selectedAmount >= MAX_AMOUNT}
                    >
                      +
                    </button>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    value={selectedAmount}
                    onChange={(e) => setSelectedAmount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>${MIN_AMOUNT}</span>
                    <span>${MAX_AMOUNT}</span>
                  </div>
                </div>
              </div>

              {/* Discord ID Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {dp?.discordId || 'Discord User ID'} <span className="text-slate-500">({dp?.discordIdOptional || 'Optional'})</span>
                </label>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                  placeholder={dp?.discordIdPlaceholder || '123456789012345678'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  maxLength={19}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {dp?.discordIdHelp || 'Join to get the fastest support, giveaways, and exclusive offers'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{dp?.amount || 'Amount'}</span>
                  <span className="text-white font-semibold">${selectedAmount}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-400">{dp?.vnd || 'VND'}</span>
                  <span className="text-white font-semibold">{formatPrice(selectedAmount * VND_RATE)} VND</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-400">{dp?.validity || 'Validity'}</span>
                  <span className="text-white font-semibold">{dp?.validityDays || '7 days'}</span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={handleCreatePayment}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {dp?.creatingPayment || 'Creating payment...'}
                  </>
                ) : (
                  <>
                    {dp?.continueToPayment || 'Continue to Payment'}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: QR Code Display */}
          {step === 'payment' && paymentData && (
            <div className="text-center space-y-4">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl inline-block">
                <img
                  src={paymentData.qrCodeUrl}
                  alt="Payment QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Amount */}
              <div>
                <p className="text-3xl font-bold text-white">
                  {formatPrice(paymentData.amount)} VND
                </p>
                <p className="text-slate-400">
                  ${paymentData.credits.toFixed(2)} {dp?.credits || 'credits'} / {dp?.validityDays || '7 days'}
                </p>
              </div>

              {/* Timer */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                remainingSeconds < 60
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono font-medium">{formatTime(remainingSeconds)}</span>
              </div>

              {/* Instructions */}
              <div className="bg-slate-800/50 rounded-xl p-4 text-left border border-slate-700/50">
                <p className="text-sm text-slate-300 mb-2 font-medium">{dp?.instructions || 'Instructions:'}</p>
                <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                  <li>{dp?.instruction1 || 'Open your banking app'}</li>
                  <li>{dp?.instruction2 || 'Scan the QR code above'}</li>
                  <li>{dp?.instruction3 || 'Confirm the payment'}</li>
                  <li>{dp?.instruction4 || 'Wait for confirmation (auto-updates)'}</li>
                </ol>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">{dp?.waitingForPayment || 'Waiting for payment...'}</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {dp?.paymentSuccess || 'Payment Successful!'}
              </h3>
              <p className="text-slate-400 mb-6">
                {dp?.creditsAdded || 'Your credits have been added to your account.'}
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
              >
                {dp?.done || 'Done'}
              </button>
            </div>
          )}

          {/* Expired State */}
          {step === 'expired' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {dp?.paymentExpired || 'QR Code Expired'}
              </h3>
              <p className="text-slate-400 mb-6">
                {dp?.qrExpired || 'The payment session has expired. Please try again.'}
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
              >
                {dp?.generateNewQr || 'Generate New QR Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
