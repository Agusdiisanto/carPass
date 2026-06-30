import { isLocalDevHost } from './lanHost'

const SESSION_KEY = 'carpass_public_app_url'

function normalizePublicAppUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (isLocalDevHost(url.hostname)) return null
    return url.origin + url.pathname.replace(/\/$/, '')
  } catch {
    return null
  }
}

/** URL publica del deploy (Vercel, etc.). Obligatoria para companion desde localhost. */
export function getConfiguredPublicAppUrl(): string | null {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof configured !== 'string') return null
  return normalizePublicAppUrl(configured)
}

export function getSessionPublicAppUrl(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return normalizePublicAppUrl(raw)
  } catch {
    return null
  }
}

export function setSessionPublicAppUrl(raw: string): string | null {
  const normalized = normalizePublicAppUrl(raw)
  if (!normalized) return null
  try {
    sessionStorage.setItem(SESSION_KEY, normalized)
  } catch {
    return null
  }
  return normalized
}

export function clearSessionPublicAppUrl(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // sessionStorage no disponible.
  }
}

export function getEffectivePublicAppUrl(): string | null {
  return getConfiguredPublicAppUrl() ?? getSessionPublicAppUrl()
}

export function getPublicAppOrigin(): string {
  const configured = getEffectivePublicAppUrl()
  if (configured) return new URL(configured).origin
  return window.location.origin
}

export function isCompanionUrlReachable(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return !isLocalDevHost(parsed.hostname)
  } catch {
    return false
  }
}
