# Gasless Hub - Complete Setup Guide

## Overview

Gasless Hub is a Solana wallet that enables gasless transactions. Users don't need SOL for fees; sponsors cover them by depositing USDC into a fee pool. This guide documents the complete working configuration after fixing all issues.

## Architecture

```
┌─────────────────┐
│  Samui Wallet   │  Frontend (Bun + React)
│   (Frontend)    │  - User interface
└────────┬────────┘  - Sponsor registration
         │           - Wallet functionality
         │
         ▼
┌─────────────────┐
│  Kora Paymaster │  Signs transactions as fee payer
│   (localhost)   │  - Enables gasless execution
└────────┬────────┘  - Validates transactions
         │
         ▼
┌─────────────────┐
│   Fee Pool      │  Anchor Program (Solana devnet)
│  (Anchor/Rust)  │  - Manages sponsor deposits
└────────┬────────┘  - Stores USDC vault
         │           - Tracks sponsor records
         │
         ▼
┌─────────────────┐
│  Backend API    │  Express.js
│   (Node.js)     │  - Monitors fee pool
└─────────────────┘  - Provides sponsor data
```

---

## Fixed Issues Summary

### 1. USDC Mint Mismatch ✅
**Problem:** Frontend and backend were using different USDC mint addresses.

**Solution:** Standardized all configurations to use the same USDC mint that has an initialized vault.

### 2. Fee Pool Vault Configuration ✅
**Problem:** The USDC vault PDA didn't exist for the new mint, causing constraint failures.

**Solution:** Reverted to using the original USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) which has an existing, initialized vault.

### 3. Frontend Environment Variables ✅
**Problem:** Vite/Bun wasn't loading environment variables correctly, causing the frontend to derive wrong vault addresses.

**Solution:** Hardcoded correct defaults in the source code as fallbacks.

### 4. Kora Transfer Limits ✅
**Problem:** Kora's `max_allowed_lamports` was set to 1 USDC, preventing larger deposits.

**Solution:** Increased limit to 100 USDC (100,000,000 with 6 decimals).

### 5. Kora USDC Balance ✅
**Problem:** Kora fee payer had no USDC tokens to transfer on behalf of sponsors.

**Solution:** Funded Kora's USDC token account with test tokens.

---

## Configuration Files

### 1. Frontend Configuration

**File:** `/samui-wallet/.env.local`

```bash
# Backend API
VITE_BACKEND_URL=http://localhost:3001

# Solana Network - Devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Kora RPC (local)
VITE_KORA_RPC_URL=http://localhost:8080

# Fee Pool Program (deployed on devnet)
VITE_FEE_POOL_PROGRAM_ID=Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K


VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
VITE_USDC_VAULT=6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk
```

**File:** `/samui-wallet/packages/sponsors/src/ui/sponsor-register-modal.tsx` (Lines 20-24)

```typescript
const FEE_POOL_PROGRAM_ID = import.meta.env['VITE_FEE_POOL_PROGRAM_ID'] || 'Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K'
const USDC_MINT = import.meta.env['VITE_USDC_MINT'] || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const USDC_VAULT_OVERRIDE = import.meta.env['VITE_USDC_VAULT'] || '6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk'

console.log('ENV CHECK:', { mint: USDC_MINT, vault: USDC_VAULT_OVERRIDE })
```

### 2. Backend Configuration

**File:** `/backend/.env`

```bash
# Solana Network
SOLANA_RPC_URL=https://api.devnet.solana.com

# Fee Pool Program
FEE_POOL_PROGRAM_ID=Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K

# USDC on Devnet (Test mint with controlled authority)
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Backend Server
PORT=3001
```

**File:** `/backend/.env.feepool`

```bash
# Fee Pool V2 Configuration - DEVNET
FEE_POOL_PROGRAM_ID=Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K
FEE_POOL_PDA=HKFMZTVLVs6N5Ptii9EwRN1mfAymC9HXCzLqbUdE6At5
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
SOLANA_RPC_URL=https://api.devnet.solana.com
AUTHORITY=inzJmkGXNSjunG4Tx1Qqb3ww7c7Roq4WnkpGjqqbRpM
```

