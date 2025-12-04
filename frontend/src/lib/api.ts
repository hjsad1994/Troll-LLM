export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const token = localStorage.getItem('adminToken')
  
  if (token) return { 'Authorization': `Bearer ${token}` }
  return {}
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  }
  
  return fetch(url, { ...options, headers })
}

export async function login(username: string, password: string) {
  const resp = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Login failed')
  }
  
  const data = await resp.json()
  localStorage.setItem('adminToken', data.token)
  return data
}

export function logout() {
  localStorage.removeItem('adminToken')
}

export async function register(username: string, password: string, role: string = 'user', ref?: string) {
  const body: { username: string; password: string; role: string; ref?: string } = { username, password, role }
  if (ref) {
    body.ref = ref
  }
  
  const resp = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Registration failed')
  }
  
  const data = await resp.json()
  localStorage.setItem('adminToken', data.token)
  return data
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('adminToken')
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function maskKey(key: string): string {
  if (!key || key.length < 10) return '***'
  return key.substring(0, 7) + '***' + key.substring(key.length - 3)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

export interface UserProfile {
  username: string
  apiKey: string
  apiKeyCreatedAt: string
  plan: string
  tokensUsed: number
  monthlyTokensUsed: number
  monthlyResetDate: string
  role: string
  credits: number
  refCredits: number
  totalInputTokens: number
  totalOutputTokens: number
}

export interface BillingInfo {
  plan: string
  planLimits: { monthlyTokens: number; rpm: number }
  tokensUsed: number
  monthlyTokensUsed: number
  monthlyTokensLimit: number
  monthlyResetDate: string
  usagePercentage: number
  planStartDate: string | null
  planExpiresAt: string | null
  daysUntilExpiration: number | null
  isExpiringSoon: boolean
  credits: number
}

export async function getUserProfile(): Promise<UserProfile> {
  const resp = await fetchWithAuth('/api/user/me')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get profile')
  }
  return resp.json()
}

export async function getFullApiKey(): Promise<string> {
  const resp = await fetchWithAuth('/api/user/api-key')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get API key')
  }
  const data = await resp.json()
  return data.apiKey
}

export async function rotateApiKey(): Promise<{ newApiKey: string; createdAt: string }> {
  const resp = await fetchWithAuth('/api/user/api-key/rotate', { method: 'POST' })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to rotate API key')
  }
  return resp.json()
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const resp = await fetchWithAuth('/api/user/billing')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get billing info')
  }
  return resp.json()
}

export interface CreditsUsage {
  last1h: number
  last24h: number
  last7d: number
  last30d: number
}

export async function getCreditsUsage(): Promise<CreditsUsage> {
  const resp = await fetchWithAuth('/api/user/credits-usage')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get credits usage')
  }
  return resp.json()
}

// Admin User Management
export type UserPlan = 'free' | 'dev' | 'pro'

export interface AdminUser {
  _id: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  apiKey?: string
  apiKeyCreatedAt?: string
  plan: UserPlan
  tokensUsed: number
  totalInputTokens: number
  totalOutputTokens: number
  monthlyTokensUsed: number
  monthlyResetDate?: string
  credits: number
  creditsBurned: number
}

export interface PlanLimits {
  monthlyTokens: number
  rpm: number
  valueUsd: number
}

export interface UsersResponse {
  users: AdminUser[]
  stats: {
    total: number
    byPlan: Record<string, number>
  }
  planLimits: Record<UserPlan, PlanLimits>
}

export async function getAdminUsers(search?: string): Promise<UsersResponse> {
  const url = search ? `/admin/users?search=${encodeURIComponent(search)}` : '/admin/users'
  const resp = await fetchWithAuth(url)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get users')
  }
  return resp.json()
}

export async function updateUserPlan(username: string, plan: UserPlan): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update user plan')
  }
  return resp.json()
}

export async function updateUserCredits(username: string, credits: number): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/credits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credits })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update user credits')
  }
  return resp.json()
}

// Payment
export interface PaymentPlan {
  id: string
  name: string
  price: number
  credits: number
  currency: string
  features: string[]
}

