import { useEffect, useState } from 'react'
import { discoverLanIpv4, isLocalDevHost } from '../lib/lanHost'

export function useLanHost() {
  const isLocalDev = isLocalDevHost()
  const [lanIp, setLanIp] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(isLocalDev)

  useEffect(() => {
    if (!isLocalDev) {
      setDiscovering(false)
      return
    }

    let cancelled = false
    setDiscovering(true)

    void discoverLanIpv4().then((ip) => {
      if (cancelled) return
      setLanIp(ip)
      setDiscovering(false)
    })

    return () => {
      cancelled = true
    }
  }, [isLocalDev])

  return { isLocalDev, lanIp, discovering }
}
