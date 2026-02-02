export interface PendingRequest {
  type: string
  detail?: string
}

export interface RequestPanelProps {
  onApprove: () => void
  onReject: () => void
  request: PendingRequest | null
}

function typeToLabel(type: string): string {
  switch (type) {
    case 'connect':
      return 'Connection Request'
    case 'signAndSendTransaction':
      return 'Sign & Send Transaction'
    case 'signIn':
      return 'Sign In Request'
    case 'signMessage':
      return 'Sign Message'
    case 'signTransaction':
      return 'Sign Transaction'
    default:
      return type
  }
}

export function RequestPanel({ onApprove, onReject, request }: RequestPanelProps) {
  if (!request) {
    return (
      <div className="card">
        <div className="label">Requests</div>
        <div className="empty-state">No pending requests</div>
      </div>
    )
  }

  const label = typeToLabel(request.type)
  const ariaAction = request.type === 'connect' ? 'connection' : 'transaction'

  return (
    <div className="request-card">
      <div className="request-type">{label}</div>
      {request.detail && <div className="request-detail">{request.detail}</div>}
      <div className="btn-row">
        <button aria-label={`Approve ${ariaAction}`} className="btn btn-approve" onClick={onApprove} type="button">
          Approve
        </button>
        <button aria-label={`Reject ${ariaAction}`} className="btn btn-reject" onClick={onReject} type="button">
          Reject
        </button>
      </div>
    </div>
  )
}
