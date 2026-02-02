import type {
  SolanaSignAndSendTransactionInput,
  SolanaSignAndSendTransactionOutput,
  SolanaSignInInput,
  SolanaSignInOutput,
  SolanaSignMessageInput,
  SolanaSignMessageOutput,
  SolanaSignTransactionInput,
  SolanaSignTransactionOutput,
} from '@solana/wallet-standard-features'
import type { StandardConnectInput, StandardConnectOutput } from '@wallet-standard/core'
import { defineProxyService } from '@webext-core/proxy-service'

import { getDbService } from '@workspace/background/services/db'

type DataType<T extends Request['type']> = Extract<Request, { type: T }>['data']

type ResolveType<T extends Request['type']> =
  Extract<Request, { type: T }> extends {
    resolve: (data: infer R) => void
  }
    ? R
    : never

export type Request =
  | {
      data: SolanaSignAndSendTransactionInput[]
      reject: (reason?: Error) => void
      resolve: (data: SolanaSignAndSendTransactionOutput[]) => void
      type: 'signAndSendTransaction'
    }
  | {
      data: SolanaSignInInput[]
      reject: (reason?: Error) => void
      resolve: (data: SolanaSignInOutput[]) => void
      type: 'signIn'
    }
  | {
      data: SolanaSignMessageInput[]
      reject: (reason?: Error) => void
      resolve: (data: SolanaSignMessageOutput[]) => void
      type: 'signMessage'
    }
  | {
      data: SolanaSignTransactionInput[]
      reject: (reason?: Error) => void
      resolve: (data: SolanaSignTransactionOutput[]) => void
      type: 'signTransaction'
    }
  | {
      data: StandardConnectInput | undefined
      reject: (reason?: Error) => void
      resolve: (data: StandardConnectOutput) => void
      type: 'connect'
    }

class AgentRequestService {
  private request: Request | null = null

  /**
   * Broadcast a message to all tabs' content scripts via chrome.tabs API.
   * We cannot use @webext-core/messaging's sendMessage from the background
   * because its second argument is interpreted as tab/send options, not data.
   */
  private async broadcastToTabs(type: string, data?: unknown) {
    const tabs = await chrome.tabs.query({})
    const message = { data, id: Math.floor(Math.random() * 10000), timestamp: Date.now(), type }
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have the content script loaded — ignore
        })
      }
    }
  }

  async create<T extends Request['type']>(type: T, data: DataType<T>): Promise<ResolveType<T>> {
    if (this.request) {
      throw new Error('Request already exists')
    }

    // Auto-approve connect requests directly in the background.
    // The agent controls the wallet so there's no need for user confirmation.
    if (type === 'connect') {
      const accounts = await getDbService().account.walletAccounts()
      return { accounts } as ResolveType<T>
    }

    return new Promise((resolve, reject) => {
      this.request = {
        data,
        reject,
        resolve,
        type,
      } as Request

      // Send serializable fields to content-ui sidebar for user approval.
      this.broadcastToTabs('onRequestCreate', { data, type })
    })
  }

  get() {
    return this.request
  }

  reject() {
    if (!this.request) {
      throw new Error('No request to reject')
    }

    this.request.reject(new Error('Request rejected'))
    this.reset()
  }

  resolve(
    data:
      | SolanaSignAndSendTransactionOutput[]
      | SolanaSignInOutput[]
      | SolanaSignMessageOutput[]
      | SolanaSignTransactionOutput[]
      | StandardConnectOutput,
  ) {
    if (!this.request) {
      throw new Error('No request to resolve')
    }

    if (this.request.type === 'connect') {
      this.request.resolve(data as StandardConnectOutput)
    } else if (this.request.type === 'signMessage') {
      this.request.resolve(data as SolanaSignMessageOutput[])
    } else if (this.request.type === 'signIn') {
      this.request.resolve(data as SolanaSignInOutput[])
    } else if (this.request.type === 'signTransaction') {
      this.request.resolve(data as SolanaSignTransactionOutput[])
    } else if (this.request.type === 'signAndSendTransaction') {
      this.request.resolve(data as SolanaSignAndSendTransactionOutput[])
    }

    this.reset()
  }

  reset() {
    this.request = null
    this.broadcastToTabs('onRequestReset')
  }
}

export const [registerAgentRequestService, getAgentRequestService] = defineProxyService(
  'AgentRequestService',
  () => new AgentRequestService(),
)
