export type BrandStyle = {
  abbr: string
  iconSlug?: string
  gradient: string
  accent: string
  glow: string
}

const DEFAULT_BRAND: BrandStyle = {
  abbr: '?',
  gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  accent: '#94a3b8',
  glow: 'rgba(148, 163, 184, 0.35)',
}

export const BRAND_STYLES: Record<string, BrandStyle> = {
  Honda: {
    abbr: 'H',
    iconSlug: 'honda',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #991b1b 100%)',
    accent: '#fca5a5',
    glow: 'rgba(220, 38, 38, 0.4)',
  },
  Ford: {
    abbr: 'F',
    iconSlug: 'ford',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #1d4ed8 100%)',
    accent: '#93c5fd',
    glow: 'rgba(37, 99, 235, 0.4)',
  },
  Chevrolet: {
    abbr: 'C',
    iconSlug: 'chevrolet',
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #d97706 100%)',
    accent: '#fde68a',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  Toyota: {
    abbr: 'T',
    iconSlug: 'toyota',
    gradient: 'linear-gradient(135deg, #111827 0%, #374151 50%, #1f2937 100%)',
    accent: '#e5e7eb',
    glow: 'rgba(229, 231, 235, 0.25)',
  },
  Renault: {
    abbr: 'R',
    iconSlug: 'renault',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 55%, #1d4ed8 100%)',
    accent: '#bfdbfe',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
}

export function getBrandStyle(marca: string): BrandStyle {
  return BRAND_STYLES[marca] ?? {
    ...DEFAULT_BRAND,
    abbr: marca.slice(0, 1).toUpperCase() || '?',
  }
}

export function getBrandIconSlug(marca: string): string | undefined {
  return BRAND_STYLES[marca]?.iconSlug
}
