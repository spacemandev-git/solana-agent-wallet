import { useCallback, useState } from 'react'

export interface WalletStatusProps {
  address: string | null
  balance: string | null
  network: string
}

export function WalletStatus({ address, balance, network }: WalletStatusProps) {
  const [copied, setCopied] = useState(false)

  const networkClass = network.toLowerCase().includes('mainnet')
    ? 'mainnet'
    : network.toLowerCase().includes('devnet')
      ? 'devnet'
      : network.toLowerCase().includes('testnet')
        ? 'testnet'
        : 'localnet'

  const copyAddress = useCallback(async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  return (
    <div className="card">
      <div className="label">Wallet</div>
      {address ? (
        <>
          <div style={{ alignItems: 'center', display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <output aria-label={`Wallet address: ${address}`} className="address">
              {address.slice(0, 8)}...{address.slice(-4)}
            </output>
            <button aria-label="Copy wallet address" className="btn-copy" onClick={copyAddress} type="button">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <output aria-label={`SOL balance: ${balance ?? '0'}`} className="balance">
              {balance ?? '0'}
            </output>
            <span className="balance-unit">SOL</span>
          </div>
          <output aria-label={`Network: ${network}`} className={`network-badge ${networkClass}`}>
            <span className="network-dot" />
            {network}
          </output>
        </>
      ) : (
        <div className="empty-state">No wallet connected</div>
      )}
    </div>
  )
}
