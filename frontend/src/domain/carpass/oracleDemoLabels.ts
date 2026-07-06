import { keccak256, toUtf8Bytes } from 'ethers'

function textHash(value: string) {
  return keccak256(toUtf8Bytes(value)).toLowerCase()
}

type OracleDemoLabel = {
  title: string
  summary: string
}

const ATTESTATION_BY_EXTERNAL_ID: Record<string, OracleDemoLabel> = {
  [textHash('VTV-HONDA-CIVIC-2026-APROBADA')]: {
    title: 'VTV aprobada',
    summary: 'Planta VTV Demo certifica aprobación vigente para Honda Civic 2022.',
  },
  [textHash('AUTOPARTES-HONDA-CIVIC-2026-GRABADAS')]: {
    title: 'Autopartes grabadas',
    summary: 'Proveedor Demo certifica 6 autopartes grabadas para Honda Civic 2022.',
  },
  [textHash('VTV-CRUZE-2026-OBSERVADA')]: {
    title: 'VTV con observaciones',
    summary: 'Planta VTV Demo certifica VTV con observaciones para Chevrolet Cruze 2019.',
  },
}

const ATTESTATION_BY_PAYLOAD: Record<string, OracleDemoLabel> = {
  [textHash('Planta VTV Demo certifica aprobacion vigente Honda Civic 2022')]: {
    title: 'VTV aprobada',
    summary: 'Planta VTV Demo certifica aprobación vigente para Honda Civic 2022.',
  },
  [textHash('Proveedor Demo certifica 6 autopartes grabadas para Honda Civic 2022')]: {
    title: 'Autopartes grabadas',
    summary: 'Proveedor Demo certifica 6 autopartes grabadas para Honda Civic 2022.',
  },
  [textHash('Planta VTV Demo certifica VTV con observaciones para Chevrolet Cruze 2019')]: {
    title: 'VTV con observaciones',
    summary: 'Planta VTV Demo certifica VTV con observaciones para Chevrolet Cruze 2019.',
  },
}

const BATCH_BY_METADATA: Record<string, OracleDemoLabel> = {
  [textHash('Batch Merkle Demo: 6 autopartes grabadas Honda Civic 2022')]: {
    title: '6 autopartes grabadas',
    summary: 'Lote resumido con motor, caja, puertas, capot y baúl.',
  },
}

export function resolveDemoAttestationLabel(externalIdHash: string, payloadHash: string): OracleDemoLabel | null {
  const externalKey = externalIdHash.toLowerCase()
  const payloadKey = payloadHash.toLowerCase()
  return ATTESTATION_BY_EXTERNAL_ID[externalKey] ?? ATTESTATION_BY_PAYLOAD[payloadKey] ?? null
}

export function resolveDemoBatchLabel(metadataHash: string): OracleDemoLabel | null {
  return BATCH_BY_METADATA[metadataHash.toLowerCase()] ?? null
}
