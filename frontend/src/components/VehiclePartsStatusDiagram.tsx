import { useEffect, useState } from 'react'
import { tipoParteLabel, type Parte } from '../domain/carpass/vehicleParts'
import { getPartesVehiculo, hasContractAddress } from '../hooks/useVehicleParts'

type Status = 'loading' | 'sin-datos' | 'original' | 'reemplazada'

const STATUS_COLOR: Record<Status, string> = {
  loading: '#6b7280',
  'sin-datos': '#9ca3af',
  original: '#4ade80',
  reemplazada: '#facc15',
}

const STATUS_LABEL: Record<Status, string> = {
  loading: 'Consultando autopartes...',
  'sin-datos': 'Autopartes no registradas todavía',
  original: 'Todas las autopartes grabadas son originales',
  reemplazada: 'Tiene autopartes grabadas reemplazadas',
}

function CarSilhouette({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 220 100" width="100%" className="vps-car" aria-hidden role="img">
      <ellipse cx="110" cy="88" rx="95" ry="6" fill="rgba(0,0,0,0.25)" />
      <path
        d="M20 70 Q15 45 45 40 L65 18 Q75 12 95 12 L135 12 Q150 12 160 22 L180 40 Q205 44 200 70 Z"
        fill={color}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2"
      />
      <path d="M70 38 L80 20 Q86 16 96 16 L120 16 Q128 16 134 22 L146 38 Z" fill="rgba(15,23,42,0.35)" />
      <circle cx="60" cy="74" r="16" fill="#1f2937" />
      <circle cx="60" cy="74" r="7" fill="#9ca3af" />
      <circle cx="160" cy="74" r="16" fill="#1f2937" />
      <circle cx="160" cy="74" r="7" fill="#9ca3af" />
    </svg>
  )
}

export function VehiclePartsStatusDiagram({ tokenId }: { tokenId: bigint }) {
  const [status, setStatus] = useState<Status>('loading')
  const [partes, setPartes] = useState<Parte[]>([])

  useEffect(() => {
    if (!hasContractAddress) {
      setStatus('sin-datos')
      return
    }

    let cancelled = false
    setStatus('loading')

    getPartesVehiculo(tokenId)
      .then((result) => {
        if (cancelled) return
        setPartes(result)
        const registradas = result.some((parte) => parte.numeroGrabado.trim().length > 0)
        if (!registradas) {
          setStatus('sin-datos')
          return
        }
        setStatus(result.some((parte) => parte.reemplazada) ? 'reemplazada' : 'original')
      })
      .catch(() => {
        if (!cancelled) setStatus('sin-datos')
      })

    return () => {
      cancelled = true
    }
  }, [tokenId])

  const reemplazadas = partes.filter((parte) => parte.reemplazada)

  return (
    <div className={`vps vps--${status}`}>
      <CarSilhouette color={STATUS_COLOR[status]} />
      <p className="vps-label">{STATUS_LABEL[status]}</p>
      {status === 'reemplazada' && reemplazadas.length > 0 ? (
        <p className="vps-detail">{reemplazadas.map((parte) => tipoParteLabel(parte.tipo)).join(', ')}</p>
      ) : null}
    </div>
  )
}
