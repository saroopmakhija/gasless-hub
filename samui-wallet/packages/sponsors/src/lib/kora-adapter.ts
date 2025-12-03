import type { Connection, SendOptions, Transaction, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'

const KORA_RPC_URL = import.meta.env.VITE_KORA_RPC_URL || 'http://localhost:8080'

export class KoraTransactionAdapter {
  private async getKoraBlockhash(): Promise<string> {
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

  /**
   * Send transaction through Kora (gasless)
   * Kora will sign as fee payer and submit to network
   */
  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendOptions,
  ): Promise<string> {
    try {
      console.log('🔄 Routing transaction through Kora (gasless)...')

      // Serialize the transaction
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })

      const base64Tx = Buffer.from(serializedTx).toString('base64')

      // Send to Kora RPC for signing and broadcasting
      const response = await fetch(`${KORA_RPC_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'signAndSendTransaction',
          params: {
            transaction: base64Tx,
            sig_verify: false, // Disable signature verification during simulation
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Kora RPC error: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(`Kora error: ${JSON.stringify(result.error)}`)
      }

      // Extract signature from the signed transaction
      const signedTxBase64 = result.result.signed_transaction
      const signedTxBuffer = Buffer.from(signedTxBase64, 'base64')

      // Deserialize to get signature
      let signature: string
      try {
        const { VersionedTransaction } = await import('@solana/web3.js')
        const signedTx = VersionedTransaction.deserialize(signedTxBuffer)
        signature = bs58.encode(signedTx.signatures[0])
      } catch {
        // Fallback for legacy transactions
        const { Transaction } = await import('@solana/web3.js')
        const signedTx = Transaction.from(signedTxBuffer)
        signature = bs58.encode(signedTx.signatures[0].signature!)
      }

      console.log('✅ Transaction signed and broadcast by Kora!')
      console.log('   Signature:', signature)
      console.log('   🎉 NO SOL spent on fees!')

      return signature
    } catch (error) {
      console.error('❌ Kora transaction error:', error)
      throw error
    }
  }

  /**
   * Sign transaction through Kora without sending
   */
  async signTransaction(
    transaction: Transaction | VersionedTransaction,
  ): Promise<Transaction | VersionedTransaction> {
    try {
      console.log('🔄 Requesting Kora signature...')

      // Ensure blockhash matches what Kora sees
      if (!transaction.recentBlockhash) {
        const blockhash = await this.getKoraBlockhash()
        transaction.recentBlockhash = blockhash
      }

      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })

      const base64Tx = Buffer.from(serializedTx).toString('base64')

      const response = await fetch(`${KORA_RPC_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'signTransaction',
          params: {
            transaction: base64Tx,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Kora RPC error: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(`Kora error: ${JSON.stringify(result.error)}`)
      }

      const signedTxBuffer = Buffer.from(result.result.signed_transaction, 'base64')

      const { Transaction, VersionedTransaction } = await import('@solana/web3.js')

      if (transaction instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signedTxBuffer)
      }
      return Transaction.from(signedTxBuffer)
    } catch (error) {
      console.error('❌ Kora signing error:', error)
      throw error
    }
  }

  /**
   * Check if Kora is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${KORA_RPC_URL}/health`, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton instance
export const koraAdapter = new KoraTransactionAdapter()
