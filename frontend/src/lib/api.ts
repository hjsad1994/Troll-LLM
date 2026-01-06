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
  
  const response = await fetch(url, { ...options, headers })
  
  // Auto logout and redirect if token expired (401)
  if (response.status === 401) {
    localStorage.removeItem('adminToken')
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
  
  return response
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

export async function register(username: string, password: string, role: string = 'user') {
  const body: { username: string; password: string; role: string } = { username, password, role }

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
  creditsUsed: number
  credits: number
  refCredits: number
  role: string
  totalInputTokens: number
  totalOutputTokens: number
  purchasedAt: string | null
  expiresAt: string | null
  discordId: string | null
  migration: boolean
}

export interface BillingInfo {
  creditsUsed: number
  credits: number
  refCredits: number
  purchasedAt: string | null
  expiresAt: string | null
  daysUntilExpiration: number | null
  subscriptionDays: number
  isExpiringSoon: boolean
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

export async function updateDiscordId(discordId: string | null): Promise<{ success: boolean; discordId: string | null }> {
  const resp = await fetchWithAuth('/api/user/discord-id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordId })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update Discord ID')
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

export interface DetailedUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheHitTokens: number
  creditsBurned: number
  requestCount: number
}

export async function getDetailedUsage(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<DetailedUsage> {
  const resp = await fetchWithAuth(`/api/user/detailed-usage?period=${period}`)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get detailed usage')
  }
  return resp.json()
}

export interface RequestLogItem {
  id: string
  model: string
  upstream?: string
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheHitTokens: number
  creditsCost: number
  latencyMs: number
  isSuccess: boolean
  createdAt: string
}

export interface RequestLogsResponse {
  requests: RequestLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getRequestLogs(
  period: '1h' | '24h' | '7d' | '30d' = '24h',
  page: number = 1,
  limit: number = 50
): Promise<RequestLogsResponse> {
  const resp = await fetchWithAuth(`/api/user/request-logs?period=${period}&page=${page}&limit=${limit}`)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get request logs')
  }
  return resp.json()
}

// Admin User Management

export interface AdminUser {
  _id: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  lastActivity?: string
  apiKey?: string
  apiKeyCreatedAt?: string
  creditsUsed: number
  totalInputTokens: number
  totalOutputTokens: number
  credits: number
  refCredits: number
  creditsBurned: number
  purchasedAt?: string
  expiresAt?: string
  discordId?: string
}


export interface UsersResponse {
  users: AdminUser[]
  stats: {
    total: number
    activeUsers: number
  }
}

export interface RateLimitMetrics {
  total_429: number
  user_key_429: number
  friend_key_429: number
  period: string
  timestamp: string
}

export async function getRateLimitMetrics(period: string = 'all'): Promise<RateLimitMetrics> {
  const resp = await fetchWithAuth(`/admin/metrics/rate-limit?period=${period}`)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get rate limit metrics')
  }
  return resp.json()
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


export async function updateUserCredits(username: string, credits: number, resetExpiration: boolean = true): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/credits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credits, resetExpiration })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update user credits')
  }
  return resp.json()
}

export async function updateUserRefCredits(username: string, refCredits: number): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/refCredits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refCredits })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update user refCredits')
  }
  return resp.json()
}

export async function updateUserDiscordId(username: string, discordId: string | null): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/discord-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordId })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update user Discord ID')
  }
  return resp.json()
}

export async function addUserCredits(username: string, amount: number, resetExpiration: boolean = true): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/credits/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, resetExpiration })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to add user credits')
  }
  return resp.json()
}

export async function addUserRefCredits(username: string, amount: number): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/refCredits/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to add user refCredits')
  }
  return resp.json()
}

