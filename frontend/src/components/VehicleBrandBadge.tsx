import { getBrandStyle } from '../domain/carpass/vehicleBrands'

type VehicleBrandBadgeProps = {
  marca: string
  size?: 'sm' | 'md' | 'lg'
}

export function VehicleBrandBadge({ marca, size = 'md' }: VehicleBrandBadgeProps) {
  const brand = getBrandStyle(marca)

  return (
    <span
      className={`brand-badge brand-badge--${size}`}
      style={{
        background: brand.gradient,
        boxShadow: `0 8px 24px ${brand.glow}`,
        color: brand.accent,
      }}
      aria-hidden
    >
      {brand.abbr}
    </span>
  )
}
