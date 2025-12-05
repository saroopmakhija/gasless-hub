# Cross-Chain Transfer Protocol (CCTP) Integration

## Overview

Gasless Hub now supports **cross-chain sponsor deposits** using Circle's Cross-Chain Transfer Protocol (CCTP). This allows sponsors on Base (Ethereum L2) to deposit USDC directly into the Solana fee pool, showcasing a sophisticated multi-chain payment solution.

## What is CCTP?

Circle's Cross-Chain Transfer Protocol (CCTP) is a trust-minimized protocol that enables USDC to move seamlessly between blockchains. Instead of traditional bridging that locks tokens, CCTP:

1. **Burns USDC** on the source chain (Base)
2. **Obtains attestation** from Circle's attestation service
3. **Mints USDC** on the destination chain (Solana)

This ensures 1:1 parity and eliminates wrapped token risk.

## Architecture

```
┌─────────────┐                  ┌──────────────┐                 ┌─────────────┐
│  Base       │                  │   Circle     │                 │  Solana     │
│  Sponsor    │                  │  Attestation │                 │  Fee Pool   │
│             │                  │   Service    │                 │             │
└──────┬──────┘                  └──────┬───────┘                 └──────┬──────┘
       │                                │                                │
       │  1. Burn USDC                  │                                │
       ├────────────────────────────────┤                                │
       │                                │                                │
       │  2. Request Attestation        │                                │
       │  ───────────────────────────►  │                                │
       │                                │                                │
       │  3. Return Attestation         │                                │
       │  ◄───────────────────────────  │                                │
       │                                │                                │
       │  4. Mint USDC with Attestation │                                │
       ├────────────────────────────────┼────────────────────────────────►
       │                                │                                │
       │                                │  5. USDC in Fee Pool           │
       │                                │        ✓                       │
```

## Key Features

### 1. Seamless Cross-Chain Experience
- Sponsors can deposit from Base without manually bridging
- Single transaction from sponsor's perspective
- Real-time progress tracking through the UI

### 2. Trust-Minimized Security
- Native USDC (not wrapped tokens)
- Circle's attestation service validates all burns
- No third-party bridge risks

### 3. Fast Transfer Times
- **FAST mode**: 10-20 minutes
- **STANDARD mode**: 15-30 minutes
- Progress updates at each step (Approve → Burn → Attestation → Mint)

### 4. Cost Efficiency
- Only pays gas fees on Base (significantly cheaper than Ethereum mainnet)
- Solana mint costs paid by fee pool
- No additional bridge protocol fees

## Implementation Details

### Dependencies

```json
{
  "@circle-fin/bridge-kit": "1.1.1",
  "@circle-fin/adapter-viem-v2": "1.1.1",
  "@circle-fin/adapter-solana": "1.1.2",
  "viem": "^2.40.3"
}
```

### Core Components

#### 1. CCTP Bridge Service (`cctp-bridge.ts`)

Handles all cross-chain transfer logic:
- Initializes wallet adapters for Base and Solana
- Manages transaction flow (burn, attest, mint)
- Provides real-time progress callbacks
- Implements retry logic for failed transactions

```typescript
import { cctpBridge } from '@workspace/sponsors/lib/cctp-bridge'

// Bridge USDC from Base to Solana
const result = await cctpBridge.bridge({
  amount: '10.0', // USDC amount
  feePoolAddress: 'SolanaVaultAddress...',
  onProgress: (event) => {
    console.log('Progress:', event.type)
  }
})
```

#### 2. Base Sponsor Deposit Modal (`base-sponsor-deposit-modal.tsx`)

UI component for the bridge experience:
- Amount input with validation (0.1 - 10,000 USDC)
- Cost estimation before bridging
- Real-time progress tracking with visual indicators
- Transaction explorer links for each step
- Retry mechanism for failed transfers

### Network Configuration

#### Testnet (Development)

| Chain | Network | USDC Address |
|-------|---------|--------------|
| Base | Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Solana | Devnet | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

#### Mainnet (Production)

| Chain | Network | USDC Address |
|-------|---------|--------------|
| Base | Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Solana | Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

**Note:** Contract addresses are managed automatically by Bridge Kit based on the configured network.

## User Flow

### For Sponsors

1. **Click "Base Deposit (CCTP)"** on the Sponsors page
2. **Enter USDC amount** (minimum 0.1 USDC)
3. **(Optional) Estimate costs** to see gas fees
4. **Click "Deposit"** to initiate the bridge
5. **Approve USDC spending** in MetaMask (Base wallet)
6. **Wait for burn transaction** (~1-2 minutes)
7. **Attestation fetched** from Circle (~1-2 minutes)
8. **USDC minted** on Solana (~30 seconds)
9. **Success!** USDC is now in the Solana fee pool

### Progress Tracking

The UI shows real-time progress through these steps:

```
1. ⏳ Approving USDC transfer...
2. 🔥 Burning USDC on Base...
3. 📝 Fetching attestation from Circle...
4. ✨ Minting USDC on Solana...
5. ✅ Deposit successful!
```

Each step includes transaction hashes and explorer links.

## Testing Guide

### Prerequisites

1. **Base Sepolia ETH** for gas fees
   - Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

2. **Base Sepolia USDC** for bridging
   - Circle Faucet: https://faucet.circle.com

3. **MetaMask** with Base Sepolia network configured
   - Network: Base Sepolia
   - RPC: https://sepolia.base.org

4. **Phantom Wallet** for Solana Devnet

### Step-by-Step Test

