import {
  type Address,
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022'
import { defineProxyService } from '@webext-core/proxy-service'
import { getDbService } from '@workspace/background/services/db'
import { createSolTransferInstructions } from '@workspace/solana-client/create-sol-transfer-instructions'
import { createSplTransferInstructions } from '@workspace/solana-client/create-spl-transfer-instructions'
import { zeroMemory } from '@workspace/vault/zero-memory'

import { getAgentVaultService } from './agent-vault.ts'

async function getDecryptedSecretKeyBytes(): Promise<Uint8Array> {
  const vault = getAgentVaultService()
  const encryptedKey = await getDbService().account.secretKey()
  if (!encryptedKey) {
    throw new Error('Active account has no secret key')
  }

  try {
    const decrypted = await vault.decrypt(encryptedKey)
    return new Uint8Array(JSON.parse(decrypted))
  } catch {
    return new Uint8Array(JSON.parse(encryptedKey))
  }
}

async function getActiveRpcUrl(): Promise<string> {
  const endpoint = await getDbService().network.activeEndpoint()
  if (endpoint.includes('mainnet-beta')) return 'https://solana-rpc.publicnode.com'
  return endpoint
}

export interface TokenBalance {
  balance: string
  decimals: number
  mint: string
  symbol: string
  tokenProgram?: string
}

export const [registerAgentTransferService, getAgentTransferService] = defineProxyService('TransferService', () => ({
  getTokenBalances: async (): Promise<TokenBalance[]> => {
    const rpcUrl = await getActiveRpcUrl()
    const account = await getDbService().account.active()
    const owner = account.publicKey
    const results: TokenBalance[] = []

    // Fetch SOL balance
    const balRes = await fetch(rpcUrl, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'getBalance', params: [owner] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const balJson = (await balRes.json()) as { result?: { value: number } }
    const solBalance = balJson.result ? (balJson.result.value / 1_000_000_000).toFixed(9) : '0'
    results.push({ balance: solBalance, decimals: 9, mint: 'SOL', symbol: 'SOL' })

    // Fetch SPL token accounts for both token programs
    for (const programId of [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS]) {
      try {
        const res = await fetch(rpcUrl, {
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'getTokenAccountsByOwner',
            params: [owner, { programId }, { commitment: 'confirmed', encoding: 'jsonParsed' }],
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        const json = (await res.json()) as {
          result?: {
            value: Array<{
              account: {
                data: {
                  parsed: {
                    info: {
                      mint: string
                      tokenAmount: { amount: string; decimals: number; uiAmountString: string }
                    }
                  }
                }
              }
            }>
          }
        }
        if (json.result?.value) {
          for (const item of json.result.value) {
            const info = item.account.data.parsed.info
            results.push({
              balance: info.tokenAmount.uiAmountString,
              decimals: info.tokenAmount.decimals,
              mint: info.mint,
              symbol: `${info.mint.slice(0, 4)}...${info.mint.slice(-4)}`,
              tokenProgram: programId,
            })
          }
        }
      } catch {
        // Skip program if fetch fails
      }
    }

    return results
  },
  sendSol: async (recipient: string, amount: string): Promise<string> => {
    const bytes = await getDecryptedSecretKeyBytes()
    try {
      const keyPair = await createKeyPairSignerFromBytes(bytes)
      const rpcUrl = await getActiveRpcUrl()
      const rpc = createSolanaRpc(rpcUrl)

      const lamports = BigInt(Math.round(Number.parseFloat(amount) * 1_000_000_000))

      const instructions = createSolTransferInstructions({
        recipients: [{ amount: lamports, destination: address(recipient) }],
        source: keyPair,
      })

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions(instructions, tx),
        (tx) => setTransactionMessageFeePayerSigner(keyPair, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      )

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
      await sendTransaction(signedTransaction, { commitment: 'confirmed' })

      return getSignatureFromTransaction(signedTransaction)
    } finally {
      zeroMemory(bytes)
    }
  },

  sendSplToken: async (
    recipient: string,
    mint: string,
    amount: string,
    decimals: number,
    tokenProgram?: string,
  ): Promise<string> => {
    const bytes = await getDecryptedSecretKeyBytes()
    try {
      const keyPair = await createKeyPairSignerFromBytes(bytes)
      const rpcUrl = await getActiveRpcUrl()
      const rpc = createSolanaRpc(rpcUrl)

      const tokenAmount = BigInt(Math.round(Number.parseFloat(amount) * 10 ** decimals))
      const programAddress = tokenProgram ? (address(tokenProgram) as Address) : TOKEN_PROGRAM_ADDRESS

      const instructions = await createSplTransferInstructions({
        decimals,
        mint: address(mint),
        recipients: [{ amount: tokenAmount, destination: address(recipient) }],
        tokenProgram: programAddress,
        transactionSigner: keyPair,
      })

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions(instructions, tx),
        (tx) => setTransactionMessageFeePayerSigner(keyPair, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      )

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc })
      await sendTransaction(signedTransaction, { commitment: 'confirmed' })

      return getSignatureFromTransaction(signedTransaction)
    } finally {
      zeroMemory(bytes)
    }
  },
}))
