import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeImageProps = {
  value: string
  size?: number
  label?: string
}

export function QrCodeImage({ value, size = 200, label = 'Codigo QR' }: QrCodeImageProps) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!value) {
      setSrc('')
      return
    }

    let cancelled = false
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: '#042f2e', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc('')
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

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
