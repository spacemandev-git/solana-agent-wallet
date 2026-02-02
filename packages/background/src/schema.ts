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
import type { Request } from './services/request.ts'

export interface Schema {
  connect(input?: StandardConnectInput): Promise<StandardConnectOutput>
  disconnect(): Promise<void>
  onRequestCreate(request: Request): void
  onRequestReset(): void
  signAndSendTransaction(inputs: SolanaSignAndSendTransactionInput[]): Promise<SolanaSignAndSendTransactionOutput[]>
  signIn(inputs: SolanaSignInInput[]): Promise<SolanaSignInOutput[]>
  signMessage(inputs: SolanaSignMessageInput[]): Promise<SolanaSignMessageOutput[]>
  signTransaction(inputs: SolanaSignTransactionInput[]): Promise<SolanaSignTransactionOutput[]>
  getBalance(): Promise<string | null>
  getRpcEndpoint(): Promise<string>
  setRpcEndpoint(url: string): Promise<void>
  sendSol(params: { recipient: string; amount: string }): Promise<string>
  sendSplToken(params: {
    recipient: string
    mint: string
    amount: string
    decimals: number
    tokenProgram?: string
  }): Promise<string>
  getTokenBalances(): Promise<
    Array<{ mint: string; symbol: string; balance: string; decimals: number; tokenProgram?: string }>
  >
  vaultLock(): Promise<void>
  vaultStatus(): Promise<{ hasVault: boolean; locked: boolean }>
  vaultUnlock(password: string): Promise<void>
}