export interface CheckoutResponse {
  paymentId: string
  orderCode: string
  qrCodeUrl: string
  amount: number
  plan: string
  expiresAt: string
}

export interface PaymentStatusResponse {
  status: 'pending' | 'success' | 'failed' | 'expired'
  remainingSeconds: number
  plan?: string
  completedAt?: string
}

export interface PaymentHistoryItem {
  id: string
  orderCode: string
  plan: string
  amount: number
  status: string
  createdAt: string
  completedAt?: string
}

export async function getPaymentPlans(): Promise<{ plans: PaymentPlan[] }> {
  const resp = await fetch('/api/payment/plans')
  if (!resp.ok) {
    throw new Error('Failed to get payment plans')
  }
  return resp.json()
}

export async function createCheckout(plan: 'dev' | 'pro', discordId?: string): Promise<CheckoutResponse> {
  const resp = await fetchWithAuth('/api/payment/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, discordId })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to create checkout')
  }
  return resp.json()
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  const resp = await fetchWithAuth(`/api/payment/${paymentId}/status`)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get payment status')
  }
  return resp.json()
}

export async function getPaymentHistory(): Promise<{ payments: PaymentHistoryItem[] }> {
  const resp = await fetchWithAuth('/api/payment/history')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get payment history')
  }
  return resp.json()
}

// PayPal Payment
export interface PayPalCreateResponse {
  orderId: string
  paymentId: string
}

export interface PayPalCaptureResponse {
  success: boolean
  plan: string
  captureId?: string
}

export async function getPayPalClientId(): Promise<string> {
  const resp = await fetch('/api/payment/paypal/client-id')
  if (!resp.ok) {
    throw new Error('PayPal not configured')
  }
  const data = await resp.json()
  return data.clientId
}

export async function createPayPalOrder(plan: 'pro', discordId?: string): Promise<PayPalCreateResponse> {
  const resp = await fetchWithAuth('/api/payment/paypal/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, discordId })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to create PayPal order')
  }
  return resp.json()
}

export async function capturePayPalOrder(orderID: string): Promise<PayPalCaptureResponse> {
  const resp = await fetchWithAuth('/api/payment/paypal/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderID })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to capture PayPal payment')
  }
  return resp.json()
}

// Request History
export interface RequestLogEntry {
  _id: string
  userId?: string
  userKeyId: string
  factoryKeyId: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  cacheWriteTokens?: number
  cacheHitTokens?: number
  creditsCost?: number
  tokensUsed: number
  statusCode: number
  latencyMs?: number
  isSuccess: boolean
  createdAt: string
}

export interface RequestHistoryResponse {
  requests: RequestLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getRequestHistory(params?: {
  page?: number
  limit?: number
  from?: string
  to?: string
}): Promise<RequestHistoryResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.from) searchParams.set('from', params.from)
  if (params?.to) searchParams.set('to', params.to)

  const url = `/api/user/request-history${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  const resp = await fetchWithAuth(url)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get request history')
  }
  return resp.json()
}

// Referral API
export interface ReferralInfo {
  referralCode: string
  referralLink: string
  refCredits: number
}

export interface ReferralStats {
  totalReferrals: number
  successfulReferrals: number
  totalRefCreditsEarned: number
  currentRefCredits: number
}

export interface ReferredUser {
  username: string
  status: 'registered' | 'paid'
  plan: string | null
  bonusEarned: number
  createdAt: string
}

export async function getReferralInfo(): Promise<ReferralInfo> {
  const resp = await fetchWithAuth('/api/user/referral')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get referral info')
  }
  return resp.json()
}

export async function getReferralStats(): Promise<ReferralStats> {
  const resp = await fetchWithAuth('/api/user/referral/stats')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get referral stats')
  }
  return resp.json()
}

export async function getReferredUsers(): Promise<{ users: ReferredUser[] }> {
  const resp = await fetchWithAuth('/api/user/referral/list')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get referred users')
  }
  return resp.json()
}
