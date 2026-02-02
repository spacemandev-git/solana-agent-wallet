import { createSolanaRpc } from '@solana/kit'
import { AgentSidebar } from '@workspace/agent-ui'
import type { PendingRequest } from '@workspace/agent-ui/components/request-panel'
import type { AgentSidebarApi } from '@workspace/agent-ui/sidebar'
import { sidebarStyles } from '@workspace/agent-ui/styles'
import { onMessage, sendMessage } from '@workspace/background/extension'
import { getDbService } from '@workspace/background/services/db'
import { createRoot } from 'react-dom/client'

export default defineContentScript({
  cssInjectionMode: 'ui',
  async main(ctx) {
    let requestHandler: ((request: PendingRequest) => void) | null = null
    let resetHandler: (() => void) | null = null

    // Track the current pending request type locally
    let pendingRequestType: string | null = null

    // Listen for request messages from background
    onMessage('onRequestCreate', ({ data }) => {
      if (requestHandler && data) {
        pendingRequestType = (data as { type: string }).type
        requestHandler({
          detail: JSON.stringify((data as { data: unknown }).data).slice(0, 200),
          type: (data as { type: string }).type,
        })
      }
    })

    onMessage('onRequestReset', () => {
      pendingRequestType = null
      resetHandler?.()
    })

    const api: AgentSidebarApi = {
      approveRequest: () => {
        const type = pendingRequestType
        if (!type) return

        void (async () => {
          try {
            const { getAgentRequestService } = await import('../services/agent-request.ts')
            const service = getAgentRequestService()

            if (type === 'connect') {
              const accounts = await getDbService().account.walletAccounts()
              await service.resolve(accounts)
            } else {
              const request = await service.get()
              if (request) {
                const data = (request as unknown as { data: unknown }).data
                const result = await sendMessage(type as 'signAndSendTransaction', data as never)
                await service.resolve(result as never)
              }
            }
          } catch {
            // Ignore errors - request may already be resolved
          }
        })()
        pendingRequestType = null
      },
      getAddress: async () => {
        try {
          const account = await getDbService().account.active()
          return account.publicKey
        } catch {
          return null
        }
      },
      getBalance: async () => {
        try {
          const endpoint = await getDbService().network.activeEndpoint()
          const account = await getDbService().account.active()
          const rpc = createSolanaRpc(endpoint)
          const { value } = await rpc.getBalance(account.publicKey as Parameters<typeof rpc.getBalance>[0]).send()
          const sol = Number(value) / 1_000_000_000
          return sol.toFixed(4)
        } catch {
          return null
        }
      },
      getNetwork: async () => {
        try {
          const endpoint = await getDbService().network.activeEndpoint()
          if (endpoint.includes('mainnet')) return 'Mainnet'
          if (endpoint.includes('devnet')) return 'Devnet'
          if (endpoint.includes('testnet')) return 'Testnet'
          if (endpoint.includes('localhost')) return 'Localnet'
          return 'Custom'
        } catch {
          return 'Mainnet'
        }
      },
      getNetworks: async () => [
        { id: 'networkMainnet', label: 'Mainnet' },
        { id: 'networkDevnet', label: 'Devnet' },
        { id: 'networkTestnet', label: 'Testnet' },
        { id: 'networkLocalnet', label: 'Localnet' },
      ],
      getVaultStatus: async () => {
        try {
          return await sendMessage('vaultStatus', undefined)
        } catch {
          return { hasVault: false, locked: true }
        }
      },
      rejectRequest: () => {
        pendingRequestType = null
        void (async () => {
          try {
            const { getAgentRequestService } = await import('../services/agent-request.ts')
            await getAgentRequestService().reject()
          } catch {
            // Ignore
          }
        })()
      },
      setNetwork: async (_id: string) => {
        // Network switching is handled through settings DB
      },
      unlockVault: async (password: string) => {
        await sendMessage('vaultUnlock', password)
      },
    }

    const ui = await createShadowRootUi(ctx, {
      name: 'samui-agent-sidebar',
      onMount: (container) => {
        // Inject styles into shadow root
        const style = document.createElement('style')
        style.textContent = sidebarStyles
        const shadowRoot = container.getRootNode() as ShadowRoot
        shadowRoot.appendChild(style)

        const root = document.createElement('div')
        container.appendChild(root)

        const reactRoot = createRoot(root)
        reactRoot.render(
          <AgentSidebar
            api={api}
            onRequestCreate={(handler) => {
              requestHandler = handler
            }}
            onRequestReset={(handler) => {
              resetHandler = handler
            }}
          />,
        )

        return reactRoot
      },
      onRemove: (reactRoot) => {
        reactRoot?.unmount()
      },
      position: 'inline',
    })

    ui.mount()
  },
  matches: ['<all_urls>'],
})
