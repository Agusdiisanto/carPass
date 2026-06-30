import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeImageProps = {
  value: string
  size?: number
  label?: string
  onDataUrl?: (dataUrl: string) => void
}

export function QrCodeImage({ value, size = 200, label = 'Codigo QR', onDataUrl }: QrCodeImageProps) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!value) {
      setSrc('')
      onDataUrl?.('')
      return
    }

    let cancelled = false
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: '#042f2e', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (cancelled) return
        setSrc(dataUrl)
        onDataUrl?.(dataUrl)
      })
      .catch(() => {
        if (cancelled) return
        setSrc('')
        onDataUrl?.('')
      })
    return () => {
      cancelled = true
    }
  }, [value, size, onDataUrl])

  if (!src) {
    return <div className="qr-code-image qr-code-image--loading" style={{ width: size, height: size }} aria-hidden />
  }

  return (
    <img
      src={src}
      alt={label}
      className="qr-code-image"
      width={size}
      height={size}
      decoding="async"
    />
  )
}
