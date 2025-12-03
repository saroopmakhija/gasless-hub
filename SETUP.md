# Gasless Hub - Quick Setup Guide

## 🚀 What's Been Built

✅ **Solana Fee Pool Program** (Anchor)
- Sponsor deposits
- USDC vault management
- Withdrawal for conversion

✅ **Kora Paymaster Configuration**
- Fee payer keypair generated
- Allowlist configured (System, Token, Jupiter, Orca, Raydium)
- Rate limiting enabled

✅ **Frontend Hub** (Next.js)
- Wallet adapter integration
- dApp views (Jupiter, Magic Eden, Raydium)
- Polymarket integration
- Sponsor leaderboard

✅ **Kora Transaction Adapter**
- Routes all transactions through Kora
- Gasless signing
- No SOL needed for users

---

## 📋 Next Steps to Complete

### 1. Get Devnet SOL (Required)

**Option A: Web Faucet (Easiest)**
```bash
# Get your wallet address
export PATH="/Users/saroopmakhija/.local/share/solana/install/active_release/bin:$PATH"
solana address

# Visit: https://faucet.solana.com
# Paste address: inzJmkGXNSjunG4Tx1Qqb3ww7c7Roq4WnkpGjqqbRpM
# Request 2 SOL
```

**Option B: CLI (if rate limit clears)**
```bash
solana airdrop 2
```

**Also fund Kora fee payer:**
```bash
# Visit https://faucet.solana.com
# Paste: CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU
# Request 5 SOL (for signing many transactions)
```

### 2. Deploy Fee Pool Program

```bash
cd programs/fee_pool
anchor build
anchor deploy --provider.cluster devnet
```

### 3. Create Test USDC Token

```bash
# Create a test USDC mint on devnet
spl-token create-token --decimals 6

# Copy the mint address and update:
# - frontend/.env.local (NEXT_PUBLIC_USDC_MINT)
# - kora-config/kora.toml (allowed_tokens and allowed_spl_paid_tokens)
```

### 4. Initialize Fee Pool

```bash
cd programs/fee_pool
# Update tests/fee_pool.ts with your USDC mint
# Run the initialize instruction
anchor run initialize
```

### 5. Start Kora RPC

```bash
cd kora-config
./start-kora.sh

# Should see:
# 🚀 Starting Kora RPC Server...
# Fee Payer: CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU
# Starting Kora on http://localhost:8080
```

### 6. Start Frontend

```bash
cd frontend
npm run dev

# Visit: http://localhost:3000
```

---

## 🧪 Testing the Gasless Flow

### Test Transaction Flow:
1. **Connect Wallet** (Phantom/Solflare)
2. **Open a dApp** (Jupiter/Raydium)
3. **Make a transaction**
4. **Kora signs as fee payer**
5. **Transaction succeeds - NO SOL NEEDED!**

### Test Sponsor Deposit:
1. Mint test USDC to a sponsor wallet
2. Call `sponsor_deposit` instruction
3. Check sponsor leaderboard updates
4. Verify USDC in pool vault

---

## 📂 Project Structure

```
gasless-hub/
├── programs/fee_pool/          # Anchor program
│   ├── programs/fee_pool/src/  # Rust source
│   ├── tests/                  # Tests
│   └── target/                 # Compiled program
├── frontend/                   # Next.js app
│   ├── app/                    # Pages & components
│   ├── lib/kora-adapter.ts    # Gasless transaction adapter
│   └── .env.local             # Environment config
├── kora-config/               # Kora setup
│   ├── kora.toml              # Kora configuration
│   ├── signers.toml           # Signer config
│   ├── fee-payer.json         # Fee payer keypair
│   └── start-kora.sh          # Startup script
└── backend/                   # Monitor service (TODO)
```

---

## 🔑 Key Addresses

**Your Wallet:**
```
inzJmkGXNSjunG4Tx1Qqb3ww7c7Roq4WnkpGjqqbRpM
```

**Kora Fee Payer:**
```
CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU
```

**Fee Pool Program:**
```
8uvizWEfsRhY4SGjiGCa6FDw9u1g1KFacFnKRYrpAS1y
```

---

## 🐛 Troubleshooting

**Kora won't start:**
- Check fee payer has SOL: `solana balance -k kora-config/fee-payer.json --url devnet`
- Verify config: `cat kora-config/kora.toml`

**Transactions failing:**
- Check Kora logs
- Verify program is in allowlist
- Ensure Kora has enough SOL

**Frontend errors:**
- Check `.env.local` has correct values
- Verify Kora is running on port 8080
- Check browser console for errors

---

## 📊 For the Hackathon Demo

1. **Pre-fund Kora** with 5 SOL
2. **Create 2-3 sponsor wallets** with test USDC
3. **Have them deposit** to show sponsor leaderboard
4. **Demo gasless transactions** on Jupiter/Raydium
5. **Show Polymarket integration**
6. **Highlight sponsor banner** rotating based on contributions

---

## 🎯 Judging Criteria Alignment

- **Innovation (30%):** Gasless UX + on-chain sponsor attribution
- **Impact (30%):** Removes biggest Solana onboarding barrier
- **Technical (20%):** Anchor program + Kora integration + custom adapter
- **Design (15%):** Clean UI with multi-tab hub
- **Presentation (15%):** Clear value prop + working demo

**Circle/USDC Bounty:**
- ✅ USDC as sponsorship currency
- ✅ On-chain treasury management
- ✅ Microtransaction enablement

---

Need help? Check:
- Kora docs: https://github.com/solana-foundation/kora
- Anchor docs: https://www.anchor-lang.com
- Frontend at: http://localhost:3000
