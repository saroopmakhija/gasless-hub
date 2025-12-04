import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { koraAdapter } from './kora-adapter'

const KORA_FEE_PAYER = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU')

async function fetchKoraBlockhash(): Promise<string> {
  const KORA_RPC_URL = import.meta.env.VITE_KORA_RPC_URL || 'http://localhost:8080'
  const response = await fetch(`${KORA_RPC_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhash',
      params: [],
    }),
  })

  if (!response.ok) {
    throw new Error(`Kora RPC error: ${response.statusText}`)
  }

  const result = await response.json()
  if (result.error) {
    throw new Error(`Kora error: ${JSON.stringify(result.error)}`)
  }

  return result.result.blockhash as string
}

export interface GaslessSplTransferOptions {
  connection: Connection
  sender: Keypair
  destination: PublicKey | string
  mint: PublicKey | string
  amountBaseUnits: bigint
  decimals: number
}

/**
 * Send SPL tokens gaslessly through Kora
 * The sponsor's USDC will be used to pay for transaction fees
 */
export async function sendGaslessSplTransfer({
  connection,
  sender,
  destination,
  mint,
  amountBaseUnits,
  decimals,
}: GaslessSplTransferOptions): Promise<string> {
  console.log('🔄 Preparing gasless SPL token transfer...')

  const destinationPubkey = typeof destination === 'string' ? new PublicKey(destination) : destination
  const mintPubkey = typeof mint === 'string' ? new PublicKey(mint) : mint

  // Get token accounts
  const sourceTokenAccount = await getAssociatedTokenAddress(mintPubkey, sender.publicKey)
  const destinationTokenAccount = await getAssociatedTokenAddress(mintPubkey, destinationPubkey)

  // Check if destination token account exists, create if needed
  const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount)
  const instructions = []

  if (!destinationAccountInfo) {
    console.log('Creating destination token account...')
    const createAtaInstruction = createAssociatedTokenAccountInstruction(
      KORA_FEE_PAYER, // payer (Kora pays the rent)
      destinationTokenAccount,
      destinationPubkey, // owner
      mintPubkey,
    )
    instructions.push(createAtaInstruction)
  }

  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    sourceTokenAccount,
    destinationTokenAccount,
    sender.publicKey,
    Number(amountBaseUnits),
  )
  instructions.push(transferInstruction)

  // Build transaction with Kora as fee payer
  const blockhash = await fetchKoraBlockhash()
  const transaction = new Transaction()
  transaction.feePayer = KORA_FEE_PAYER
  transaction.recentBlockhash = blockhash
  transaction.add(...instructions)

  // User signs the transaction (authorizing the transfer from their token account)
  transaction.partialSign(sender)

  // Send through Kora (gasless - Kora signs as fee payer and submits)
  const signature = await koraAdapter.sendTransaction(transaction, connection)

  console.log('✅ Gasless SPL token transfer complete!')
  console.log('   Signature:', signature)
  console.log('   Amount:', Number(amountBaseUnits) / 10 ** decimals, 'tokens')

  return signature
}