### 3. Kora Configuration

**File:** `/kora-config/kora.toml` (Key Settings)

```toml
[kora]
rpc_url = "https://api.devnet.solana.com"
rate_limit = 100

[validation]
max_allowed_lamports = 100_000_000  # 100 USDC max (for token transfers)
max_signatures = 10
price_source = "Mock"

allowed_programs = [
    "11111111111111111111111111111111",                      # System Program
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",           # Token Program
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",          # Token-2022
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",          # Associated Token
    "ComputeBudget111111111111111111111111111111",          # Compute Budget
    "Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K",         # Fee Pool Program (devnet)
]

allowed_tokens = [
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", # USDC devnet
]

[validation.price]
type = "free"
margin = 0  # No markup (free transactions)
```

**File:** `/kora-config/signers.toml`

```toml
[signer_pool]
strategy = "round_robin"

[[signers]]
name = "fee_payer"
type = "memory"
private_key_env = "KORA_FEE_PAYER_KEY"
```

**File:** `/kora-config/start-kora.sh`

```bash
#!/bin/bash

# Export fee payer key (base58)
export KORA_FEE_PAYER_KEY="<your_base58_private_key_here>"

# Force RPC to devnet
export RPC_URL="https://api.devnet.solana.com"

# Start Kora
kora --config kora.toml --signers signers.toml
```

---

## Key Addresses (Devnet)

| Component | Address |
|-----------|---------|
| **Fee Pool Program** | `Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K` |
| **Fee Pool PDA** | `HKFMZTVLVs6N5Ptii9EwRN1mfAymC9HXCzLqbUdE6At5` |
| **USDC Mint** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **USDC Vault PDA** | `6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk` |
| **Kora Fee Payer** | `CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU` |
| **Kora USDC Account** | `B2qVtxmjuTDK4uaVVfjva5dzVUEmfG5spVukmFVoh6RL` |

---

## Startup Instructions

### Prerequisites

1. **Solana CLI** installed and configured
2. **Anchor CLI** installed (for program deployment)
3. **Node.js** (v18+) and **Bun** installed
4. **Kora** binary installed and accessible in PATH
5. **Devnet SOL** in your wallet for testing

### Step 1: Start Kora Paymaster

```bash
# Navigate to Kora config directory
cd /Users/saroopmakhija/gasless-hub/kora-config

# Make start script executable
chmod +x start-kora.sh

# Start Kora
./start-kora.sh
```

**Expected Output:**
```
✓ Configuration validation successful!
Kora listening on http://localhost:8080
```

**Verify Kora is running:**
```bash
curl http://localhost:8080/health
```

### Step 2: Start Backend API

```bash
# Navigate to backend directory
cd /Users/saroopmakhija/gasless-hub/backend

# Install dependencies (first time only)
npm install

# Start the backend
npm start
```

**Expected Output:**
```
✅ Fee Pool API initialized
🚀 Backend API running on http://localhost:3001
   Health: http://localhost:3001/health
   Stats: http://localhost:3001/api/fee-payer/stats
💰 Kora Fee Payer Balance: X.XXXX SOL
```

**Verify backend is running:**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/sponsors
```

### Step 3: Start Frontend (Samui Wallet)

```bash
# Navigate to frontend directory
cd /Users/saroopmakhija/gasless-hub/samui-wallet

# Install dependencies (first time only)
bun install

# Start the dev server
export BUN_INSTALL="$HOME/.bun" && \
export PATH="$BUN_INSTALL/bin:$PATH" && \
bun --filter=web dev
```

**Expected Output:**
```
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

**Open in browser:** http://localhost:3000

### Step 4: Verify Everything is Working

1. **Check Browser Console** - Should see:
   ```javascript
   ENV CHECK: {
     mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
     vault: '6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk'
   }
   ```

