import { useCallback, useEffect, useRef, useState } from 'react'

import type { NetworkOption } from './components/network-switch.tsx'
import { NetworkSwitch } from './components/network-switch.tsx'
import type { PendingRequest } from './components/request-panel.tsx'
import { RequestPanel } from './components/request-panel.tsx'
import { RpcEndpoint } from './components/rpc-endpoint.tsx'
import type { TokenInfo } from './components/send-tokens.tsx'
import { SendTokens } from './components/send-tokens.tsx'
import { VaultUnlock } from './components/vault-unlock.tsx'
import { WalletCreate } from './components/wallet-create.tsx'
import { WalletStatus } from './components/wallet-status.tsx'

export interface AgentSidebarApi {
  approveRequest: () => void
  createWallet: (password: string, mnemonic: string) => Promise<{ mnemonic?: string; publicKey: string }>
  getAddress: () => Promise<string | null>
  getBalance: () => Promise<string | null>
  getNetwork: () => Promise<string>
  getNetworks: () => Promise<NetworkOption[]>
  getRpcEndpoint: () => Promise<string>
  getTokenBalances: () => Promise<TokenInfo[]>
  getVaultStatus: () => Promise<{ hasVault: boolean; locked: boolean }>
  rejectRequest: () => void
  sendSol: (params: { recipient: string; amount: string }) => Promise<string>
  sendSplToken: (params: {
    recipient: string
    mint: string
    amount: string
    decimals: number
    tokenProgram?: string
  }) => Promise<string>
  setNetwork: (id: string) => Promise<void>
  setRpcEndpoint: (url: string) => Promise<void>
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
  const [rpcEndpoint, setRpcEndpoint] = useState('')
  const [vaultLocked, setVaultLocked] = useState(true)
  const [hasVault, setHasVault] = useState(false)
  const [request, setRequest] = useState<PendingRequest | null>(null)
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const creatingRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const status = await api.getVaultStatus()
      setVaultLocked(status.locked)
      if (!creatingRef.current) {
        setHasVault(status.hasVault)
      }

      if (!status.locked) {
        const [addr, bal, net, nets, rpc, toks] = await Promise.all([
          api.getAddress(),
          api.getBalance(),
          api.getNetwork(),
          api.getNetworks(),
          api.getRpcEndpoint(),
          api.getTokenBalances().catch(() => [] as TokenInfo[]),
        ])
        setAddress(addr)
        setBalance(bal)
        setNetwork(net)
        setNetworks(nets)
        setRpcEndpoint(rpc)
        setTokens(toks)
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

  const handleCreate = useCallback(
    async (password: string, mnemonic: string) => {
      creatingRef.current = true
      const result = await api.createWallet(password, mnemonic)
      return result
    },
    [api],
  )

  const handleContinue = useCallback(() => {
    creatingRef.current = false
    setHasVault(true)
    setVaultLocked(false)
    void refresh()
  }, [refresh])

  const handleRpcChange = useCallback(
    async (url: string) => {
      await api.setRpcEndpoint(url)
      setRpcEndpoint(url)
      await refresh()
    },
    [api, refresh],
  )

  const handleSend = useCallback(
    async (params: { amount: string; decimals: number; mint: string; recipient: string; tokenProgram?: string }) => {
      let sig: string
      if (params.mint === 'SOL') {
        sig = await api.sendSol({ amount: params.amount, recipient: params.recipient })
      } else {
        const splParams: { recipient: string; mint: string; amount: string; decimals: number; tokenProgram?: string } =
          {
            amount: params.amount,
            decimals: params.decimals,
            mint: params.mint,
            recipient: params.recipient,
          }
        if (params.tokenProgram) splParams.tokenProgram = params.tokenProgram
        sig = await api.sendSplToken(splParams)
      }
      void refresh()
      return sig
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

  if (!hasVault) {
    return (
      <aside aria-label="Solana Wallet" className="sidebar">
        <div className="sidebar-header">
          <h2>Samui Agent Wallet</h2>
        </div>
        <WalletCreate onContinue={handleContinue} onCreate={handleCreate} />
      </aside>
    )
  }

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
        <SendTokens onSend={handleSend} tokens={tokens} />
        <RequestPanel onApprove={handleApprove} onReject={handleReject} request={request} />
        <NetworkSwitch networks={networks} onChange={handleNetworkChange} selected={networkId} />
        <RpcEndpoint onChange={handleRpcChange} value={rpcEndpoint} />
      </div>
    </aside>
  )
}
