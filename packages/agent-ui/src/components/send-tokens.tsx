import { useCallback, useState } from 'react'

export interface TokenInfo {
  balance: string
  decimals: number
  mint: string
  symbol: string
  tokenProgram?: string
}

export interface SendTokensProps {
  onSend: (params: {
    amount: string
    decimals: number
    mint: string
    recipient: string
    tokenProgram?: string
  }) => Promise<string>
  tokens: TokenInfo[]
}

export function SendTokens({ onSend, tokens }: SendTokensProps) {
  const [selectedMint, setSelectedMint] = useState('SOL')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [signature, setSignature] = useState('')
  const [error, setError] = useState('')

  const selectedToken = tokens.find((t) => t.mint === selectedMint) ?? tokens[0]

  const handleSend = useCallback(async () => {
    if (!recipient.trim() || !amount.trim() || !selectedToken) return

    setStatus('sending')
    setError('')
    setSignature('')

    try {
      const params: { amount: string; decimals: number; mint: string; recipient: string; tokenProgram?: string } = {
        amount: amount.trim(),
        decimals: selectedToken.decimals,
        mint: selectedToken.mint,
        recipient: recipient.trim(),
      }
      if (selectedToken.tokenProgram) params.tokenProgram = selectedToken.tokenProgram
      const sig = await onSend(params)
      setSignature(sig)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setStatus('error')
    }
  }, [recipient, amount, selectedToken, onSend])

  const handleReset = useCallback(() => {
    setRecipient('')
    setAmount('')
    setSignature('')
    setError('')
    setStatus('idle')
  }, [])

  if (status === 'success') {
    return (
      <div className="card">
        <div className="label">Send Tokens</div>
        <output aria-label={`Transaction signature: ${signature}`} className="success-msg">
          Sent! Signature: {signature.slice(0, 16)}...{signature.slice(-8)}
        </output>
        <button
          aria-label="Send another transaction"
          className="btn btn-secondary"
          onClick={handleReset}
          style={{ marginTop: '8px' }}
          type="button"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="label">Send Tokens</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select
          aria-label="Select token to send"
          className="select"
          onChange={(e) => setSelectedMint(e.target.value)}
          value={selectedMint}
        >
          {tokens.map((t) => (
            <option key={t.mint} value={t.mint}>
              {t.symbol} ({t.balance})
            </option>
          ))}
        </select>
        <input
          aria-label="Recipient wallet address"
          className="input"
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address"
          type="text"
          value={recipient}
        />
        <input
          aria-label="Amount to send"
          className="input"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="text"
          value={amount}
        />
        {status === 'error' && (
          <output aria-label={`Send error: ${error}`} className="error-msg" role="alert">
            {error}
          </output>
        )}
        <button
          aria-label="Send tokens"
          className="btn btn-approve"
          disabled={status === 'sending' || !recipient.trim() || !amount.trim()}
          onClick={() => void handleSend()}
          type="button"
        >
          {status === 'sending' ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