1. **Get Testnet Tokens**
   ```bash
   # Get Base Sepolia ETH
   Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

   # Get Base Sepolia USDC
   Visit: https://faucet.circle.com
   Select: Base Sepolia
   Amount: 10 USDC
   ```

2. **Navigate to Sponsors Page**
   ```
   App → Sponsors → Base Deposit (CCTP)
   ```

3. **Enter Test Amount**
   ```
   Amount: 0.5 USDC
   Click "Estimate Cost" (optional)
   Click "Deposit"
   ```

4. **Approve and Monitor**
   - Approve USDC spending in MetaMask
   - Watch progress through each step
   - Check transaction links in Base Sepolia and Solana explorers

5. **Verify Success**
   - Check fee pool balance increased
   - Verify sponsor appears on leaderboard
   - Confirm transactions on both chains

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient USDC balance or ETH for gas fees" | Not enough tokens | Get more ETH/USDC from faucets |
| "Transaction was cancelled by user" | User rejected in wallet | Try again and approve |
| "Network connection error" | RPC issues | Check internet, try again |
| "Invalid Solana fee pool address" | Wrong vault address | Verify VITE_USDC_VAULT in .env |
| "Transfer amount exceeds maximum limit" | Amount > 10,000 | Reduce amount |
| "Transfer amount below minimum limit" | Amount < 0.1 | Increase amount |

### Retry Mechanism

If a bridge operation fails, the UI provides a "Retry" button that:
- Resumes from the last successful step
- Doesn't require re-approval if already approved
- Maintains the same transaction parameters

## Hackathon Impact

This CCTP integration directly addresses the **Circle bounty requirements**:

### ✅ Cross-Border Payments
- Enables seamless USDC transfers from Base (L2) to Solana (L1)
- Real-world use case: Sponsors on different chains supporting same user base

### ✅ Multi-Chain Innovation
- Demonstrates sophisticated understanding of Circle's cross-chain tech
- **Bonus points**: Uses both Solana AND Base as explicitly mentioned in bounty

### ✅ Circle Developer APIs
- Integrates Circle's Bridge Kit SDK
- Uses adapter pattern for both EVM (viem) and Solana
- Implements proper event handling and progress tracking

### ✅ Real-World Relevance
- Solves actual onboarding friction (sponsors may have funds on different chains)
- Production-ready with proper error handling and retry logic
- Clear path to mainnet deployment

## Cost Analysis

### Testnet Costs (per 10 USDC bridge)
- Base gas: ~$0.01 (Sepolia ETH)
- Solana transaction: ~$0.0001 (paid by fee pool)
- Total user cost: ~$0.01

### Mainnet Costs (per 10 USDC bridge - estimated)
- Base gas: ~$0.05-0.20 (during normal congestion)
- Solana transaction: ~$0.0001 (paid by fee pool)
- Total user cost: ~$0.05-0.20

**Note:** Significantly cheaper than Ethereum mainnet which would cost $5-50 depending on gas prices.

## Future Enhancements

1. **Support More Chains**
   - Arbitrum, Optimism, Polygon
   - Multi-source chain support for sponsors

2. **Batch Deposits**
   - Allow sponsors to schedule recurring deposits
   - Optimize gas costs with batching

3. **Analytics Dashboard**
   - Show total cross-chain volume
   - Track USDC distribution across chains
   - Sponsor ROI metrics by source chain

4. **Instant Deposits**
   - Explore Circle's instant transfer options
   - Reduce 10-20 minute wait time

5. **Auto-Conversion**
   - Support ETH/other tokens on Base
   - Auto-swap to USDC before bridging

## Security Considerations

### Audited Components
- ✅ Circle's CCTP contracts (audited by Trail of Bits, OpenZeppelin)
- ✅ Bridge Kit SDK (official Circle library)
- ✅ Solana SPL Token program (audited)

### Our Implementation
- Input validation (min/max limits)
- User confirmation before execution
- Transaction simulation before submission
- Proper error handling and user feedback
- No private key exposure (wallet adapters only)

### Best Practices
- Always test on testnet first
- Start with small amounts
- Verify recipient addresses
- Monitor transaction progress
- Keep records of transaction hashes

## Resources

### Official Documentation
- [Circle CCTP Docs](https://developers.circle.com/stablecoins/docs/cctp-getting-started)
- [Bridge Kit SDK](https://www.npmjs.com/package/@circle-fin/bridge-kit)
- [Solana Developer Docs](https://docs.solana.com)
- [Base Developer Docs](https://docs.base.org)

### Explorers
- Base Sepolia: https://sepolia.basescan.org
- Base Mainnet: https://basescan.org
- Solana Devnet: https://explorer.solana.com?cluster=devnet
- Solana Mainnet: https://explorer.solana.com

### Support
- Circle Discord: https://discord.gg/buildoncircle
- Solana Discord: https://discord.gg/solana
- Base Discord: https://discord.gg/buildonbase

## Conclusion

The CCTP integration transforms Gasless Hub from a single-chain solution to a **true cross-chain payment platform**. By enabling Base sponsors to fund Solana transactions, we demonstrate:

1. **Technical Excellence** - Proper integration of cutting-edge cross-chain tech
2. **Real Impact** - Solves actual multi-chain sponsor onboarding problem
3. **Strong UX** - Seamless experience despite complex underlying process
4. **Hackathon Fit** - Directly addresses Circle + multi-chain bounty requirements

This positions Gasless Hub as a **standout project** showcasing both Solana's performance and Circle's cross-chain capabilities.
