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

import { sendMessage } from '@workspace/background/extension'

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

  async create<T extends Request['type']>(type: T, data: DataType<T>): Promise<ResolveType<T>> {
    if (this.request) {
      throw new Error('Request already exists')
    }

    return new Promise((resolve, reject) => {
      this.request = {
        data,
        reject,
        resolve,
        type,
      } as Request

      // Send to content-ui sidebar instead of opening a popup window
      sendMessage('onRequestCreate', this.request as Request)
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
    sendMessage('onRequestReset')
  }
}

export const [registerAgentRequestService, getAgentRequestService] = defineProxyService(
  'RequestService',
  () => new AgentRequestService(),
)
