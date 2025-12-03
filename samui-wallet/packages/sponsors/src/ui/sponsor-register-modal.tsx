import { Button } from '@workspace/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { UiLoader } from '@workspace/ui/components/ui-loader'
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, Keypair, VersionedTransaction, TransactionMessage } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useState } from 'react'
import { koraAdapter } from '../lib/kora-adapter'
import { useAccountReadSecretKey } from '@workspace/db-react/use-account-read-secret-key'

interface SponsorRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  publicKey: PublicKey | null
  accountId?: string
}

const FEE_POOL_PROGRAM_ID = import.meta.env['VITE_FEE_POOL_PROGRAM_ID'] || 'Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K'
const USDC_MINT = import.meta.env['VITE_USDC_MINT'] || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const USDC_VAULT_OVERRIDE = import.meta.env['VITE_USDC_VAULT'] || '6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk'

console.log('ENV CHECK:', { mint: USDC_MINT, vault: USDC_VAULT_OVERRIDE })
const SOLANA_RPC_URL = import.meta.env['VITE_SOLANA_RPC_URL'] || 'https://api.devnet.solana.com'
const KORA_FEE_PAYER = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU')
const KORA_RPC_URL = import.meta.env['VITE_KORA_RPC_URL'] || 'http://localhost:8080'
const SET_SPONSOR_METADATA_DISCRIMINATOR = Buffer.from([144, 139, 146, 240, 87, 58, 92, 90])
const INIT_SPONSOR_METADATA_DISCRIMINATOR = Buffer.from([47, 167, 148, 61, 177, 33, 60, 80])

