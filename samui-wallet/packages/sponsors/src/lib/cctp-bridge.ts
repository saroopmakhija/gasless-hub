import { BridgeKit, type BridgeResult } from '@circle-fin/bridge-kit'
import { createAdapterFromProvider as createViemProviderAdapter } from '@circle-fin/adapter-viem-v2'
import { createAdapterFromProvider as createSolanaProviderAdapter } from '@circle-fin/adapter-solana'

export type BridgeEvent =
  | { type: 'approve'; txHash?: string }
  | { type: 'burn'; txHash?: string }
  | { type: 'fetchAttestation'; attestation?: string }
  | { type: 'mint'; txHash?: string }
  | { type: 'error'; error: string }

export type BridgeProgressCallback = (event: BridgeEvent) => void

export type BaseWalletType = 'metamask' | 'phantom'

export interface CCTPBridgeConfig {
  amount: string
  feePoolAddress: string
  baseWallet?: BaseWalletType
  onProgress?: BridgeProgressCallback
}

/**
 * CCTP Bridge for transferring USDC from Base to Solana fee pool
 * Uses Circle's Cross-Chain Transfer Protocol to enable sponsors on Base
 * to deposit USDC into the Solana-based fee pool
 */
export class CCTPBridge {
  private kit: BridgeKit
  private baseAdapter: any
  private solanaAdapter: any
  private isInitialized = false

  constructor() {
    this.kit = new BridgeKit()
  }

  /**
   * Reset initialization state to allow re-initialization with different wallet
   */
  resetInitialization(): void {
    this.isInitialized = false
    this.baseAdapter = null
    this.solanaAdapter = null
  }

  /**
   * Initialize adapters from browser wallet providers
   */
  async initialize(baseWallet: BaseWalletType = 'metamask'): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Connect and initialize Base wallet based on user's choice
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        let provider: any
        let walletName: string

        if (baseWallet === 'phantom') {
          console.log('Looking for Phantom EVM wallet...')

          // Look for Phantom in providers array
          if ((window as any).ethereum.providers) {
            const phantomProvider = (window as any).ethereum.providers.find(
              (p: any) => p.isPhantom
            )
            if (phantomProvider) {
              provider = phantomProvider
              walletName = 'Phantom EVM'
              console.log('Found Phantom EVM in providers array')
            } else {
              throw new Error('Phantom wallet not found. Please install Phantom.')
            }
          } else if ((window as any).ethereum.isPhantom) {
            provider = (window as any).ethereum
            walletName = 'Phantom EVM'
            console.log('Using Phantom EVM as default provider')
          } else {
            throw new Error('Phantom wallet not found. Please install Phantom.')
          }
        } else {
          // Default to MetaMask
          console.log('Looking for MetaMask...')

          if ((window as any).ethereum.providers) {
            const metamaskProvider = (window as any).ethereum.providers.find(
              (p: any) => p.isMetaMask && !p.isPhantom
            )
            if (metamaskProvider) {
              provider = metamaskProvider
              walletName = 'MetaMask'
              console.log('Found MetaMask in providers array')
            } else {
              throw new Error('MetaMask not found. Please install MetaMask.')
            }
          } else if ((window as any).ethereum.isMetaMask && !(window as any).ethereum.isPhantom) {
            provider = (window as any).ethereum
            walletName = 'MetaMask'
            console.log('Using MetaMask as default provider')
          } else {
            throw new Error('MetaMask not found. Please install MetaMask.')
          }
        }

        // Request wallet connection from the specific provider
        const accounts = await provider.request({ method: 'eth_requestAccounts' })
        console.log(`Connected ${walletName} account:`, accounts[0])

        // Double-check we're on Base Sepolia
        const chainId = await provider.request({ method: 'eth_chainId' })
        console.log('Current chain ID:', chainId)
        if (chainId !== '0x14a34') {
          // Base Sepolia = 84532 = 0x14a34
          throw new Error(
            `Wrong network! Please switch ${walletName} to Base Sepolia network (Chain ID: 84532).`
          )
        }

