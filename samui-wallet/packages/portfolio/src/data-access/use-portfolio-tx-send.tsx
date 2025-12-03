import { useMutation } from '@tanstack/react-query'
import { tryCatch } from '@workspace/core/try-catch'
import { useAccountActive } from '@workspace/db-react/use-account-active'
import { useAccountReadSecretKey } from '@workspace/db-react/use-account-read-secret-key'
import { NATIVE_MINT } from '@workspace/solana-client/constants'
import { toastError } from '@workspace/ui/lib/toast-error'
import { toastSuccess } from '@workspace/ui/lib/toast-success'
import { sendGaslessSolTransfer } from '@workspace/sponsors/lib/gasless-sol-transfer'
import { sendGaslessSplTransfer } from '@workspace/sponsors/lib/gasless-spl-transfer'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { solToLamports } from '@workspace/solana-client/sol-to-lamports'
import type { TokenBalance } from './use-get-token-metadata.ts'

export interface PortfolioTxSendInput {
  amount: string
  destination: string
  mint: TokenBalance
}

export function usePortfolioTxSend() {
  const account = useAccountActive()
  const readSecretKeyMutation = useAccountReadSecretKey()

  async function handleSendSplToken(input: PortfolioTxSendInput): Promise<void> {
    const tokenSymbol = input.mint.metadata?.symbol ?? 'Token'
    const secretKey = await readSecretKeyMutation.mutateAsync({ id: account.id })
    if (!secretKey) {
      throw new Error(`No secret key for this account`)
    }

    // Use gasless transfer (Kora pays fees using sponsor's USDC)
    const secretKeyBytes = new Uint8Array(JSON.parse(secretKey))
    const senderKeypair = Keypair.fromSecretKey(secretKeyBytes)
    const rpcUrl = import.meta.env['VITE_SOLANA_RPC_URL'] || 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')

    // Convert amount to base units (with decimals)
    const amountBaseUnits = BigInt(Math.floor(parseFloat(input.amount) * 10 ** input.mint.decimals))

    const { data: result, error: sendError } = await tryCatch(
      sendGaslessSplTransfer({
        connection,
        sender: senderKeypair,
        destination: input.destination,
        mint: new PublicKey(input.mint.mint),
        amountBaseUnits,
        decimals: input.mint.decimals,
      }),
    )

    if (sendError) {
      toastError(`Error sending ${tokenSymbol}: ${sendError}`)
      return
    }

    if (result) {
      toastSuccess(`${tokenSymbol} has been sent!`)
    } else {
      toastError(`Failed to send ${tokenSymbol}`)
    }
  }

  async function handleSendSol(input: PortfolioTxSendInput): Promise<void> {
    const secretKey = await readSecretKeyMutation.mutateAsync({ id: account.id })
    if (!secretKey) {
      throw new Error(`No secret key for this account`)
    }

    // Use gasless transfer (Kora pays fees using sponsor's USDC)
    const secretKeyBytes = new Uint8Array(JSON.parse(secretKey))
    const senderKeypair = Keypair.fromSecretKey(secretKeyBytes)
    const rpcUrl = import.meta.env['VITE_SOLANA_RPC_URL'] || 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')

    const { data: result, error: sendError } = await tryCatch(
      sendGaslessSolTransfer({
        connection,
        sender: senderKeypair,
        destination: input.destination,
        amountLamports: solToLamports(input.amount),
      }),
    )

    if (sendError) {
      toastError(`Error sending SOL: ${sendError}`)
      return
    }

    if (result) {
      toastSuccess('SOL has been sent!')
    } else {
      toastError('Failed to send SOL')
    }
  }

  return useMutation({
    mutationFn: (input: PortfolioTxSendInput) => {
      if (input.mint.mint === NATIVE_MINT) {
        return handleSendSol(input)
      }
      return handleSendSplToken(input)
    },
  })
}
