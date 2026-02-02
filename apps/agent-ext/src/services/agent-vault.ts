import { defineProxyService } from '@webext-core/proxy-service'
import { VaultService } from '@workspace/vault/vault-service'

const vault = new VaultService()

export const [registerAgentVaultService, getAgentVaultService] = defineProxyService('VaultService', () => {
  // Initialize vault (recover password from session storage if available)
  void vault.init()
  return vault
})
