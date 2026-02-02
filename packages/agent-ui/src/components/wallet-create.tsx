import { useCallback, useState } from 'react'

export interface WalletCreateProps {
  onCreate: (password: string, mnemonic: string) => Promise<{ mnemonic?: string; publicKey: string }>
  onContinue: () => void
}

type Status = 'idle' | 'creating' | 'done' | 'error'
type Mode = 'create' | 'import'

export function WalletCreate({ onCreate, onContinue }: WalletCreateProps) {
  const [mode, setMode] = useState<Mode>('create')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const valid =
    password.length >= 8 &&
    password === confirmPassword &&
    (mode === 'create' || mnemonic.trim().split(/\s+/).length >= 12)

  const handleCreate = useCallback(async () => {
    if (!valid) return
    setStatus('creating')
    setError(null)
    try {
      const result = await onCreate(password, mnemonic.trim())
      setPublicKey(result.publicKey)
      if (result.mnemonic) setMnemonic(result.mnemonic)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet')
      setStatus('error')
    }
  }, [valid, password, mnemonic, onCreate])

  if (status === 'done' && publicKey) {
    return (
      <div className="lock-overlay">
        <div className="lock-title">Wallet Created</div>
        <output
          aria-label={`Wallet address: ${publicKey}`}
          style={{
            color: '#e2e8f0',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '0 8px',
            textAlign: 'center',
            wordBreak: 'break-all',
          }}
        >
          {publicKey}
        </output>
        {mnemonic && (
          <output
            aria-label={`Wallet mnemonic: ${mnemonic.trim()}`}
            style={{
              color: '#94a3b8',
              fontSize: '12px',
              padding: '0 8px',
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {mnemonic.trim()}
          </output>
        )}
        <button aria-label="Continue to wallet" className="btn btn-secondary" onClick={onContinue} type="button">
          Continue to wallet
        </button>
      </div>
    )
  }

  return (
    <div className="lock-overlay">
      <div className="lock-title">{mode === 'create' ? 'Create Wallet' : 'Import Wallet'}</div>
      <div className="btn-row" style={{ width: '100%' }}>
        <button
          aria-label="Create new wallet"
          className={`btn ${mode === 'create' ? 'btn-approve' : 'btn-secondary'}`}
          onClick={() => setMode('create')}
          type="button"
        >
          Create
        </button>
        <button
          aria-label="Import existing wallet"
          className={`btn ${mode === 'import' ? 'btn-approve' : 'btn-secondary'}`}
          onClick={() => setMode('import')}
          type="button"
        >
          Import
        </button>
      </div>
      <input
        aria-label="Vault password"
        className="input"
        disabled={status === 'creating'}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 8 characters)"
        type="password"
        value={password}
      />
      <input
        aria-label="Confirm vault password"
        className="input"
        disabled={status === 'creating'}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        type="password"
        value={confirmPassword}
      />
      {mode === 'import' && (
        <textarea
          aria-label="Wallet mnemonic phrase"
          className="input"
          disabled={status === 'creating'}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="Enter 12 or 24 word mnemonic phrase"
          rows={3}
          style={{ resize: 'none' }}
          value={mnemonic}
        />
      )}
      {error && <div style={{ color: '#ef4444', fontSize: '13px' }}>{error}</div>}
      {password.length > 0 && password.length < 8 && (
        <div style={{ color: '#fbbf24', fontSize: '12px' }}>Password must be at least 8 characters</div>
      )}
      {confirmPassword.length > 0 && password !== confirmPassword && (
        <div style={{ color: '#fbbf24', fontSize: '12px' }}>Passwords do not match</div>
      )}
      <button
        aria-label={mode === 'create' ? 'Create wallet' : 'Import wallet'}
        className="btn btn-secondary"
        disabled={!valid || status === 'creating'}
        onClick={handleCreate}
        type="button"
      >
        {status === 'creating'
          ? mode === 'create'
            ? 'Creating...'
            : 'Importing...'
          : mode === 'create'
            ? 'Create Wallet'
            : 'Import Wallet'}
      </button>
    </div>
  )
}
