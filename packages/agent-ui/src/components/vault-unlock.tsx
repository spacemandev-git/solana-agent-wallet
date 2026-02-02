import { useCallback, useState } from 'react'

export interface VaultUnlockProps {
  onUnlock: (password: string) => Promise<void>
}

export function VaultUnlock({ onUnlock }: VaultUnlockProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUnlock = useCallback(async () => {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      await onUnlock(password)
    } catch {
      setError('Failed to unlock vault')
    } finally {
      setLoading(false)
    }
  }, [password, onUnlock])

  return (
    <div className="lock-overlay">
      <div className="lock-title">Wallet Locked</div>
      <input
        aria-label="Vault password"
        className="input"
        disabled={loading}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleUnlock()
        }}
        placeholder="Enter password"
        type="password"
        value={password}
      />
      {error && <div style={{ color: '#ef4444', fontSize: '13px' }}>{error}</div>}
      <button
        aria-label="Unlock wallet"
        className="btn btn-secondary"
        disabled={loading || !password}
        onClick={handleUnlock}
        type="button"
      >
        {loading ? 'Unlocking...' : 'Unlock'}
      </button>
    </div>
  )
}