export async function setUserCreditPackage(username: string, pkg: '20' | '40'): Promise<{ success: boolean; message: string; user: { username: string; credits: number; expiresAt: string } }> {
  const resp = await fetchWithAuth(`/admin/users/${encodeURIComponent(username)}/credit-package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: pkg })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to set token package')
  }
  return resp.json()
}

export interface ModelStats {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  creditsBurned: number
  requestCount: number
}

export interface ModelStatsResponse {
  models: ModelStats[]
  period: string
}

export async function getModelStats(period: string = 'all'): Promise<ModelStatsResponse> {
  const resp = await fetchWithAuth(`/admin/model-stats?period=${period}`)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get model stats')
  }
  return resp.json()
}

// Payment
export interface TokenPackage {
  id: string
  name: string
  price: number
  tokens: number
  days: number
  currency: string
  features: string[]
}

export interface CheckoutResponse {
  paymentId: string
  orderCode: string
  qrCodeUrl: string
  amount: number
  credits: number
  expiresAt: string
}

export interface PaymentStatusResponse {
  status: 'pending' | 'success' | 'failed' | 'expired'
  remainingSeconds: number
  completedAt?: string
}

export interface PaymentHistoryItem {
  id: string
  orderCode: string
  amount: number
  status: string
  createdAt: string
  completedAt?: string
}

export async function getTokenPackages(): Promise<{ packages: TokenPackage[] }> {
  const resp = await fetch('/api/payment/packages')
  if (!resp.ok) {
    throw new Error('Failed to get token packages')
  }
  return resp.json()
}

export async function createCheckout(credits: string | number, discordId?: string): Promise<CheckoutResponse> {
  const resp = await fetchWithAuth('/api/payment/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credits, discordId })
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

// Friend Key API
export interface ModelLimit {
  modelId: string
  limitUsd: number
  usedUsd: number
  enabled: boolean
}

export interface FriendKeyInfo {
  friendKey: string
  isActive: boolean
  createdAt: string
  rotatedAt?: string
  modelLimits: ModelLimit[]
  totalUsedUsd: number
  requestsCount: number
  lastUsedAt?: string
  hasKey: boolean
}

export interface ModelUsage {
  modelId: string
  modelName: string
  limitUsd: number
  usedUsd: number
  remainingUsd: number
  usagePercent: number
  isExhausted: boolean
  enabled: boolean
}

export interface CreateFriendKeyResponse {
  friendKey: string
  message: string
}

export async function getFriendKey(): Promise<FriendKeyInfo | null> {
  const resp = await fetchWithAuth('/api/user/friend-key')
  if (resp.status === 404) {
    return null
  }
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get friend key')
  }
  return resp.json()
}

export async function getFullFriendKey(): Promise<string> {
  const resp = await fetchWithAuth('/api/user/friend-key/reveal')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get friend key')
  }
  const data = await resp.json()
  return data.friendKey
}

export async function createFriendKey(): Promise<CreateFriendKeyResponse> {
  const resp = await fetchWithAuth('/api/user/friend-key', { method: 'POST' })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to create friend key')
  }
  return resp.json()
}

export async function rotateFriendKey(): Promise<CreateFriendKeyResponse> {
  const resp = await fetchWithAuth('/api/user/friend-key/rotate', { method: 'POST' })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to rotate friend key')
  }
  return resp.json()
}

export async function deleteFriendKey(): Promise<{ success: boolean; message: string }> {
  const resp = await fetchWithAuth('/api/user/friend-key', { method: 'DELETE' })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to delete friend key')
  }
  return resp.json()
}

export async function updateFriendKeyLimits(modelLimits: { modelId: string; limitUsd: number; enabled?: boolean }[]): Promise<FriendKeyInfo> {
  const resp = await fetchWithAuth('/api/user/friend-key/limits', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelLimits })
  })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to update friend key limits')
  }
  return resp.json()
}

export async function getFriendKeyUsage(): Promise<{ models: ModelUsage[] }> {
  const resp = await fetchWithAuth('/api/user/friend-key/usage')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get friend key usage')
  }
  return resp.json()
}

export async function getFriendKeyActivity(params?: { page?: number; limit?: number }): Promise<RequestHistoryResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())

  const url = `/api/user/friend-key/activity${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  const resp = await fetchWithAuth(url)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get friend key activity')
  }
  return resp.json()
}

// Models API
export interface ModelConfig {
  id: string
  name: string
  type: string
  inputPricePerMTok: number
  outputPricePerMTok: number
}

export async function getAvailableModels(): Promise<{ models: ModelConfig[] }> {
  const resp = await fetch('/api/models')
  if (!resp.ok) {
    throw new Error('Failed to get models')
  }
  return resp.json()
}

// Migration API
export interface MigrationResult {
  success: boolean
  oldCredits: number
  newCredits: number
  message: string
}

export async function migrateCredits(): Promise<MigrationResult> {
  const resp = await fetchWithAuth('/api/user/migrate', { method: 'POST' })
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Migration failed')
  }
  return resp.json()
}


