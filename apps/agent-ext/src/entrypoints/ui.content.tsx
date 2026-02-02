import { AgentSidebar } from '@workspace/agent-ui'
import type { PendingRequest } from '@workspace/agent-ui/components/request-panel'
import type { AgentSidebarApi } from '@workspace/agent-ui/sidebar'
import { sidebarStyles } from '@workspace/agent-ui/styles'
import { onMessage, sendMessage } from '@workspace/background/extension'
import { getDbService } from '@workspace/background/services/db'
import { generateMnemonic } from '@workspace/keypair/generate-mnemonic'
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
            const { getAgentSignService } = await import('../services/agent-sign.ts')
            const requestService = getAgentRequestService()
            const signService = getAgentSignService()

            if (type === 'connect') {
              const accounts = await getDbService().account.walletAccounts()
              await requestService.resolve(accounts)
            } else {
              const request = await requestService.get()
              if (request) {
                const data = request.data as never
                // Call the sign service directly instead of sending a message
                // to background (which would create a new request).
                const result = await signService[type as keyof typeof signService](data)
                await requestService.resolve(result as never)
              }
            }
          } catch {
            // Ignore errors - request may already be resolved
          }
        })()
        pendingRequestType = null
      },
      createWallet: async (password: string, mnemonic: string) => {
        const actualMnemonic = mnemonic.trim() || generateMnemonic()
        await getDbService().wallet.createWithAccount({
          derivationPath: `m/44'/501'/0'/0'`,
          mnemonic: actualMnemonic,
          name: 'Agent Wallet',
          secret: password,
        })
        await sendMessage('vaultUnlock', password)
        const account = await getDbService().account.active()
        return { mnemonic: actualMnemonic, publicKey: account.publicKey }
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
          return await sendMessage('getBalance', undefined)
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
      getRpcEndpoint: async () => {
        try {
          return await sendMessage('getRpcEndpoint', undefined)
        } catch {
          return 'https://solana-rpc.publicnode.com'
        }
      },
      getTokenBalances: async () => {
        try {
          return await sendMessage('getTokenBalances', undefined)
        } catch {
          return []
        }
      },
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
      sendSol: async (params: { recipient: string; amount: string }) => {
        return await sendMessage('sendSol', params)
      },
      sendSplToken: async (params: {
        recipient: string
        mint: string
        amount: string
        decimals: number
        tokenProgram?: string
      }) => {
        return await sendMessage('sendSplToken', params)
      },
      setNetwork: async (_id: string) => {
        // Network switching is handled through settings DB
      },
      setRpcEndpoint: async (url: string) => {
        await sendMessage('setRpcEndpoint', url)
      },
      unlockVault: async (password: string) => {
        await sendMessage('vaultUnlock', password)
      },
    }

    // Constrain the page to leave space for the sidebar.
    // Set explicit widths and clip overflow to prevent page elements
    // (including position:fixed navbars) from rendering behind the sidebar.
    const sidebarWidth = 320
    const pageWidth = `calc(100vw - ${sidebarWidth}px)`
    const pageStyle = document.createElement('style')
    pageStyle.textContent = `
      html:root {
        overflow-x: hidden !important;
      }
      body {
        width: ${pageWidth} !important;
        max-width: ${pageWidth} !important;
        overflow-x: hidden !important;
        margin-right: 0 !important;
      }
      body > *:not(samui-agent-sidebar):not(script):not(style) {
        max-width: ${pageWidth} !important;
        overflow-x: hidden !important;
      }
    `
    document.head.appendChild(pageStyle)

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
        pageStyle.remove()
      },
      position: 'inline',
    })

    ui.mount()
  },
  matches: ['<all_urls>'],
})
