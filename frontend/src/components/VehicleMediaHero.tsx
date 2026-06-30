import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getBrandStyle } from '../domain/carpass/vehicleBrands'
import { getVehicleMediaDisclaimer } from '../domain/carpass/vehicleMedia'
import { BrandLogo } from './BrandLogo'

type VehicleMediaHeroProps = {
  marca: string
  modelo?: string
  anio?: number | string
  imageUrl?: string
  sealLabel?: string
  sealClassName?: string
  compact?: boolean
  loading?: boolean
}

export function VehicleMediaHero({
  marca,
  modelo,
  anio,
  imageUrl,
  sealLabel,
  sealClassName,
  compact = false,
  loading = false,
}: VehicleMediaHeroProps) {
  const brand = getBrandStyle(marca)
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = Boolean(imageUrl) && !photoFailed
  const disclaimer =
    showPhoto && modelo && anio !== undefined
      ? getVehicleMediaDisclaimer({ marca, modelo, anio })
      : showPhoto
        ? 'Imagen ilustrativa del modelo publicado. No corresponde al vehiculo registrado en este VIN.'
        : null

  useEffect(() => {
    setPhotoFailed(false)
  }, [imageUrl])

  return (
    <div
      className={[
        'vehicle-media-hero',
        compact ? 'vehicle-media-hero--compact' : '',
        showPhoto ? 'vehicle-media-hero--photo' : '',
        loading ? 'vehicle-media-hero--loading' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--brand-gradient': brand.gradient } as CSSProperties}
    >
      {imageUrl && !photoFailed ? (
        <img
          src={imageUrl}
          alt={disclaimer ?? ''}
          className="vehicle-media-hero__photo"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onError={() => setPhotoFailed(true)}
        />
      ) : null}
      <div className="vehicle-media-hero__overlay" aria-hidden />
      <div className="vehicle-media-hero__watermark" aria-hidden>
        <BrandLogo marca={marca} size="lg" variant="watermark" />
      </div>
      <div className="vehicle-media-hero__content">
        <div className="vehicle-media-hero__brand" aria-hidden>
          <BrandLogo marca={marca} size="sm" variant="mark" />
        </div>
        {sealLabel ? (
          <span className={`vehicle-media-hero__seal ${sealClassName ?? ''}`}>{sealLabel}</span>
        ) : null}
      </div>
      {disclaimer ? (
        <p className="vehicle-media-hero__disclaimer">{disclaimer}</p>
      ) : null}
    </div>
  )
}
