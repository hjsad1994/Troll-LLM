'use client'

import { useState, useEffect, useCallback } from 'react'
import { createCheckout, getPaymentStatus, isAuthenticated } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  package: '6m' | '12m'
  onSuccess?: () => void
}

export default function PaymentModal({ isOpen, onClose, package: pkg, onSuccess }: PaymentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discordId, setDiscordId] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    paymentId: string
    qrCodeUrl: string
    amount: number
    credits: number
    orderCode: string
    expiresAt: string
  } | null>(null)
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'expired'>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const packageInfo = {
    '6m': { name: '6M Tokens', price: 20000, tokens: 6000000 },
    '12m': { name: '12M Tokens', price: 40000, tokens: 12000000 },
  }

  const initCheckout = useCallback(async () => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    // Validate Discord ID if provided
    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      setError('Invalid Discord ID format. Must be 17-19 digits.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await createCheckout(pkg, discordId || undefined)
      setPaymentData({
        paymentId: data.paymentId,
        qrCodeUrl: data.qrCodeUrl,
        amount: data.amount,
        credits: data.credits,
        orderCode: data.orderCode,
        expiresAt: data.expiresAt,
      })
      setStatus('pending')
      setShowQR(true)
      const expiresAt = new Date(data.expiresAt)
      setRemainingSeconds(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout')
    } finally {
      setLoading(false)
    }
  }, [pkg, discordId, router])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowQR(false)
      setStatus('idle')
      setPaymentData(null)
      setError(null)
      setDiscordId('')
    }
  }, [isOpen])

  // Poll payment status
  useEffect(() => {
    if (!paymentData || status !== 'pending') return

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getPaymentStatus(paymentData.paymentId)
        setRemainingSeconds(statusData.remainingSeconds)

        if (statusData.status === 'success') {
          setStatus('success')
          clearInterval(pollInterval)
          onSuccess?.()
        } else if (statusData.status === 'expired') {
          setStatus('expired')
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Failed to poll status:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [paymentData, status, onSuccess])

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending' || remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, remainingSeconds])

  const handleClose = () => {
    setPaymentData(null)
    setStatus('idle')
    setShowQR(false)
    setError(null)
    setDiscordId('')
    onClose()
  }

  const handleRetry = () => {
    setPaymentData(null)
    setStatus('idle')
    setShowQR(false)
    setError(null)
  }

  const handleProceed = () => {
    initCheckout()
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
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {status === 'success' ? 'Payment Successful!' : `Buy ${packageInfo[pkg].name}`}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Discord ID Input */}
          {!showQR && status === 'idle' && (
            <div>
              {/* Package Summary */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selected Package</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{packageInfo[pkg].name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(packageInfo[pkg].price)} VND
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(packageInfo[pkg].tokens / 1000000).toFixed(0)}M tokens / 7 days</p>
                  </div>
                </div>
              </div>

              {/* Discord ID Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord User ID <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789012345678"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={19}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Enter your Discord User ID to automatically receive role after payment.
                  <a 
                    href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:underline ml-1"
                  >
                    How to find your ID?
                  </a>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Proceed Button */}
              <button
                onClick={handleProceed}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating payment...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: QR Code Display */}
          {showQR && status === 'pending' && paymentData && (
            <div className="text-center">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <img 
                  src={paymentData.qrCodeUrl} 
                  alt="Payment QR Code" 
                  className="w-48 h-48"
                />
              </div>

              {/* Amount */}
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(paymentData.amount)} VND
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  ${paymentData.credits.toFixed(2)} credits / 7 days
                </p>
              </div>

              {/* Timer */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                remainingSeconds < 60 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono font-medium">{formatTime(remainingSeconds)}</span>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-left">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Instructions:</strong>
                </p>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Open your banking app</li>
                  <li>Scan the QR code above</li>
                  <li>Confirm the payment</li>
                  <li>Wait for confirmation (auto-updates)</li>
                </ol>
              </div>

              {/* Status indicator */}
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Waiting for payment...</span>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You have received <strong>{packageInfo[pkg].name}</strong>
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                QR Code Expired
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The payment session has expired. Please try again.
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
              >
                Generate New QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
