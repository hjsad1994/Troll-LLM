export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const token = localStorage.getItem('adminToken')
  const credentials = localStorage.getItem('adminCredentials')
  
  if (token) return { 'X-Session-Token': token }
  if (credentials) return { 'Authorization': `Basic ${credentials}` }
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
  localStorage.setItem('adminCredentials', btoa(`${username}:${password}`))
  return data
}

export function logout() {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminCredentials')
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!(localStorage.getItem('adminToken') || localStorage.getItem('adminCredentials'))
}

export function formatNumber(n: number): string {
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
