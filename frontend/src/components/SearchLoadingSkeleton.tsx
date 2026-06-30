export function SearchLoadingSkeleton() {
  return (
    <div className="search-skeleton" aria-live="polite" aria-busy="true">
      <div className="search-skeleton__hero shimmer" />
      <div className="search-skeleton__line shimmer" />
      <div className="search-skeleton__line shimmer search-skeleton__line--short" />
      <div className="search-skeleton__grid">
        <div className="search-skeleton__card shimmer" />
        <div className="search-skeleton__card shimmer" />
        <div className="search-skeleton__card shimmer" />
      </div>
      <p className="search-skeleton__caption">Consultando historial on-chain en Sepolia...</p>
    </div>
  )
}
