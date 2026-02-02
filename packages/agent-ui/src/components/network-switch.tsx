export interface NetworkOption {
  id: string
  label: string
}

export interface NetworkSwitchProps {
  networks: NetworkOption[]
  onChange: (id: string) => void
  selected: string
}

export function NetworkSwitch({ networks, onChange, selected }: NetworkSwitchProps) {
  return (
    <div className="card">
      <div className="label">Network</div>
      <select
        aria-label="Switch network"
        className="select"
        onChange={(e) => onChange(e.target.value)}
        value={selected}
      >
        {networks.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
          </option>
        ))}
      </select>
    </div>
  )
}
