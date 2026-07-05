import { useBlockchainHealth } from '../hooks/useBlockchainHealth'

function statusLabel(status: 'ok' | 'warn' | 'pending') {
  if (status === 'ok') return 'OK'
  if (status === 'warn') return 'Revisar'
  return 'Pendiente'
}

export function BlockchainHealthPanel() {
  const health = useBlockchainHealth()

  return (
    <section className="blockchain-health" aria-label="Salud blockchain">
      <div className="blockchain-health__head">
        <div>
          <p className="blockchain-health__eyebrow">Sepolia defense center</p>
          <h3>Estado blockchain integrado</h3>
        </div>
        <span className="blockchain-health__summary">
          {health.loading ? 'Leyendo...' : `${health.items.filter(item => item.status === 'ok').length}/${health.items.length} OK`}
        </span>
      </div>

      <div className="blockchain-health__grid">
        {health.items.map(item => (
          <article className={`blockchain-health__item blockchain-health__item--${item.status}`} key={item.key}>
            <div className="blockchain-health__item-head">
              <span className="blockchain-health__label">{item.label}</span>
              <span className="blockchain-health__status">{statusLabel(item.status)}</span>
            </div>
            <p>{item.detail}</p>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                Ver en Etherscan
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
