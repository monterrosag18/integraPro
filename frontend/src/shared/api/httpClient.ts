import { getSession } from '../auth/session'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const session = getSession()
  const response = await fetch(`${API_URL}${path}`, {
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
