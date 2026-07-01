import { getSession } from '../auth/session'

const API_URL = (String(import.meta.env.VITE_API_URL ?? '').trim() || '/api').replace(/\/+$/, '')

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
