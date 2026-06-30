import { useState } from 'react'
import { getBrandIconSlug, getBrandStyle } from '../domain/carpass/vehicleBrands'
import { VehicleBrandBadge } from './VehicleBrandBadge'

/** CDN con color — más estable que el paquete npm en jsdelivr. */
function brandIconUrl(slug: string, color = 'ffffff') {
  return `https://cdn.simpleicons.org/${slug}/${color}`
}

type BrandLogoProps = {
  marca: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  variant?: 'badge' | 'mark' | 'watermark'
}

export function BrandLogo({ marca, size = 'md', className, variant = 'badge' }: BrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const slug = getBrandIconSlug(marca)
  const brand = getBrandStyle(marca)

  if (variant === 'watermark') {
    if (!slug || failed) {
      return (
        <span className={`brand-watermark brand-watermark--${size} ${className ?? ''}`} aria-hidden>
          <span className="brand-watermark__fallback" style={{ color: brand.accent }}>
            {brand.abbr}
          </span>
        </span>
      )
    }
    return (
      <span className={`brand-watermark brand-watermark--${size} ${className ?? ''}`} aria-hidden>
        <img
          src={brandIconUrl(slug)}
          alt=""
          className="brand-watermark__img"
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </span>
    )
  }

  if (!slug || failed) {
    return <VehicleBrandBadge marca={marca} size={size} />
  }

  if (variant === 'mark') {
    return (
      <span className={`brand-mark-slot brand-mark-slot--${size} ${className ?? ''}`}>
        <img
          src={brandIconUrl(slug)}
          alt=""
          className="brand-mark-slot__img"
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </span>
    )
  }

  return (
    <span className={`brand-logo-wrap brand-logo-wrap--${size} ${className ?? ''}`}>
      <img
        src={brandIconUrl(slug)}
        alt=""
        className="brand-logo-img"
        onError={() => setFailed(true)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  )
}
