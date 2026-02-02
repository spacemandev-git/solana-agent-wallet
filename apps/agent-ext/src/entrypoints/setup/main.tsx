import { sendMessage } from '@workspace/background/extension'
import { getDbService } from '@workspace/background/services/db'
import { StrictMode, useCallback, useId, useState } from 'react'
import { createRoot } from 'react-dom/client'

function SetupForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [status, setStatus] = useState<'idle' | 'creating' | 'done' | 'error'>('idle')
  const passwordId = useId()
  const confirmId = useId()
  const mnemonicId = useId()
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    setError(null)

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!mnemonic.trim()) {
      setError('Mnemonic is required')
      return
    }

    const words = mnemonic.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) {
      setError('Mnemonic must be 12 or 24 words')
      return
    }

    setStatus('creating')
    try {
      // Create wallet with account
      await getDbService().wallet.createWithAccount({
        derivationPath: `m/44'/501'/i'/0'`,
        mnemonic: mnemonic.trim(),
        name: 'Agent Wallet',
        secret: password,
      })

      // Unlock vault with password
      await sendMessage('vaultUnlock', password)

      // Get the public key to display
      const account = await getDbService().account.active()
      setPublicKey(account.publicKey)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet')
      setStatus('error')
    }
  }, [password, confirmPassword, mnemonic])

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Samui Agent Wallet Setup</h1>

        {status === 'done' && publicKey ? (
          <div>
            <p style={styles.success}>Wallet created successfully!</p>
            <div style={styles.field}>
              <span style={styles.label}>Public Key</span>
              <output aria-label={`Wallet address: ${publicKey}`} style={styles.publicKey}>
                {publicKey}
              </output>
            </div>
            <p style={styles.hint}>
              Fund this address with SOL, then navigate to any Solana dApp. The wallet sidebar will appear
              automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.field}>
              <label htmlFor={passwordId} style={styles.label}>
                Password
              </label>
              <input
                aria-label="Vault password"
                disabled={status === 'creating'}
                id={passwordId}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                style={styles.input}
                type="password"
                value={password}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor={confirmId} style={styles.label}>
                Confirm Password
              </label>
              <input
                aria-label="Confirm vault password"
                disabled={status === 'creating'}
                id={confirmId}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={styles.input}
                type="password"
                value={confirmPassword}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor={mnemonicId} style={styles.label}>
                Mnemonic (12 or 24 words)
              </label>
              <textarea
                aria-label="Wallet mnemonic phrase"
                disabled={status === 'creating'}
                id={mnemonicId}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="Enter your mnemonic phrase separated by spaces"
                rows={3}
                style={{ ...styles.input, fontFamily: 'monospace', resize: 'vertical' as const }}
                value={mnemonic}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              aria-label="Create wallet"
              disabled={status === 'creating'}
              onClick={handleCreate}
              style={styles.button}
              type="button"
            >
              {status === 'creating' ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  button: {
    background: '#6366f1',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500' as const,
    padding: '12px',
  },
  card: {
    background: '#1a1b23',
    borderRadius: '12px',
    maxWidth: '480px',
    padding: '32px',
    width: '100%',
  },
  container: {
    alignItems: 'center',
    background: '#0f0f14',
    color: '#e2e8f0',
    display: 'flex',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  hint: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.5',
    marginTop: '16px',
  },
  input: {
    background: '#252633',
    border: '1px solid #2d2e3a',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    padding: '10px 12px',
    width: '100%',
  },
  label: {
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '500' as const,
  },
  publicKey: {
    background: '#252633',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    overflowWrap: 'break-word' as const,
    padding: '12px',
    wordBreak: 'break-all' as const,
  },
  success: {
    color: '#22c55e',
    fontSize: '16px',
    fontWeight: '600' as const,
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700' as const,
    marginBottom: '24px',
    marginTop: '0',
  },
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <SetupForm />
  </StrictMode>,
)
