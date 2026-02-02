import { useCallback, useEffect, useState } from 'react'

import type { NetworkOption } from './components/network-switch.tsx'
import { NetworkSwitch } from './components/network-switch.tsx'
import type { PendingRequest } from './components/request-panel.tsx'
import { RequestPanel } from './components/request-panel.tsx'
import { VaultUnlock } from './components/vault-unlock.tsx'
import { WalletStatus } from './components/wallet-status.tsx'

export interface AgentSidebarApi {
  approveRequest: () => void
  getAddress: () => Promise<string | null>
  getBalance: () => Promise<string | null>
  getNetwork: () => Promise<string>
  getNetworks: () => Promise<NetworkOption[]>
  getVaultStatus: () => Promise<{ hasVault: boolean; locked: boolean }>
  rejectRequest: () => void
  setNetwork: (id: string) => Promise<void>
  unlockVault: (password: string) => Promise<void>
}

export interface AgentSidebarProps {
  api: AgentSidebarApi
  onRequestCreate?: (handler: (request: PendingRequest) => void) => void
  onRequestReset?: (handler: () => void) => void
}

export function AgentSidebar({ api, onRequestCreate, onRequestReset }: AgentSidebarProps) {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [network, setNetwork] = useState('Mainnet')
  const [networkId, setNetworkId] = useState('networkMainnet')
  const [networks, setNetworks] = useState<NetworkOption[]>([])
  const [vaultLocked, setVaultLocked] = useState(true)
  const [hasVault, setHasVault] = useState(false)
  const [request, setRequest] = useState<PendingRequest | null>(null)

  const refresh = useCallback(async () => {
    try {
      const status = await api.getVaultStatus()
      setVaultLocked(status.locked)
      setHasVault(status.hasVault)

      if (!status.locked) {
        const [addr, bal, net, nets] = await Promise.all([
          api.getAddress(),
          api.getBalance(),
          api.getNetwork(),
          api.getNetworks(),
        ])
        setAddress(addr)
        setBalance(bal)
        setNetwork(net)
        setNetworks(nets)
      }
    } catch {
      // Silently fail during refresh - vault might be initializing
    }
  }, [api])

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), 5000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    onRequestCreate?.((req) => setRequest(req))
    onRequestReset?.(() => setRequest(null))
  }, [onRequestCreate, onRequestReset])

  const handleUnlock = useCallback(
    async (password: string) => {
      await api.unlockVault(password)
      setVaultLocked(false)
      await refresh()
    },
    [api, refresh],
  )

  const handleNetworkChange = useCallback(
    async (id: string) => {
      await api.setNetwork(id)
      setNetworkId(id)
      await refresh()
    },
    [api, refresh],
  )

  const handleApprove = useCallback(() => {
    api.approveRequest()
    setRequest(null)
  }, [api])

  const handleReject = useCallback(() => {
    api.rejectRequest()
    setRequest(null)
  }, [api])

  if (hasVault && vaultLocked) {
    return (
      <aside aria-label="Solana Wallet" className="sidebar">
        <div className="sidebar-header">
          <h2>Samui Agent Wallet</h2>
        </div>
        <VaultUnlock onUnlock={handleUnlock} />
      </aside>
    )
  }

  return (
    <aside aria-label="Solana Wallet" className="sidebar">
      <div className="sidebar-header">
        <h2>Samui Agent Wallet</h2>
      </div>
      <div className="sidebar-body">
        <WalletStatus address={address} balance={balance} network={network} />
        <RequestPanel onApprove={handleApprove} onReject={handleReject} request={request} />
        <NetworkSwitch networks={networks} onChange={handleNetworkChange} selected={networkId} />
      </div>
    </aside>
  )
}
