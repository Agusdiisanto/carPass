import {
  formatOracleDate,
  formatOracleValidity,
  oracleEvidenceModeLabel,
  oracleAddressLabel,
  oracleKindLabel,
  oracleStatusClass,
  oracleStatusLabel,
  shortHash,
  usefulOracleSources,
  type OracleEvidenceItem,
} from '../domain/carpass/oracleEvidence'
import { useOracleEvidence } from '../hooks/useOracleEvidence'

type OracleEvidencePanelProps = {
  tokenId: bigint
}

function OracleEvidenceRow({ item }: { item: OracleEvidenceItem }) {
  const statusClass = oracleStatusClass(item.status)
  const isBatch = item.evidenceType === 'batch'
  const detailHash = item.evidenceType === 'batch' ? item.merkleRoot : item.externalIdHash
  const payloadHash = item.evidenceType === 'batch' ? item.metadataHash : item.payloadHash
  const validity = item.evidenceType === 'attestation' ? ` · ${formatOracleValidity(item.validUntil)}` : ''

  return (
    <article className={`oracle-row oracle-row--${statusClass}`}>
      <div className="oracle-row__main">
        <div>
          <p className="oracle-row__kind">{oracleKindLabel(item.kind)}</p>
          <p className="oracle-row__meta">
            {oracleEvidenceModeLabel(item)} · Reportado {formatOracleDate(item.reportedAt)}
            {validity}
          </p>
        </div>
        <span className={`oracle-row__status oracle-row__status--${statusClass}`}>
          {oracleStatusLabel(item.status)}
        </span>
      </div>

      <div className="oracle-row__grid">
        <div>
          <span>Oracle</span>
          <a href={`https://sepolia.etherscan.io/address/${item.oracle}`} target="_blank" rel="noreferrer">
            {oracleAddressLabel(item.oracle)}
          </a>
        </div>
        <div>
          <span>{isBatch ? 'Merkle root' : 'External ID'}</span>
          <code>{shortHash(detailHash)}</code>
        </div>
        <div>
          <span>{isBatch ? 'Metadata' : 'Payload'}</span>
          <code>{shortHash(payloadHash)}</code>
        </div>
      </div>
    </article>
  )
}

export function OracleEvidencePanel({ tokenId }: OracleEvidencePanelProps) {
  const oracle = useOracleEvidence(tokenId)
  const sources = usefulOracleSources()

  return (
    <section className="oracle-panel" aria-label="Evidencia oracle">
      <div className="oracle-panel__head">
        <div>
          <p className="oracle-panel__eyebrow">Oracle evidence</p>
          <h3>Evidencia externa verificable</h3>
        </div>
        <span className={`oracle-panel__badge ${oracle.configured ? 'is-ready' : 'is-pending'}`}>
          {oracle.configured ? `${oracle.items.length} on-chain` : 'Pendiente deploy'}
        </span>
      </div>

      <p className="oracle-panel__desc">
        El oracle que sirve para CarPass es una fuente del dominio: {sources.join(', ')}.
        No reemplaza el historial; agrega prueba firmada EIP-712, roleada o resumida como Merkle root.
      </p>

      {!oracle.configured ? (
        <div className="oracle-panel__empty oracle-panel__empty--pending">
          CarPassOracle ya está integrado en la app, pero todavía no tiene address Sepolia configurada.
        </div>
      ) : oracle.loading ? (
        <div className="oracle-panel__empty">Leyendo evidencias oracle en Sepolia...</div>
      ) : oracle.error ? (
        <div className="oracle-panel__empty oracle-panel__empty--error">{oracle.error}</div>
      ) : oracle.items.length === 0 ? (
        <div className="oracle-panel__empty">
          Sin evidencias externas para este VIN. El pasaporte sigue válido con su historial on-chain.
        </div>
      ) : (
        <div className="oracle-panel__list">
          {oracle.items.map(item => (
            <OracleEvidenceRow item={item} key={item.id} />
          ))}
        </div>
      )}
    </section>
  )
}
