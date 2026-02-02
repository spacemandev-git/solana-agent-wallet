import {
  createKeyPairFromBytes,
  createSolanaRpc,
  getBase58Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  sendTransactionWithoutConfirmingFactory,
  signBytes,
  signTransaction,
} from '@solana/kit'
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
import { createSignInMessage } from '@solana/wallet-standard-util'
import { defineProxyService } from '@webext-core/proxy-service'
import { getDbService } from '@workspace/background/services/db'
import { ensureUint8Array } from '@workspace/keypair/ensure-uint8array'
import { zeroMemory } from '@workspace/vault/zero-memory'

import { getAgentVaultService } from './agent-vault.ts'

async function getDecryptedSecretKeyBytes(): Promise<Uint8Array> {
  const vault = getAgentVaultService()
  const encryptedKey = await getDbService().account.secretKey()
  if (!encryptedKey) {
    throw new Error('Active account has no secret key')
  }

  // Try to decrypt - if it fails, it might be stored in plaintext (legacy/setup)
  try {
    const decrypted = await vault.decrypt(encryptedKey)
    return new Uint8Array(JSON.parse(decrypted))
  } catch {
    return new Uint8Array(JSON.parse(encryptedKey))
  }
}

async function getActiveRpcUrl(): Promise<string> {
  const endpoint = await getDbService().network.activeEndpoint()
  // Solana's public mainnet-beta RPC returns 403 from extension origins.
  // Fall back to publicnode which allows extension requests.
  if (endpoint.includes('mainnet-beta')) return 'https://solana-rpc.publicnode.com'
  return endpoint
}

export const [registerAgentSignService, getAgentSignService] = defineProxyService('SignService', () => ({
  signAndSendTransaction: async (
    inputs: SolanaSignAndSendTransactionInput[],
  ): Promise<SolanaSignAndSendTransactionOutput[]> => {
    const results: SolanaSignAndSendTransactionOutput[] = []
    const bytes = await getDecryptedSecretKeyBytes()
    const key = await createKeyPairFromBytes(bytes)

    const rpcUrl = await getActiveRpcUrl()
    const rpc = createSolanaRpc(rpcUrl)

    try {
      for (const input of inputs) {
        const decoded = getTransactionDecoder().decode(ensureUint8Array(input.transaction))
        const transaction = await signTransaction([key], decoded)
        const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
        // @ts-expect-error TODO: Figure out transaction type mismatch
        await sendTransaction(transaction, { commitment: 'confirmed' })

        results.push({
          signature: new Uint8Array(getBase58Encoder().encode(getSignatureFromTransaction(transaction))),
        })
      }
    } finally {
      zeroMemory(bytes)
    }

    return results
  },
  signIn: async (inputs: SolanaSignInInput[]): Promise<SolanaSignInOutput[]> => {
    const results: SolanaSignInOutput[] = []
    const active = await getDbService().account.active()
    const accounts = await getDbService().account.walletAccounts()

    if (accounts.accounts[0] === undefined) {
      throw new Error('No wallet account found')
    }

    const bytes = await getDecryptedSecretKeyBytes()
    const { privateKey } = await createKeyPairFromBytes(bytes)

    try {
      for (const input of inputs) {
        const signedMessage = createSignInMessage({
          ...input,
          address: input.address || active.publicKey,
          domain: input.domain || 'agent',
        })
        const signature = await signBytes(privateKey, signedMessage)

        results.push({
          account: accounts.accounts[0],
          signature,
          signatureType: 'ed25519',
          signedMessage,
        })
      }
    } finally {
      zeroMemory(bytes)
    }

    return results
  },
  signMessage: async (inputs: SolanaSignMessageInput[]): Promise<SolanaSignMessageOutput[]> => {
    const results: SolanaSignMessageOutput[] = []
    const bytes = await getDecryptedSecretKeyBytes()
    const { privateKey } = await createKeyPairFromBytes(bytes)

    try {
      for (const input of inputs) {
        const signedMessage = ensureUint8Array(input.message)
        const signature = await signBytes(privateKey, signedMessage)

        results.push({
          signature,
          signatureType: 'ed25519',
          signedMessage,
        })
      }
    } finally {
      zeroMemory(bytes)
    }

    return results
  },
  signTransaction: async (inputs: SolanaSignTransactionInput[]): Promise<SolanaSignTransactionOutput[]> => {
    const results: SolanaSignTransactionOutput[] = []
    const bytes = await getDecryptedSecretKeyBytes()
    const key = await createKeyPairFromBytes(bytes)

    try {
      for (const input of inputs) {
        const decoded = getTransactionDecoder().decode(ensureUint8Array(input.transaction))
        const signed = await signTransaction([key], decoded)
        results.push({
          signedTransaction: new Uint8Array(getTransactionEncoder().encode(signed)),
        })
      }
    } finally {
      zeroMemory(bytes)
    }

    return results
  },
}))
