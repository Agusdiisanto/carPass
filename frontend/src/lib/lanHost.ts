/** IPv4 privada RFC1918 — usable en la misma WiFi. */
export function isPrivateIpv4(ip: string): boolean {
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('10.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  return false
}

export function isLocalDevHost(hostname = window.location.hostname): boolean {
  if (isPrivateIpv4(hostname)) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function pickLanIpv4(candidates: Iterable<string>): string | null {
  const privateIps = [...candidates].filter(isPrivateIpv4)
  if (privateIps.length === 0) return null

  return (
    privateIps.find((ip) => ip.startsWith('192.168.')) ??
    privateIps.find((ip) => ip.startsWith('10.')) ??
    privateIps[0]
  )
}

const SESSION_LAN_KEY = 'carpass_dev_lan_host'

function getSessionDevLanHost(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_LAN_KEY)
    if (!raw) return null
    return isPrivateIpv4(raw) ? raw : null
  } catch {
    return null
  }
}

export function setSessionDevLanHost(ip: string): string | null {
  const trimmed = ip.trim()
  if (!isPrivateIpv4(trimmed)) return null
  try {
    sessionStorage.setItem(SESSION_LAN_KEY, trimmed)
  } catch {
    return null
  }
  return trimmed
}

function getConfiguredDevLanHost(): string | null {
  const configured = import.meta.env.VITE_DEV_LAN_HOST
  if (typeof configured === 'string' && configured.trim()) {
    const ip = configured.trim()
    if (isPrivateIpv4(ip)) return ip
  }
  return getSessionDevLanHost()
}

/** Obtiene IPv4 local privada via ICE (solo redes LAN, nunca IP publica). */
export function discoverLanIpv4(): Promise<string | null> {
  const fromEnv = getConfiguredDevLanHost()
  if (fromEnv) return Promise.resolve(fromEnv)

  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    const ips = new Set<string>()
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      pc.onicecandidate = null
      pc.close()
      resolve(pickLanIpv4(ips) ?? getConfiguredDevLanHost())
    }

    pc.createDataChannel('carpass-lan')
    pc.onicecandidate = (event) => {
      const candidate = event.candidate?.candidate
      if (!candidate) {
        finish()
        return
      }
      const match = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/)
      if (match && isPrivateIpv4(match[1])) ips.add(match[1])
    }

    void pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(finish)
    window.setTimeout(finish, 2500)
  })
}

export function replaceHostnameInUrl(url: string, hostname: string): string {
  const next = new URL(url)
  next.hostname = hostname
  return next.toString()
}

export function buildLanDevUrl(pathAndQuery = '/'): string | null {
  if (typeof window === 'undefined') return null
  const port = window.location.port || '5173'
  const lanHost = getConfiguredDevLanHost()
  if (!lanHost) return null
  const url = new URL(pathAndQuery, `http://${lanHost}:${port}`)
  return url.toString()
}
