import { getSession } from '../auth/session'

const rawApiUrl = String(import.meta.env.VITE_API_URL ?? '').trim()

function normalizeApiUrl(value: string) {
  const base = (value || '/api').replace(/\/+$/, '')
  if (base === 'https://b612api.bytecore.tech/api') return 'https://b612api.bytecore.tech/api/v1'
  return base
}

const API_URL = normalizeApiUrl(rawApiUrl)

function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const session = getSession()
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.sessionToken}` } : {}),
      ...options?.headers,
    },
  })
  if (!response.ok) {
    let message = `API request failed: ${response.status}`
    const body = await response.text()
    if (body) {
      try {
        const payload = JSON.parse(body)
        message = payload.message ?? message
      } catch {
        message = body
      }
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
