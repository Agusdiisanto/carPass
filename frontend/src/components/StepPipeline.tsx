export type PipelineStepStatus = 'pending' | 'active' | 'done' | 'error'

export type PipelineStep = {
  label: string
  description: string
  status: PipelineStepStatus
}

const STATUS_ICON: Record<PipelineStepStatus, string> = {
  pending: '',
  active: '',
  done: '✓',
  error: '!',
}

export function StepPipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="step-pipeline">
      {steps.map((step, index) => (
        <li key={step.label} className={`step-pipeline__step step-pipeline__step--${step.status}`}>
          <span className="step-pipeline__num" aria-hidden>
            {step.status === 'active' ? (
              <span className="step-pipeline__spinner" />
            ) : (
              STATUS_ICON[step.status] || index + 1
            )}
          </span>
          <div className="step-pipeline__body">
            <p className="step-pipeline__label">{step.label}</p>
            <p className="step-pipeline__desc">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
