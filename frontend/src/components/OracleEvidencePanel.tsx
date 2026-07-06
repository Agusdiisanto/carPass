import {
  batchVerificationLabel,
  batchVerificationTone,
  formatOracleDate,
  formatOracleValidity,
  oracleAddressLabel,
  oracleEvidenceModeLabel,
  oracleKindLabel,
  oracleStatusClass,
  oracleStatusLabel,
  resolveOracleEvidencePresentation,
  shortHash,
  type OracleEvidenceItem,
} from '../domain/carpass/oracleEvidence'
import { useOracleEvidence } from '../hooks/useOracleEvidence'

type OracleEvidencePanelProps = {
  tokenId: bigint
}

function OracleEvidenceRow({ item }: { item: OracleEvidenceItem }) {
  const statusClass = oracleStatusClass(item.status)
  const presentation = resolveOracleEvidencePresentation(item)
  const isBatch = item.evidenceType === 'batch'
  const detailHash = isBatch ? item.merkleRoot : item.externalIdHash
  const payloadHash = isBatch ? item.metadataHash : item.payloadHash
  const validity = !isBatch ? ` · ${formatOracleValidity(item.validUntil)}` : ''
  const batchTone = isBatch ? batchVerificationTone(item) : null

  return (
    <article className={`oracle-row oracle-row--${statusClass}`}>
      <div className="oracle-row__main">
        <div>
          <p className="oracle-row__kind">{presentation.title}</p>
          <p className="oracle-row__summary">{presentation.summary}</p>
          <p className="oracle-row__meta">
            {oracleKindLabel(item.kind)} · {oracleEvidenceModeLabel(item)} · Cargado el{' '}
            {formatOracleDate(item.reportedAt)}
            {validity}
          </p>
          {batchTone && (
            <p className={`oracle-row__meta oracle-row__meta--${batchTone}`}>
              {batchVerificationLabel(item)}
            </p>
          )}
        </div>
        <span className={`oracle-row__status oracle-row__status--${statusClass}`}>
          {oracleStatusLabel(item.status)}
        </span>
      </div>

      <details className="oracle-row__proof">
        <summary>Ver prueba on-chain</summary>
        <div className="oracle-row__grid">
          <div>
            <span>Cargó</span>
            <a href={`https://sepolia.etherscan.io/address/${item.oracle}`} target="_blank" rel="noreferrer">
              {oracleAddressLabel(item.oracle)}
            </a>
          </div>
          <div>
            <span>{isBatch ? 'Resumen' : 'Referencia'}</span>
            <code title={detailHash}>{shortHash(detailHash)}</code>
          </div>
          <div>
            <span>{isBatch ? 'Nota' : 'Dato'}</span>
            <code title={payloadHash}>{shortHash(payloadHash)}</code>
          </div>
        </div>
      </details>
    </article>
  )
}

export function OracleEvidencePanel({ tokenId }: OracleEvidencePanelProps) {
  const oracle = useOracleEvidence(tokenId)
  const recordCount = oracle.items.length
  const recordBadge =
    recordCount === 1 ? '1 registro' : `${recordCount} registros`

  return (
    <section className="oracle-panel" aria-label="Respaldo de terceros">
      <div className="oracle-panel__head">
        <div>
          <p className="oracle-panel__eyebrow">Complemento</p>
          <h3>Respaldo de terceros</h3>
        </div>
        <span className={`oracle-panel__badge ${oracle.configured ? 'is-ready' : 'is-pending'}`}>
          {oracle.configured ? recordBadge : 'Sin contrato'}
        </span>
      </div>

      <p className="oracle-panel__desc">
        Certificados que dejó una wallet autorizada (VTV, taller, aseguradora, autopartes). No
        reemplazan el historial del pasaporte: suman un respaldo extra consultable en Sepolia, sin
        conectar wallet.
      </p>

      {!oracle.configured ? (
        <div className="oracle-panel__empty oracle-panel__empty--pending">
          Falta configurar la address del contrato Oracle en Sepolia.
        </div>
      ) : oracle.loading ? (
        <div className="oracle-panel__empty">Consultando atestaciones...</div>
      ) : oracle.error ? (
        <div className="oracle-panel__empty oracle-panel__empty--error">{oracle.error}</div>
      ) : oracle.items.length === 0 ? (
        <div className="oracle-panel__empty">
          Este VIN no tiene respaldo externo cargado. El historial del pasaporte sigue siendo la fuente principal.
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
