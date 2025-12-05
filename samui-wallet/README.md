# Gasless Hub - Democratizing Access to Solana

> **Making Solana accessible to everyone by removing the #1 barrier to crypto adoption: gas fees**

![Solana](https://img.shields.io/badge/Solana-Devnet-blueviolet)
![Circle CCTP](https://img.shields.io/badge/Circle-CCTP-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Built for:** Midwest Blockchain Conference Hackathon 2025
**Tracks:** Solana + Circle/USDC Bounty

---

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Technical Summary](#-technical-summary)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [Architecture](#-architecture)
- [Deployed Contracts](#-deployed-contracts)
- [Business Model & Revenue](#-business-model--revenue)
- [Market Opportunity](#-market-opportunity)
- [Hackathon Tracks & Bounties](#-hackathon-tracks--bounties)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 The Problem

**60% of potential crypto users abandon onboarding because they need to buy tokens just to pay gas fees.**

Even though Solana has incredibly low transaction fees ($0.00009 average), new users still face a chicken-and-egg problem:
- Want to transact on Solana → Need SOL for gas
- To get SOL → Need to buy from exchange
- To buy from exchange → Need KYC, funding, technical knowledge
- Result: **Massive adoption barrier**

With **$16 trillion in cumulative USDC volume** and **800 million expected crypto users by 2025**, there's a massive market for frictionless blockchain access.

---

## 💡 Our Solution

**Gasless Hub** inverts the traditional fee model: sponsors fund transaction fees, users transact for free.

### How It Works

1. **Sponsors deposit USDC** into fee pools (via Solana or Circle CCTP from Base)
2. **Users connect wallet** and transact immediately - no SOL required
3. **Kora paymaster** covers gas fees, deducting from sponsor pool
4. **Everyone wins**: Users get access, sponsors get visibility

### Key Innovation

- **Zero upfront costs** for users - transact immediately without owning any crypto
- **Cross-chain deposits** via Circle CCTP - Base sponsors can fund Solana users
- **On-chain fee pool** - Transparent, auditable sponsor contributions via custom Solana program
- **Web2-like UX** - No gas prompts, no confusing blockchain mechanics

---

## 🚀 Features

### For Users
- ✅ **Gasless SOL transfers** - Send SOL without owning SOL
- ✅ **Gasless SPL token transfers** - Transfer USDC, tokens fee-free
- ✅ **No technical knowledge required** - Just connect and transact
- ✅ **Sponsor attribution** - See who's funding your transactions

### For Sponsors
- ✅ **Solana direct deposits** - Deposit USDC from Solana wallet
- ✅ **Cross-chain deposits (Circle CCTP)** - Bridge USDC from Base Sepolia
- ✅ **Sponsor dashboard** - Real-time leaderboard, analytics
- ✅ **Branded presence** - Logo, website, company info on platform
- ✅ **Impact tracking** - See transactions sponsored

### Platform
- ✅ **Real-time caching** - Instant load times with localStorage caching
- ✅ **Transparent accounting** - On-chain fee pool via Anchor program
- ✅ **Production-ready** - Built with TypeScript, React 19, Vite 7

---

## 🛠 Tech Stack

### Blockchain
- **Solana** - High-performance L1 (Devnet)
- **Anchor** - Smart contract framework for Fee Pool program
- **@solana/web3.js** - Solana JavaScript SDK
- **@solana/spl-token** - Token operations

### Circle Integration
- **Circle CCTP** - Cross-Chain Transfer Protocol for USDC bridging
- **@circle-fin/bridge-kit** - CCTP SDK (v1.1.2)
- **@circle-fin/adapter-viem-v2** - Base/EVM adapter
- **@circle-fin/adapter-solana** - Solana adapter

### Frontend
- **React 19** - Latest React with compiler
- **TypeScript** - Type safety
- **Vite 7.2.4** - Fast dev server & build tool
- **TailwindCSS 4** - Styling
- **Turborepo** - Monorepo management

### Backend (Kora Paymaster)
- **Rust** - Fee payer service
- **Solana RPC** - Transaction signing & submission

---

## 📦 Installation & Setup

### Prerequisites
- **Bun** >= 1.3.3 (package manager)
- **Node.js** >= 24
- **Solana CLI** (optional, for verification)
- **MetaMask** or **Phantom** wallet

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/gasless-hub.git
cd gasless-hub/samui-wallet
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Set Up Environment Variables

Create `.env.local` in the root:

```env
# Solana Network
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Fee Pool Program (Deployed on Devnet)
VITE_FEE_POOL_PROGRAM_ID=Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K

# USDC Configuration (Devnet)
VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
VITE_USDC_VAULT=6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk

# Backend API (optional - for sponsor metadata)
VITE_BACKEND_URL=http://localhost:3001

# Kora Paymaster RPC (local development)
VITE_KORA_RPC_URL=http://localhost:8080
```

### 4. Start Development Server
```bash
bun run dev
```

The app will be available at `http://localhost:5173`

### 5. (Optional) Start Backend & Kora Paymaster

For full functionality including sponsor metadata and gasless transactions:

```bash
# Terminal 1: Backend API
cd apps/api
bun run dev

# Terminal 2: Kora Paymaster
# (See Kora setup instructions in /kora directory)
```

---

## 🎮 Usage

### As a User (Gasless Transactions)

1. **Connect Wallet**
   - Click "Connect Wallet"
   - Authorize with Phantom or MetaMask

2. **Send Gasless Transaction**
   - Go to "Send" tab
   - Enter recipient address
   - Enter amount (SOL or USDC)
   - Click "Send" - **No SOL required!**

3. **View Sponsors**
   - Click "Sponsors" tab
   - See who's funding your gas fees

### As a Sponsor

#### Option 1: Deposit from Solana
1. Click "Sponsors" tab → "Solana Deposit"
2. Fill in company details (name, website, logo)
3. Set metadata (stored on-chain via Fee Pool program)
4. Deposit USDC amount
5. Appear on leaderboard!

#### Option 2: Deposit from Base (Circle CCTP)
1. Click "Sponsors" tab → "Base Deposit (CCTP)"
2. Select wallet (MetaMask or Phantom EVM)
3. Enter USDC amount
4. Approve + Bridge via Circle CCTP
5. USDC burns on Base → mints on Solana → added to fee pool

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Gasless Hub Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐           ┌──────────────┐                    │
│  │   Frontend   │◄─────────►│   Backend    │                    │
│  │  (React 19)  │           │   (Node.js)  │                    │
│  └──────┬───────┘           └──────────────┘                    │
│         │                                                         │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────┐          │
│  │            Kora Paymaster (Rust)                  │          │
│  │  - Fee payer: CrcUrpw22y5Fwum4jRBPBiMcw98FWKg... │          │
│  │  - Signs transactions as fee payer                │          │
│  │  - Submits to Solana RPC                          │          │
│  └──────┬────────────────────────────────────────────┘          │
│         │                                                         │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain (Devnet)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Fee Pool Program (Anchor)                               │   │
│  │  ID: Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K       │   │
│  │                                                           │   │
│  │  - Sponsor metadata storage                              │   │
│  │  - USDC deposit tracking                                 │   │
│  │  - Fee pool accounting                                   │   │
│  │  - Vault: 6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  System Program + Token Program (Native)                 │   │
│  │  - Handles actual SOL/SPL transfers                      │   │
│  │  - Kora pays fees, user authorizes transfer             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────┘
          ▲
          │
          │ Circle CCTP
          │
┌─────────┴───────────────────────────────────────────────────────┐
│                   Base Sepolia (EVM)                             │
├─────────────────────────────────────────────────────────────────┤
│  - Sponsors burn USDC on Base                                    │
│  - Circle attests burn message                                   │
│  - USDC minted 1:1 on Solana Devnet                             │
│  - Added to Gasless Hub fee pool                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Gasless Transaction

1. **User initiates transfer** (e.g., 1 SOL to recipient)
2. **Frontend creates transaction** with Kora as fee payer
3. **User signs transaction** (authorizes transfer from their account)
4. **Kora paymaster co-signs** (pays SOL fee)
5. **Transaction submitted** to Solana
6. **Transfer completes** - User's balance decreases, recipient receives SOL
7. **User paid $0 in fees** ✅

---

## 📍 Deployed Contracts

### Solana Devnet

**Fee Pool Program (Anchor)**
- **Program ID**: `Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K`
- **Explorer**: [View on Solana Explorer](https://explorer.solana.com/address/Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K?cluster=devnet)
- **Size**: 1.95 MB
- **Balance**: 13.57 SOL
- **Last Deploy**: Slot 425858800

**USDC Vault**
- **Address**: `6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk`
- **Type**: SPL Token Account (USDC)

**Kora Fee Payer**
- **Address**: `CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU`
- **Role**: Signs transactions as fee payer for gasless transfers

### Circle CCTP Integration

**Networks**
- **Source**: Base Sepolia (Testnet)
- **Destination**: Solana Devnet
- **Protocol**: Circle CCTP v2

**USDC Contracts**
- **Base Sepolia USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Solana Devnet USDC**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## 💰 Business Model & Revenue

### Revenue Streams

1. **Sponsor Fee Share (5-10%)**
   - Take percentage of sponsor deposits into fee pools
   - Sustainable revenue as platform grows

2. **Premium Sponsor Tiers**
   - Analytics dashboard
   - Branded sponsor profiles
   - Priority placement on leaderboard

3. **Future: 0% Swap Fees**
   - In-wallet token swaps with no user fees
   - Subsidized by sponsor revenue
   - **vs Phantom: 0.85% swap + 1.5% gasless = 2.35% total**

### Competitive Advantage

| Feature | Traditional Wallets | Gasless Hub |
|---------|---------------------|-------------|
| User pays gas | ✅ Always | ❌ Never |
| Onboarding friction | High (buy crypto first) | Zero (just connect) |
| Revenue source | User fees | Sponsor fees |
| Swap fees | 0.85% - 2.35% | 0% (future) |
| Target market | Crypto-savvy | Mainstream users |

---

## 📊 Market Opportunity

### Key Statistics

- **$16 trillion** - Cumulative USDC transaction volume
- **$8.29 trillion** - USDC volume on Solana alone
- **800 million** - Expected crypto users by 2025
- **60%** - Users who cite barriers to participation
- **$37 billion** - Circle CCTP cross-chain volume
- **65%** - Solana's stablecoin supply that is USDC

### Target Users

1. **Crypto-Curious Newcomers** - Want to try Solana but intimidated by gas fees
2. **Emerging Market Users** - High friction for buying crypto in their region
3. **dApp Users** - Apps can sponsor their users' first transactions
4. **Corporate Sponsors** - Get brand exposure to crypto-native audience

---

## 🏆 Hackathon Tracks & Bounties

### Main Track: Solana ✅

**Requirements Met:**
- ✅ Deployed to Solana Devnet
- ✅ Uses Anchor framework
- ✅ Uses @solana/web3.js and @solana/spl-token
- ✅ Original project created during hackathon
- ✅ Public GitHub repo
- ✅ Technical documentation
- ✅ Working demo

### Circle/USDC Bounty ✅

**Integration:**
- ✅ Circle CCTP for cross-chain USDC transfers
- ✅ Bridge from Base Sepolia → Solana Devnet
- ✅ User-controlled adapter (Phantom/MetaMask)
- ✅ $37B+ in CCTP volume leveraged
- ✅ Real-time transaction tracking

**Unique Value:**
- Enables **Base sponsors to fund Solana users**
- Showcases CCTP for **payments use case** (fee pool funding)
- Demonstrates **1:1 trust-minimized bridging** (burn/mint)

---

## 🚧 Roadmap

### Phase 1: Hackathon MVP ✅
- [x] Fee Pool Anchor program
- [x] Gasless SOL/SPL transfers
- [x] Circle CCTP integration
- [x] Sponsor registration & deposits
- [x] Leaderboard & analytics
- [x] Devnet deployment

### Phase 2: Public Beta (Q1 2025)
- [ ] Deploy to Solana Mainnet + Base Mainnet
- [ ] Smart routing for fee pool selection
- [ ] Mobile-responsive design
- [ ] Email/SMS sponsor receipts
- [ ] Analytics dashboard for sponsors

### Phase 3: Scale (Q2 2025)
- [ ] In-wallet swap functionality (0% fees)
- [ ] Multi-chain expansion (Ethereum, Polygon)
- [ ] B2B partnerships (dApps sponsor their users)
- [ ] Token incentives for sponsors
- [ ] API for developers

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Solana Foundation** - For the high-performance blockchain
- **Circle** - For CCTP and making cross-chain USDC seamless
- **Midwest Blockchain Conference** - For hosting this incredible hackathon
- **Anchor/Coral** - For the amazing Solana development framework

---

**Built with ❤️ for Midwest Blockchain Conference 2025**

**Removing the #1 barrier to crypto adoption, one gasless transaction at a time.** 🚀
