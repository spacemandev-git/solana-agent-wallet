import { handlers } from '@workspace/background/background'
import { onMessage } from '@workspace/background/extension'
import { getDbService, registerDbService } from '@workspace/background/services/db'
import { setEnv } from '@workspace/env/env'
import { registerAgentRequestService } from '../services/agent-request.ts'
import { registerAgentSignService } from '../services/agent-sign.ts'
import { getAgentVaultService, registerAgentVaultService } from '../services/agent-vault.ts'

export default defineBackground(() => {
  // Default to mainnet
  setEnv({
    activeNetworkId: 'networkMainnet',
    networkMainnet: 'https://api.mainnet-beta.solana.com',
  })

  // Register services
  registerDbService()
  registerAgentRequestService()
  registerAgentSignService()
  registerAgentVaultService()

  // Register wallet standard message handlers
  handlers()

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