export function SponsorRegisterModal({ isOpen, onClose, onSuccess, publicKey, accountId }: SponsorRegisterModalProps) {
  const { mutateAsync: readSecretKey } = useAccountReadSecretKey()
  const [step, setStep] = useState<'metadata' | 'deposit' | 'success'>('metadata')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txSignature, setTxSignature] = useState('')

  const fetchKoraBlockhash = async (): Promise<string> => {
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
      throw new Error(`Kora blockhash error: ${response.statusText}`)
    }
    const result = await response.json()
    if (result.error) {
      throw new Error(`Kora blockhash error: ${JSON.stringify(result.error)}`)
    }
    return result.result.blockhash as string
  }

  const handleReset = () => {
    setStep('metadata')
    setName('')
    setWebsite('')
    setLogoUrl('')
    setDepositAmount('')
    setError('')
    setTxSignature('')
    setLoading(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSetMetadata = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first')
      return
    }

    if (!name || name.length > 32) {
      setError('Name is required and must be ≤ 32 characters')
      return
    }

    if (website && website.length > 64) {
      setError('Website must be ≤ 64 characters')
      return
    }

    if (logoUrl && logoUrl.length > 128) {
      setError('Logo URL must be ≤ 128 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
      const programId = new PublicKey(FEE_POOL_PROGRAM_ID)
      const serializeMetadata = () => {
        const nameBytes = Buffer.from(name, 'utf8')
        const websiteBytes = Buffer.from(website, 'utf8')
        const logoUrlBytes = Buffer.from(logoUrl, 'utf8')

        return Buffer.concat([
          SET_SPONSOR_METADATA_DISCRIMINATOR,
          Buffer.from(new Uint32Array([nameBytes.length]).buffer),
          nameBytes,
          Buffer.from(new Uint32Array([websiteBytes.length]).buffer),
          websiteBytes,
          Buffer.from(new Uint32Array([logoUrlBytes.length]).buffer),
          logoUrlBytes,
        ])
      }

      // Derive sponsor metadata PDA
      const [sponsorMetadataPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('sponsor_metadata'), publicKey.toBuffer()],
        programId,
      )

      // Check if account exists and what its owner is
      const existingAccount = await connection.getAccountInfo(sponsorMetadataPda)
      if (existingAccount && !existingAccount.owner.equals(programId)) {
        throw new Error(
          `Account at ${sponsorMetadataPda.toBase58()} exists but is owned by ${existingAccount.owner.toBase58()}, expected ${programId.toBase58()}`
        )
      }

      console.log('PDA derivation:', {
        pda: sponsorMetadataPda.toBase58(),
        bump,
        seeds: ['sponsor_metadata', publicKey.toBase58()],
        accountExists: !!existingAccount,
      })

      // Create transaction for init or update
      if (!existingAccount) {
        console.log('Account does not exist, initializing via backend...')

        const maxInitRetries = 1
        for (let attempt = 0; attempt <= maxInitRetries; attempt++) {
          const initInstruction = new TransactionInstruction({
            programId: programId,
            keys: [
              { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
              { pubkey: KORA_FEE_PAYER, isSigner: true, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.concat([
              INIT_SPONSOR_METADATA_DISCRIMINATOR,
              serializeMetadata().subarray(SET_SPONSOR_METADATA_DISCRIMINATOR.length),
            ]),
          })

          if (!accountId) {
            throw new Error('No account ID available')
          }
          const initSecretKeyResult = await readSecretKey({ id: accountId })
          if (!initSecretKeyResult) {
            throw new Error('Failed to read secret key')
          }
          const initSecretKeyBytes = new Uint8Array(JSON.parse(initSecretKeyResult))
          const initUserKeypair = Keypair.fromSecretKey(initSecretKeyBytes)

          // Build transaction with FRESH blockhash right before sending
          const initTransaction = new Transaction()
          initTransaction.feePayer = KORA_FEE_PAYER
          initTransaction.recentBlockhash = await fetchKoraBlockhash()
          initTransaction.add(initInstruction)
          initTransaction.partialSign(initUserKeypair)

          // Send to backend immediately to add Kora's signature and submit
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
          const createResponse = await fetch(`${backendUrl}/api/sponsors/create-metadata-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionBase64: initTransaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
            }),
          })

          if (createResponse.ok) {
            const createResult = await createResponse.json()
            console.log('✅ Account initialized via backend! Signature:', createResult.signature)
            await connection.confirmTransaction(createResult.signature, 'confirmed')
            break
          }

          const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }))
          const msg = errorData.error || createResponse.statusText
          const canRetry =
            attempt < maxInitRetries &&
            createResponse.status === 400 &&
            msg.toLowerCase().includes('blockhash expired')
          if (canRetry) {
            console.warn('Blockhash expired on backend; retrying init with a fresh blockhash')
            continue
          }
          throw new Error(`Failed to create account: ${msg}`)
        }

        setStep('deposit')
        return
      }

      const instruction = new TransactionInstruction({
        programId: programId,
        keys: [
          { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: false },
        ],
        data: serializeMetadata(),
      })

      console.log('Instruction accounts:', {
        sponsorMetadata: sponsorMetadataPda.toBase58(),
        sponsor: publicKey.toBase58(),
        programId: programId.toBase58(),
      })

      // Create transaction with fee payer set first (important for Kora)
      const blockhash = await fetchKoraBlockhash()
      const transaction = new Transaction()
      transaction.feePayer = KORA_FEE_PAYER
      transaction.recentBlockhash = blockhash
      transaction.add(instruction)

      // Get user's secret key and sign the transaction
      if (!accountId) {
        throw new Error('No account ID available')
      }
      const secretKeyResult = await readSecretKey({ id: accountId })
      if (!secretKeyResult) {
        throw new Error('Failed to read secret key')
      }
      // Secret key is stored as JSON array of bytes
      const secretKeyBytes = new Uint8Array(JSON.parse(secretKeyResult))
      const userKeypair = Keypair.fromSecretKey(secretKeyBytes)
      transaction.partialSign(userKeypair)

      // Use Kora to sign and send the transaction
      const signature = await koraAdapter.sendTransaction(transaction, connection)
      console.log('✅ Metadata updated! Signature:', signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setStep('deposit')
    } catch (err: any) {
      console.error('Error setting metadata:', err)
      // Check if it's the Kora simulation error
      if (err.message && err.message.includes('0xbc0')) {
        setError(
          'Kora simulation error. The account may have been created. Please try again - if it still fails, the account may need to be created manually.'
        )
      } else {
        setError(err.message || 'Failed to set metadata')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first')
      return
    }

    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) {
      setError('Please enter a valid deposit amount')
      return
    }

    setLoading(true)
    setError('')

    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
      const programId = new PublicKey(FEE_POOL_PROGRAM_ID)
      const usdcMint = new PublicKey(USDC_MINT)

      // Derive PDAs
      const [feePoolPda] = PublicKey.findProgramAddressSync([Buffer.from('fee_pool')], programId)
      const [sponsorRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sponsor_record'), publicKey.toBuffer()],
        programId,
      )
      // Allow explicit vault override (for pre-created vault token account)
      const usdcVaultPda = USDC_VAULT_OVERRIDE
        ? new PublicKey(USDC_VAULT_OVERRIDE)
        : PublicKey.findProgramAddressSync([Buffer.from('usdc_vault'), usdcMint.toBuffer()], programId)[0]

      // Sponsor provides USDC from their account (Kora only pays SOL fees)
      const payerUsdcAccount = await getAssociatedTokenAddress(usdcMint, publicKey)

      // Check if sponsor's USDC account exists, create if needed
      const accountInfo = await connection.getAccountInfo(payerUsdcAccount)
      const instructions = []

      if (!accountInfo) {
        console.log('Creating sponsor USDC account...')
        const createAtaIx = await import('@solana/spl-token').then(({ createAssociatedTokenAccountInstruction }) =>
          createAssociatedTokenAccountInstruction(
            KORA_FEE_PAYER, // payer (Kora pays the rent)
            payerUsdcAccount,
            publicKey, // owner
            usdcMint,
          ),
        )
        instructions.push(createAtaIx)
      }

      // Build sponsor_deposit instruction
      const discriminator = Buffer.from([206, 47, 139, 60, 184, 252, 38, 155])
      const amountInBaseUnits = Math.floor(amount * 1_000_000)
      const amountBuffer = Buffer.alloc(8)
      amountBuffer.writeBigUInt64LE(BigInt(amountInBaseUnits), 0)

      const data = Buffer.concat([discriminator, amountBuffer])

      const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111')

      const depositInstruction = new TransactionInstruction({
        keys: [
          { pubkey: feePoolPda, isSigner: false, isWritable: true },
          { pubkey: sponsorRecordPda, isSigner: false, isWritable: true },
          { pubkey: usdcVaultPda, isSigner: false, isWritable: true },
          { pubkey: payerUsdcAccount, isSigner: false, isWritable: true },
          { pubkey: KORA_FEE_PAYER, isSigner: true, isWritable: true }, // payer funds rent
          { pubkey: publicKey, isSigner: true, isWritable: true }, // sponsor (owner of USDC being transferred)
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data,
      })
      instructions.push(depositInstruction)

      // Create transaction with fee payer set first (important for Kora)
      const blockhash = await fetchKoraBlockhash()
      const transaction = new Transaction()
      transaction.feePayer = KORA_FEE_PAYER
      transaction.recentBlockhash = blockhash

      // Add all instructions (ATA creation if needed + deposit)
      instructions.forEach((ix) => transaction.add(ix))

      // Get user's secret key and sign the transaction
      if (!accountId) {
        throw new Error('No account ID available')
      }
      const secretKeyResult = await readSecretKey({ id: accountId })
      if (!secretKeyResult) {
        throw new Error('Failed to read secret key')
      }
      // Secret key is stored as JSON array of bytes
      const secretKeyBytes = new Uint8Array(JSON.parse(secretKeyResult))
      const userKeypair = Keypair.fromSecretKey(secretKeyBytes)
      transaction.partialSign(userKeypair)

      // Use Kora to sign and send the transaction
      const signature = await koraAdapter.sendTransaction(transaction, connection)
      console.log('✅ Deposit successful! Signature:', signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setTxSignature(signature)
      setStep('success')

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('Error depositing:', err)
      setError(err.message || 'Failed to deposit USDC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Become a Sponsor ({step === 'metadata' ? '1' : step === 'deposit' ? '2' : '3'}/3)</DialogTitle>
          <DialogDescription>
            {step === 'metadata' && 'Tell us about your brand'}
            {step === 'deposit' && 'Deposit USDC to fund gasless transactions'}
            {step === 'success' && 'Success! Your sponsorship is active'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'metadata' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name (max 32 chars)</Label>
                <Input
                  disabled={loading}
                  id="name"
                  maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Corp"
                  value={name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website URL (max 64 chars)</Label>
                <Input
                  disabled={loading}
                  id="website"
                  maxLength={64}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbrand.com"
                  type="url"
                  value={website}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL (max 128 chars)</Label>
                <Input
                  disabled={loading}
                  id="logoUrl"
                  maxLength={128}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://yourbrand.com/logo.png"
                  type="url"
                  value={logoUrl}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button disabled={loading} onClick={handleSetMetadata} className="w-full">
                {loading ? <UiLoader /> : 'Register Brand Info'}
              </Button>
            </>
          )}

          {step === 'deposit' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Deposit Amount (USDC)</Label>
                <Input
                  disabled={loading}
                  id="amount"
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="1000"
                  step="any"
                  type="number"
                  value={depositAmount}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button disabled={loading} onClick={handleDeposit} className="w-full">
                {loading ? <UiLoader /> : 'Deposit USDC'}
              </Button>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center py-4">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-lg font-semibold mb-2">Success!</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your brand is now registered and your deposit has been added to the gasless pool.
                </p>
                {txSignature && (
                  <a
                    className="text-sm text-primary hover:underline"
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=custom`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Transaction
                  </a>
                )}
              </div>
              <Button className="w-full" onClick={handleClose}>
                Close
              </Button>
            </>
          )}

          {step !== 'success' && (
            <Button className="w-full" onClick={handleClose} variant="outline">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
