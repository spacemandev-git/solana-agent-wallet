import { useCallback, useState } from 'react'

export interface RpcEndpointProps {
  onChange: (url: string) => Promise<void>
  value: string
}

export function RpcEndpoint({ onChange, value }: RpcEndpointProps) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  const handleSave = useCallback(async () => {
    const url = input.trim()
    if (url && url !== value) {
      await onChange(url)
    }
    setEditing(false)
  }, [input, value, onChange])

  if (!editing) {
    return (
      <div className="card">
        <div className="label">RPC Endpoint</div>
        <output
          aria-label="Current RPC endpoint"
          style={{ color: '#94a3b8', display: 'block', fontSize: '12px', wordBreak: 'break-all' }}
        >
          {value}
        </output>
        <button
          aria-label="Change RPC endpoint"
          className="btn-copy"
          onClick={() => {
            setInput(value)
            setEditing(true)
          }}
          style={{ marginTop: '8px' }}
          type="button"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="label">RPC Endpoint</div>
      <input
        aria-label="RPC endpoint URL"
        className="input"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave()
        }}
        placeholder="https://..."
        type="url"
        value={input}
      />
      <div className="btn-row" style={{ marginTop: '8px' }}>
        <button
          aria-label="Save RPC endpoint"
          className="btn btn-secondary"
          onClick={() => void handleSave()}
          type="button"
        >
          Save
        </button>
        <button
          aria-label="Cancel RPC change"
          className="btn btn-secondary"
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