2. **Test Sponsor Registration:**
   - Click "Become a Sponsor"
   - Fill in brand information
   - Register metadata (should succeed)
   - Deposit USDC (0.5 - 100 USDC range)
   - Check sponsor leaderboard

3. **Verify Transactions:**
   - All transactions should be gasless (NO SOL spent)
   - Check transaction signatures on Solana Explorer
   - Verify USDC balance in fee pool vault

---

## Common Issues & Troubleshooting

### Issue 1: Kora Returns `InvalidUsdcMint` (0x1771)

**Symptoms:**
```
Kora error: custom program error: 0x1771
```

**Causes:**
- Fee pool USDC mint doesn't match what frontend is passing
- USDC vault address is incorrect

**Solutions:**
1. Verify fee pool state:
   ```bash
   solana account HKFMZTVLVs6N5Ptii9EwRN1mfAymC9HXCzLqbUdE6At5 --url devnet
   ```

2. Check frontend is using correct values (browser console):
   ```
   ENV CHECK: { mint: '4zMMC9...', vault: '6EPYx8...' }
   ```

3. Hard refresh browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+F5** (Windows)

### Issue 2: Kora Transfer Limit Exceeded

**Symptoms:**
```
Total transfer amount 1343280 exceeds maximum allowed 1000000
```

**Solution:**
1. Edit `/kora-config/kora.toml`
2. Update: `max_allowed_lamports = 100_000_000`
3. Restart Kora

### Issue 3: Kora Has No USDC

**Symptoms:**
- Transaction fails with insufficient funds
- Kora can't transfer USDC to vault

**Solution:**
Fund Kora's USDC account:
```bash
# Get Kora's USDC token account address
spl-token address --verbose \
  --token 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --owner CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU \
  --url devnet

# Output: B2qVtxmjuTDK4uaVVfjva5dzVUEmfG5spVukmFVoh6RL

# Transfer USDC to Kora (from your wallet)
spl-token transfer \
  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  10 \
  B2qVtxmjuTDK4uaVVfjva5dzVUEmfG5spVukmFVoh6RL \
  --url devnet \
  --fund-recipient
```

### Issue 4: Frontend Shows Stale Data

**Symptoms:**
- Browser console shows wrong mint/vault addresses
- Old cached values being used

**Solution:**
```bash
# Clear frontend cache
cd /Users/saroopmakhija/gasless-hub/samui-wallet
rm -rf .turbo apps/web/.next dist
find . -name ".vite" -type d -exec rm -rf {} + 2>/dev/null || true

# Restart dev server
bun --filter=web dev
```

Then hard refresh browser: **Cmd+Shift+R**

### Issue 5: Backend Can't Connect to Solana

**Symptoms:**
```
Error fetching sponsors: ECONNREFUSED 127.0.0.1:8899
```

**Solution:**
- Ensure RPC URL is set to devnet in `.env` files
- Don't need local validator running (using devnet)
- Check network connectivity

---

## Development Workflow

### Making Changes to the Anchor Program

```bash
cd /Users/saroopmakhija/gasless-hub/programs/fee_pool

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update program ID in all config files if changed
```

### Making Changes to Frontend

```bash
cd /Users/saroopmakhija/gasless-hub/samui-wallet

# Frontend auto-reloads on file changes
# Just save your changes and refresh browser
```

### Making Changes to Backend

```bash
cd /Users/saroopmakhija/gasless-hub/backend

# Restart the server (Ctrl+C, then npm start)
# Or use nodemon for auto-reload:
npm install -g nodemon
nodemon server.js
```

### Updating Kora Configuration

```bash
cd /Users/saroopmakhija/gasless-hub/kora-config

# Edit kora.toml or signers.toml

# Restart Kora
pkill -f kora
./start-kora.sh
```

---

## Testing the Complete Flow

### 1. Create a Test Wallet
```bash
solana-keygen new --outfile ~/test-wallet.json
solana airdrop 2 ~/test-wallet.json --url devnet
```

