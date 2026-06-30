import { shortAddress } from '../hooks/useWallet'

type RoleDetectingStateProps = {
  address: string
}

export function RoleDetectingState({ address }: RoleDetectingStateProps) {
  return (
    <div className="role-detecting" aria-live="polite" aria-busy="true">
      <div className="role-detecting__card">
        <div className="role-detecting__pulse" aria-hidden />
        <p className="role-detecting__eyebrow">Verificando permisos</p>
        <h2 className="role-detecting__title">Detectando tu rol on-chain</h2>
        <p className="role-detecting__desc">
          Consultando el contrato CarPass para la wallet <code>{shortAddress(address)}</code>
        </p>
        <div className="role-detecting__skeleton" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