        console.log(`Initializing Base wallet adapter with ${walletName}...`)
        console.log(`Using account: ${accounts[0]}`)

        this.baseAdapter = await createViemProviderAdapter({
          provider: provider as any,
        })

        console.log('✅ Base wallet adapter initialized successfully')
      } else {
        throw new Error('No Ethereum wallet detected. Please install MetaMask or Phantom.')
      }

      // Connect and initialize Solana wallet (Phantom)
      // Per Circle docs: user-controlled adapters CAN specify custom recipientAddress
      if (typeof window !== 'undefined' && (window as any).solana) {
        console.log('Connecting to Phantom Solana wallet...')
        await (window as any).solana.connect()

        console.log('Initializing Solana wallet adapter (user-controlled, supports custom recipientAddress)...')
        this.solanaAdapter = await createSolanaProviderAdapter({
          provider: (window as any).solana,
          // Default user-controlled - but we can still override recipientAddress in bridge() call
        })
        console.log('✅ Solana adapter initialized')
      } else {
        throw new Error('No Solana wallet detected. Please install Phantom.')
      }

      this.isInitialized = true
      console.log('✅ CCTP Bridge initialized')
    } catch (error) {
      console.error('Failed to initialize CCTP Bridge:', error)
      throw error
    }
  }

  /**
   * Validate transfer parameters
   */
  private validateParams(amount: string): void {
    const amountNum = parseFloat(amount)

    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid transfer amount')
    }

    if (amountNum > 10000) {
      throw new Error('Transfer amount exceeds maximum limit of 10,000 USDC')
    }

    if (amountNum < 0.1) {
      throw new Error('Transfer amount below minimum limit of 0.1 USDC')
    }
  }

  /**
   * Estimate bridge costs before execution
   */
  async estimateCost(config: CCTPBridgeConfig): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize(config.baseWallet)
    }

    this.validateParams(config.amount)

    try {
      console.log('📊 Estimating bridge costs...')
      console.log(`Recipient wallet: ${config.feePoolAddress}`)

      const estimate = await this.kit.estimate({
        from: {
          adapter: this.baseAdapter,
          chain: 'Base_Sepolia', // Change to Base_Mainnet for production
        },
        to: {
          adapter: this.solanaAdapter,
          chain: 'Solana_Devnet', // Change to Solana_Mainnet for production
          // Bridge Kit will derive the USDC ATA from the recipient wallet
          recipientAddress: config.feePoolAddress,
        },
        amount: config.amount,
        token: 'USDC',
        config: {
          transferSpeed: 'FAST',
          maxFee: '0.05', // Lower fee for small transfers
        },
      })

      console.log('Estimated gas fees:', estimate.gasFees)
      console.log('Estimated protocol fees:', estimate.fees)

      return estimate
    } catch (error) {
      console.error('Failed to estimate bridge cost:', error)
      throw new Error('Failed to estimate bridge cost. Please try again.')
    }
  }

  /**
   * Execute CCTP bridge from Base to Solana fee pool
   */
  async bridge(config: CCTPBridgeConfig): Promise<BridgeResult> {
    if (!this.isInitialized) {
      await this.initialize(config.baseWallet)
    }

    this.validateParams(config.amount)

    try {
      console.log(`🌉 Starting bridge of ${config.amount} USDC from Base to Solana...`)
      console.log(`Recipient wallet: ${config.feePoolAddress}`)

      // Set up event listeners for progress tracking
      if (config.onProgress) {
        this.setupEventListeners(config.onProgress)
      }

      console.log('🚀 Calling Bridge Kit (it will derive USDC ATA automatically)...')

      const result = await this.kit.bridge({
        from: {
          adapter: this.baseAdapter,
          chain: 'Base_Sepolia', // Change to Base_Mainnet for production
        },
        to: {
          adapter: this.solanaAdapter,
          chain: 'Solana_Devnet', // Change to Solana_Mainnet for production
          // Bridge Kit will derive the USDC ATA from the recipient wallet
          recipientAddress: config.feePoolAddress,
        },
        amount: config.amount,
        token: 'USDC',
        config: {
          transferSpeed: 'FAST',
          maxFee: '0.05', // Lower fee for small transfers
        },
      })

      if (result.state === 'success') {
        console.log('✅ Bridge completed successfully!')
        console.log(`Transferred: ${result.amount} USDC`)
        console.log(`From: ${result.source.address} (${result.source.chain})`)
        console.log(`To: ${result.destination.address} (${result.destination.chain})`)

        result.steps.forEach((step, index) => {
          console.log(`Step ${index + 1}: ${step.name} - ${step.state}`)
          if (step.explorerUrl) {
            console.log(`  Explorer: ${step.explorerUrl}`)
          }
        })

        if (config.onProgress) {
          config.onProgress({ type: 'mint', txHash: result.destination.address })
        }
      } else if (result.state === 'error') {
        console.error('Bridge failed:', result.state)

        result.steps.forEach((step) => {
          if (step.state === 'error') {
            console.error(`Failed step: ${step.name} - ${step.errorMessage}`)
          }
        })

        if (config.onProgress) {
          config.onProgress({
            type: 'error',
            error: result.steps.find((s) => s.state === 'error')?.errorMessage || 'Bridge failed',
          })
        }
      }

      return result
    } catch (error) {
      console.error('Bridge execution failed:', error)

      if (config.onProgress) {
        config.onProgress({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      throw error
    }
  }

  /**
   * Set up event listeners for bridge progress
   */
  private setupEventListeners(onProgress: BridgeProgressCallback): void {
    this.kit.on('approve', (payload) => {
      console.log('Approval in progress:', payload.values?.txHash)
      onProgress({ type: 'approve', txHash: payload.values?.txHash as string })
    })

    this.kit.on('burn', (payload) => {
      console.log('USDC burned on Base:', payload.values?.txHash)
      onProgress({ type: 'burn', txHash: payload.values?.txHash as string })
    })

    this.kit.on('fetchAttestation', (payload) => {
      console.log('Fetching attestation from Circle...')
      onProgress({ type: 'fetchAttestation', attestation: (payload.values as any)?.attestation })
    })

    this.kit.on('mint', (payload) => {
      console.log('USDC minted on Solana:', payload.values?.txHash)
      onProgress({ type: 'mint', txHash: payload.values?.txHash as string })
    })
  }

  /**
   * Retry a failed bridge operation
   */
  async retry(
    failedResult: BridgeResult,
    onProgress?: BridgeProgressCallback,
    baseWallet?: BaseWalletType,
  ): Promise<BridgeResult> {
    if (!this.isInitialized) {
      await this.initialize(baseWallet)
    }

    try {
      console.log('🔄 Retrying failed bridge operation...')

      if (onProgress) {
        this.setupEventListeners(onProgress)
      }

      const retryResult = await this.kit.retry(failedResult, {
        from: this.baseAdapter,
        to: this.solanaAdapter,
      })

      console.log('Retry completed:', retryResult.state)
      return retryResult
    } catch (error) {
      console.error('Bridge retry failed:', error)
      throw error
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains() {
    return this.kit.getSupportedChains()
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    this.kit.off('approve', () => {})
    this.kit.off('burn', () => {})
    this.kit.off('fetchAttestation', () => {})
    this.kit.off('mint', () => {})
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: any): string {
    const message = error?.message || ''

    if (message.includes('insufficient funds')) {
      return 'Insufficient USDC balance or ETH for gas fees'
    }
    if (message.includes('user rejected') || message.includes('denied')) {
      return 'Transaction was cancelled by user'
    }
    if (message.includes('network')) {
      return 'Network connection error. Please try again.'
    }
    if (message.includes('wallet')) {
      return 'Wallet connection error. Please reconnect your wallet.'
    }
    return 'Bridge operation failed. Please try again or contact support.'
  }
}

// Export singleton instance
export const cctpBridge = new CCTPBridge()