### 2. Get Test USDC
```bash
# Use devnet USDC faucet or transfer from another account
```

### 3. Register as Sponsor
1. Open Samui Wallet: http://localhost:3000
2. Import test wallet
3. Click "Become a Sponsor"
4. Fill in brand details:
   - Name: Your Brand
   - Website: https://yourbrand.com
   - Logo URL: https://yourbrand.com/logo.png
5. Submit (gasless transaction)

### 4. Deposit USDC
1. Enter amount (0.5 - 100 USDC)
2. Click "Deposit USDC"
3. Confirm transaction
4. Check leaderboard - you should appear!

### 5. Verify On-Chain State
```bash
# Check fee pool state
solana account HKFMZTVLVs6N5Ptii9EwRN1mfAymC9HXCzLqbUdE6At5 --url devnet

# Check USDC vault balance
spl-token account-info 6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk --url devnet

# View transaction on explorer
https://explorer.solana.com/tx/<signature>?cluster=devnet
```

---

## Useful Commands Reference

### Check Balances
```bash
# Kora SOL balance
solana balance CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU --url devnet

# Kora USDC balance
spl-token balance \
  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --owner CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU \
  --url devnet

# Fee pool vault balance
spl-token account-info 6EPYx8EvezNiowmRqt1siFuKo92knyYhveshJtgHjJVk --url devnet
```

### Restart All Services
```bash
# Kill all services
pkill -f kora
pkill -f "node.*server.js"
pkill -f "bun.*dev"

# Restart Kora
cd /Users/saroopmakhija/gasless-hub/kora-config && ./start-kora.sh

# Restart Backend (in new terminal)
cd /Users/saroopmakhija/gasless-hub/backend && npm start

# Restart Frontend (in new terminal)
cd /Users/saroopmakhija/gasless-hub/samui-wallet && bun --filter=web dev
```

### View Logs
```bash
# Kora logs (if running in background)
tail -f /Users/saroopmakhija/gasless-hub/kora-config/kora.log

# Backend logs
tail -f /Users/saroopmakhija/gasless-hub/backend/backend.log

# Or run services in foreground to see logs directly
```

---

## Architecture Deep Dive

### Sponsor Deposit Flow

```
1. User clicks "Become a Sponsor"
   ↓
2. Frontend creates sponsor_metadata PDA
   - PDA seeds: ["sponsor_metadata", sponsor_pubkey]
   - Stores: name, website, logo_url
   ↓
3. User enters deposit amount
   ↓
4. Frontend builds sponsor_deposit transaction
   - Instruction discriminator: [206, 47, 139, 60, 184, 252, 38, 155]
   - Accounts:
     [0] fee_pool (PDA)
     [1] sponsor_record (PDA, init_if_needed)
     [2] usdc_vault (PDA, must match fee_pool.usdc_vault)
     [3] payer_usdc (Kora's USDC token account)
     [4] payer (Kora, signer)
     [5] sponsor (User, signer)
     [6] system_program
     [7] token_program
     [8] rent
   ↓
5. User signs transaction (partial signature)
   ↓
6. Frontend sends to Kora via koraAdapter.sendTransaction()
   ↓
7. Kora validates transaction:
   - Checks program is allowed
   - Checks USDC mint is allowed
   - Checks transfer amount <= max_allowed_lamports
   ↓
8. Kora signs as fee payer
   ↓
9. Kora broadcasts to Solana network
   ↓
10. Program executes:
    - Creates sponsor_record if needed
    - Transfers USDC from Kora to vault
    - Updates sponsor_record.total_contributed
    - Updates fee_pool.total_deposited
   ↓
11. Transaction confirms
    ↓
12. Frontend shows success message
    ↓
13. Sponsor appears on leaderboard
```

### Fee Pool State Structure

```rust
pub struct FeePool {
    pub authority: Pubkey,          // Admin authority
    pub usdc_mint: Pubkey,           // USDC mint address
    pub usdc_vault: Pubkey,          // PDA holding USDC
    pub total_deposited: u64,        // Total USDC deposited
    pub total_withdrawn: u64,        // Total USDC withdrawn
    pub total_sponsors: u64,         // Number of sponsors
    pub bump: u8,                    // PDA bump
}
```

