import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
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

export interface GaslessSolTransferOptions {
  connection: Connection
  sender: Keypair
  destination: PublicKey | string
  amountLamports: bigint
}

/**
 * Send SOL gaslessly through Kora
 * The sponsor's USDC will be used to pay for transaction fees
 */
export async function sendGaslessSolTransfer({
  connection,
  sender,
  destination,
  amountLamports,
}: GaslessSolTransferOptions): Promise<string> {
  console.log('🔄 Preparing gasless SOL transfer...')

  const destinationPubkey = typeof destination === 'string' ? new PublicKey(destination) : destination

  // Create SOL transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: destinationPubkey,
    lamports: Number(amountLamports),
  })

  // Build transaction with Kora as fee payer
  const blockhash = await fetchKoraBlockhash()
  const transaction = new Transaction()
  transaction.feePayer = KORA_FEE_PAYER
  transaction.recentBlockhash = blockhash
  transaction.add(transferInstruction)

  // User signs the transaction (authorizing the transfer from their account)
  transaction.partialSign(sender)

  // Send through Kora (gasless - Kora signs as fee payer and submits)
  const signature = await koraAdapter.sendTransaction(transaction, connection)

  console.log('✅ Gasless SOL transfer complete!')
  console.log('   Signature:', signature)
  console.log('   Amount:', Number(amountLamports) / 1e9, 'SOL')

  return signature
}
