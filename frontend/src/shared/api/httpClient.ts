const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    let message = `API request failed: ${response.status}`
    try {
      const payload = await response.json()
      message = payload.message ?? message
    } catch {
      message = await response.text() || message
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
