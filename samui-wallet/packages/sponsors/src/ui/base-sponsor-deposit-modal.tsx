import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { UiLoader } from '@workspace/ui/components/ui-loader'
import { useState, useEffect } from 'react'
import { cctpBridge, CCTPBridge, type BaseWalletType } from '../lib/cctp-bridge'
import type { BridgeEvent } from '../lib/cctp-bridge'
import type { BridgeResult } from '@circle-fin/bridge-kit'

interface BaseSponsorDepositModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onMetadataSubmit?: (metadata: { name: string; email: string; organization?: string }) => void
  feePoolAddress?: string
  phantomAddress?: string
}

type DepositStep = 'input' | 'approve' | 'burn' | 'attestation' | 'mint' | 'success' | 'error'

export function BaseSponsorDepositModal({
  isOpen,
  onClose,
  onSuccess,
  onMetadataSubmit,
  feePoolAddress = 'CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU', // Default to Kora wallet
  phantomAddress,
}: BaseSponsorDepositModalProps) {
  // Always send to the sponsor pool; Phantom still signs and pays fees
  const recipientAddress = feePoolAddress
  const [step, setStep] = useState<DepositStep>('input')
  const [amount, setAmount] = useState('')
  const [baseWallet, setBaseWallet] = useState<BaseWalletType>('metamask')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTxHash, setCurrentTxHash] = useState('')
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null)
  const [estimatedCost, setEstimatedCost] = useState<any>(null)
  const [metadata, setMetadata] = useState({ name: '', email: '', organization: '' })
  const [metadataSaved, setMetadataSaved] = useState(false)
  const [metadataError, setMetadataError] = useState('')

  // Reset bridge initialization when wallet selection changes
  useEffect(() => {
    cctpBridge.resetInitialization()
    setEstimatedCost(null)
    console.log(`Base wallet changed to: ${baseWallet}`)
  }, [baseWallet])

  const handleReset = () => {
    setStep('input')
    setAmount('')
    setError('')
    setCurrentTxHash('')
    setBridgeResult(null)
    setEstimatedCost(null)
    setLoading(false)
    setMetadata({ name: '', email: '', organization: '' })
    setMetadataSaved(false)
    setMetadataError('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleEstimate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    setError('')

    try {
      const estimate = await cctpBridge.estimateCost({
        amount,
        feePoolAddress: recipientAddress,
        baseWallet,
      })

      setEstimatedCost(estimate)
      console.log('Bridge cost estimate:', estimate)
    } catch (err) {
      const errorMessage = CCTPBridge.getErrorMessage(err)
      setError(errorMessage)
      console.error('Estimation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProgressUpdate = (event: BridgeEvent) => {
    console.log('Bridge progress:', event)

    switch (event.type) {
      case 'approve':
        setStep('approve')
        if (event.txHash) {
          setCurrentTxHash(event.txHash)
        }
        break
      case 'burn':
        setStep('burn')
        if (event.txHash) {
          setCurrentTxHash(event.txHash)
        }
        break
      case 'fetchAttestation':
        setStep('attestation')
        break
      case 'mint':
        setStep('mint')
        if (event.txHash) {
          setCurrentTxHash(event.txHash)
        }
        setTimeout(() => {
          setStep('success')
          setLoading(false)
        }, 1000)
        break
      case 'error':
        setStep('error')
        setError(event.error)
        setLoading(false)
        break
    }
  }

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    setError('')
    setStep('approve')

    try {
      console.log('Starting CCTP bridge from Base to Solana...')

      const result = await cctpBridge.bridge({
        amount,
        feePoolAddress: recipientAddress,
        baseWallet,
        onProgress: handleProgressUpdate,
      })

      setBridgeResult(result)

      if (result.state === 'success') {
        setStep('success')
      } else if (result.state === 'error') {
        setStep('error')
        setError('Bridge operation failed. Please check the transaction and try again.')
      } else if (result.state === 'pending') {
        setError(
          'Bridge is still pending. This may take 10-20 minutes. Please check back later.',
        )
      }
    } catch (err) {
      const errorMessage = CCTPBridge.getErrorMessage(err)
      setError(errorMessage)
      setStep('error')
      console.error('Bridge error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMetadataSubmit = () => {
    setMetadataError('')

    if (!metadata.name.trim() || !metadata.email.trim()) {
      setMetadataError('Name and email are required')
      return
    }

    onMetadataSubmit?.({
      name: metadata.name.trim(),
      email: metadata.email.trim(),
      organization: metadata.organization.trim() || undefined,
    })

    setMetadataSaved(true)
    onSuccess?.()
  }

  const handleRetry = async () => {
    if (!bridgeResult) return

    setLoading(true)
    setError('')
    setStep('approve')

    try {
      const retryResult = await cctpBridge.retry(bridgeResult, handleProgressUpdate, baseWallet)

      setBridgeResult(retryResult)

      if (retryResult.state === 'success') {
        setStep('success')
        onSuccess?.()
      } else {
        setError('Retry failed. Please try again later.')
        setStep('error')
      }
    } catch (err) {
      const errorMessage = CCTPBridge.getErrorMessage(err)

      setError(errorMessage)
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const getStepMessage = () => {
    switch (step) {
      case 'input':
        return 'Enter deposit amount'
      case 'approve':
        return 'Approving USDC transfer...'
      case 'burn':
        return 'Burning USDC on Base...'
      case 'attestation':
        return 'Fetching attestation from Circle... (this may take 1-2 minutes)'
      case 'mint':
        return 'Minting USDC on Solana...'
      case 'success':
        return 'Deposit successful!'
      case 'error':
        return 'Deposit failed'
      default:
        return ''
    }
  }

  const getExplorerUrl = (txHash: string, chain: 'base' | 'solana') => {
    if (chain === 'base') {
      return `https://sepolia.basescan.org/tx/${txHash}`
    }
    return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deposit from Base</DialogTitle>
          <DialogDescription>
            Bridge USDC from Base to Solana fee pool using Circle's CCTP
            <br />
            <span className="text-yellow-600 dark:text-yellow-400 text-xs mt-2 block">
              ⚠️ Requires a Base wallet (MetaMask or Phantom EVM) and Phantom for Solana
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'input' && (
            <>
              <div className="space-y-2">
                <Label>Base Wallet</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="baseWallet"
                      value="metamask"
                      checked={baseWallet === 'metamask'}
                      onChange={(e) => setBaseWallet(e.target.value as BaseWalletType)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">MetaMask</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="baseWallet"
                      value="phantom"
                      checked={baseWallet === 'phantom'}
                      onChange={(e) => setBaseWallet(e.target.value as BaseWalletType)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Phantom EVM</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which wallet to use for Base Sepolia transactions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="10.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.1"
                  max="10000"
                  step="0.1"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Minimum: 0.1 USDC, Maximum: 10,000 USDC</p>
              </div>

              {estimatedCost && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Estimated Costs</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gas Fees:</span>
                      <span>{estimatedCost.gasFees || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocol Fees:</span>
                      <span>{estimatedCost.fees || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleEstimate} disabled={loading || !amount} variant="outline" className="flex-1">
                  {loading ? <UiLoader /> : 'Estimate Cost'}
                </Button>
                <Button onClick={handleDeposit} disabled={loading || !amount} className="flex-1">
                  {loading ? <UiLoader /> : 'Deposit'}
                </Button>
              </div>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  This will bridge {amount || '0'} USDC from Base to the Solana fee pool. The process takes 10-20 minutes.
                  Make sure you have ETH in your Base wallet for gas fees.
                </p>
              </div>
            </>
          )}

          {(step === 'approve' || step === 'burn' || step === 'attestation' || step === 'mint') && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <UiLoader />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold">{getStepMessage()}</h3>
                  <p className="text-sm text-muted-foreground">Please wait, do not close this window</p>
                </div>
              </div>

              {currentTxHash && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h4 className="font-semibold text-sm mb-2">Transaction Hash</h4>
                  <a
                    href={getExplorerUrl(currentTxHash, step === 'mint' ? 'solana' : 'base')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {currentTxHash}
                  </a>
                </div>
              )}

              {step === 'attestation' && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Waiting for Circle attestation service. This typically takes 1-2 minutes but may take longer during
                    network congestion.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="rounded-full bg-green-500/20 p-4">
                  <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Deposit Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    {amount} USDC has been deposited to the Solana fee pool
                  </p>
                </div>
              </div>

              {bridgeResult && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Transaction Details</h4>
                  <div className="space-y-2 text-xs">
                    {bridgeResult.steps.map((step, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{step.name}</span>
                        {step.explorerUrl && (
                          <a
                            href={step.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!metadataSaved && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/60">
                  <h4 className="font-semibold text-sm">Sponsor contact (optional but helpful)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-name">Name *</Label>
                    <Input
                      id="sponsor-name"
                      value={metadata.name}
                      onChange={(e) => setMetadata((m) => ({ ...m, name: e.target.value }))}
                      placeholder="Jane Doe"
                      disabled={metadataSaved}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-email">Email *</Label>
                    <Input
                      id="sponsor-email"
                      type="email"
                      value={metadata.email}
                      onChange={(e) => setMetadata((m) => ({ ...m, email: e.target.value }))}
                      placeholder="jane@example.com"
                      disabled={metadataSaved}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-org">Organization</Label>
                    <Input
                      id="sponsor-org"
                      value={metadata.organization}
                      onChange={(e) => setMetadata((m) => ({ ...m, organization: e.target.value }))}
                      placeholder="Kora Labs"
                      disabled={metadataSaved}
                    />
                  </div>
                  {metadataError && <p className="text-xs text-destructive">{metadataError}</p>}
                  <Button onClick={handleMetadataSubmit} disabled={metadataSaved} className="w-full">
                    {metadataSaved ? 'Saved' : 'Save Sponsor Info'}
                  </Button>
                </div>
              )}

              <Button onClick={handleClose} className="w-full" variant={metadataSaved ? 'default' : 'outline'}>
                {metadataSaved ? 'Close' : 'Skip & Close'}
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="rounded-full bg-red-500/20 p-4">
                  <svg
                    className="w-12 h-12 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Deposit Failed</h3>
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>

              <div className="flex gap-3">
                {bridgeResult && (
                  <Button onClick={handleRetry} variant="outline" className="flex-1">
                    Retry
                  </Button>
                )}
                <Button onClick={handleReset} className="flex-1">
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