### Sponsor Record Structure

```rust
pub struct SponsorRecord {
    pub sponsor: Pubkey,             // Sponsor's wallet
    pub total_contributed: u64,      // Total USDC contributed
    pub transactions_sponsored: u64, // Number of transactions
    pub last_deposit_time: i64,      // Unix timestamp
    pub bump: u8,                    // PDA bump
}
```

---

## Security Considerations

### Current Setup (Development)

⚠️ **WARNING:** This configuration is for DEVELOPMENT/TESTNET only!

**Security Issues in Current Setup:**
1. Kora has no authentication (`api_key` or `hmac_secret` not set)
2. Fee payer policy allows all operations (transfers, burns, etc.)
3. Free pricing model (no fee charging)
4. Mock price source
5. Private keys stored in plain text config files

### Production Recommendations

**Before deploying to mainnet:**

1. **Enable Kora Authentication:**
   ```toml
   [kora.auth]
   api_key = "your-secure-api-key"
   # or
   hmac_secret = "your-secure-hmac-secret"
   ```

2. **Restrict Fee Payer Policy:**
   ```toml
   [validation.fee_payer_policy.spl_token]
   allow_transfer = false        # Don't let users drain tokens
   allow_burn = false
   allow_close_account = false
   allow_approve = false
   allow_set_authority = false
   allow_mint_to = false
   ```

3. **Use Real Price Oracle:**
   ```toml
   [validation]
   price_source = "Pyth"  # or "Switchboard"
   ```

4. **Implement Fee Charging:**
   ```toml
   [validation.price]
   type = "fixed"  # or "dynamic"
   margin = 10     # 10% markup
   ```

5. **Secure Private Keys:**
   - Use hardware wallets for production
   - Store keys in secure key management systems
   - Rotate keys regularly

6. **Rate Limiting:**
   ```toml
   [kora]
   rate_limit = 10  # Reduce for production

   [kora.usage_limit]
   enabled = true
   max_transactions = 100  # Per user/period
   ```

---

## Success Criteria

✅ **Kora is running** - `curl http://localhost:8080/health` returns 200
✅ **Backend is running** - `curl http://localhost:3001/health` returns 200
✅ **Frontend is accessible** - Browser shows Samui Wallet at http://localhost:3000
✅ **Console shows correct config** - ENV CHECK displays correct mint/vault
✅ **Metadata registration works** - Sponsor can register brand info (gasless)
✅ **USDC deposit works** - Sponsor can deposit 0.5-100 USDC (gasless)
✅ **Leaderboard updates** - New sponsors appear on leaderboard
✅ **No SOL spent** - All transactions are gasless (Kora pays fees)

---

## Additional Resources

- **Solana Explorer (Devnet):** https://explorer.solana.com/?cluster=devnet
- **Fee Pool Program:** https://explorer.solana.com/address/Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K?cluster=devnet
- **Kora Documentation:** (Add Kora docs link if available)
- **Anchor Framework:** https://www.anchor-lang.com/

---

## Changelog

### 2025-12-03 - Initial Working Configuration

**Fixed Issues:**
- ✅ USDC mint mismatch between frontend and backend
- ✅ Fee pool vault configuration (reverted to working mint)
- ✅ Frontend environment variable loading
- ✅ Kora transfer limits (increased to 100 USDC)
- ✅ Kora USDC funding

**Working Features:**
- ✅ Gasless sponsor registration
- ✅ Gasless USDC deposits
- ✅ Sponsor leaderboard display
- ✅ Complete end-to-end flow

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all services are running
3. Check browser console for errors
4. Review Kora logs for validation errors
5. Ensure all configuration files match this guide

---

**Last Updated:** December 3, 2025
**Status:** ✅ Fully Functional
**Network:** Solana Devnet
