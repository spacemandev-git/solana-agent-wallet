import { onMessage } from '@workspace/background/extension'
import { getDbService, registerDbService } from '@workspace/background/services/db'
import { setEnv } from '@workspace/env/env'
import { getAgentRequestService, registerAgentRequestService } from '../services/agent-request.ts'
import { registerAgentSignService } from '../services/agent-sign.ts'
import { getAgentTransferService, registerAgentTransferService } from '../services/agent-transfer.ts'
import { getAgentVaultService, registerAgentVaultService } from '../services/agent-vault.ts'

export default defineBackground(() => {
  // Default to mainnet (publicnode avoids 403 that mainnet-beta returns for extension origins)
  setEnv({
    activeNetworkId: 'networkMainnet',
    networkMainnet: 'https://solana-rpc.publicnode.com',
  })

  // Register services
  registerDbService()
  registerAgentRequestService()
  registerAgentSignService()
  registerAgentTransferService()
  registerAgentVaultService()

  // Register wallet standard message handlers.
  // Auto-approve connect — the agent controls the wallet so no user confirmation is needed.
  // All handlers use getAgentRequestService() instead of standard actions,
  // because the standard actions import getRequestService() from a different
  // defineProxyService pair that requires browser.windows (unavailable in agent-ext).
  onMessage('connect', async () => {
    try {
      return await getDbService().account.walletAccounts()
    } catch {
      return { accounts: [] }
    }
  })
  onMessage('disconnect', async () => {
    // No-op for agent wallet disconnect
  })
  onMessage('signAndSendTransaction', async ({ data }) => {
    return await getAgentRequestService().create('signAndSendTransaction', data)
  })
  onMessage('signIn', async ({ data }) => {
    return await getAgentRequestService().create('signIn', data)
  })
  onMessage('signMessage', async ({ data }) => {
    return await getAgentRequestService().create('signMessage', data)
  })
  onMessage('signTransaction', async ({ data }) => {
    return await getAgentRequestService().create('signTransaction', data)
  })

  onMessage('getRpcEndpoint', async () => {
    try {
      return await getDbService().network.activeEndpoint()
    } catch {
      return 'https://solana-rpc.publicnode.com'
    }
  })

  onMessage('setRpcEndpoint', async ({ data }) => {
    await getDbService().network.setEndpoint(data)
  })

  // Balance fetched from background to avoid CORS issues on page origins
  onMessage('getBalance', async () => {
    try {
      let endpoint = await getDbService().network.activeEndpoint()
      if (endpoint.includes('mainnet-beta')) endpoint = 'https://solana-rpc.publicnode.com'
      const account = await getDbService().account.active()
      const res = await fetch(endpoint, {
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'getBalance',
          params: [account.publicKey],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const json = (await res.json()) as { result?: { value: number } }
      if (!json.result) return null
      const sol = json.result.value / 1_000_000_000
      return sol.toFixed(8)
    } catch {
      return null
    }
  })

  // Transfer handlers — direct sends, no approval needed
  onMessage('sendSol', async ({ data }) => {
    const transfer = getAgentTransferService()
    return await transfer.sendSol(data.recipient, data.amount)
  })

  onMessage('sendSplToken', async ({ data }) => {
    const transfer = getAgentTransferService()
    return await transfer.sendSplToken(data.recipient, data.mint, data.amount, data.decimals, data.tokenProgram)
  })

  onMessage('getTokenBalances', async () => {
    return await getAgentTransferService().getTokenBalances()
  })

  // Register vault message handlers
  onMessage('vaultUnlock', async ({ data }) => {
    await getAgentVaultService().unlock(data)
  })

  onMessage('vaultLock', async () => {
    await getAgentVaultService().lock()
  })

  onMessage('vaultStatus', async () => {
    const vault = getAgentVaultService()
    const locked = await vault.isLocked()
    let hasVault = false
    try {
      const account = await getDbService().account.active()
      hasVault = !!account
    } catch {
      // No active account means no vault set up
    }
    return { hasVault, locked }
  })
})
