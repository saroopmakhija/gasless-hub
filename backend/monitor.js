/**
 * Kora Fee Payer Monitor Service
 * Monitors SOL balance and triggers USDC → SOL conversion when needed
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
require('dotenv').config();

// Configuration
const KORA_FEE_PAYER = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU');
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const MIN_BALANCE_SOL = parseFloat(process.env.MIN_BALANCE_SOL || '1.0'); // Trigger conversion below this
const TARGET_BALANCE_SOL = parseFloat(process.env.TARGET_BALANCE_SOL || '5.0'); // Convert up to this
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '60000'); // Check every minute

const connection = new Connection(SOLANA_RPC, 'confirmed');

class FeePayerMonitor {
  constructor() {
    this.isConverting = false;
    this.lastBalance = 0;
  }

  async checkBalance() {
    try {
      const balance = await connection.getBalance(KORA_FEE_PAYER);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      if (balanceSOL !== this.lastBalance) {
        console.log(`💰 Kora Fee Payer Balance: ${balanceSOL.toFixed(4)} SOL`);
        this.lastBalance = balanceSOL;
      }

      // Check if we need to convert USDC → SOL
      if (balanceSOL < MIN_BALANCE_SOL && !this.isConverting) {
        console.log(`⚠️  Balance below minimum (${MIN_BALANCE_SOL} SOL)!`);
        await this.triggerConversion(balanceSOL);
      }

      return balanceSOL;
    } catch (error) {
      console.error('❌ Error checking balance:', error.message);
      return null;
    }
  }

  async triggerConversion(currentBalance) {
    try {
      this.isConverting = true;
      const amountNeeded = TARGET_BALANCE_SOL - currentBalance;

      console.log(`🔄 Triggering USDC → SOL conversion...`);
      console.log(`   Current: ${currentBalance.toFixed(4)} SOL`);
      console.log(`   Target: ${TARGET_BALANCE_SOL} SOL`);
      console.log(`   Amount needed: ${amountNeeded.toFixed(4)} SOL`);

      // TODO: Implement actual conversion logic
      // 1. Call withdraw_for_conversion on fee pool program
      // 2. Swap USDC → SOL via Jupiter
      // 3. Transfer SOL to Kora fee payer

      console.log('📝 Conversion logic not yet implemented');
      console.log('   For now, manually airdrop SOL to Kora fee payer:');
      console.log(`   solana airdrop ${amountNeeded.toFixed(0)} ${KORA_FEE_PAYER.toBase58()} --url devnet`);

    } catch (error) {
      console.error('❌ Conversion error:', error.message);
    } finally {
      this.isConverting = false;
    }
  }

  async getStats() {
    const balance = await this.checkBalance();
    return {
      feePayerAddress: KORA_FEE_PAYER.toBase58(),
      balanceSOL: balance,
      minBalanceSOL: MIN_BALANCE_SOL,
      targetBalanceSOL: TARGET_BALANCE_SOL,
      needsConversion: balance < MIN_BALANCE_SOL,
      status: balance >= MIN_BALANCE_SOL ? 'healthy' : 'low_balance',
    };
  }

  start() {
    console.log('🚀 Starting Kora Fee Payer Monitor...');
    console.log(`   Fee Payer: ${KORA_FEE_PAYER.toBase58()}`);
    console.log(`   RPC: ${SOLANA_RPC}`);
    console.log(`   Min Balance: ${MIN_BALANCE_SOL} SOL`);
    console.log(`   Target Balance: ${TARGET_BALANCE_SOL} SOL`);
    console.log(`   Check Interval: ${CHECK_INTERVAL_MS / 1000}s`);
    console.log('');

    // Initial check
    this.checkBalance();

    // Periodic checks
    setInterval(() => {
      this.checkBalance();
    }, CHECK_INTERVAL_MS);
  }
}

// Run as standalone service
if (require.main === module) {
  const monitor = new FeePayerMonitor();
  monitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down monitor...');
    process.exit(0);
  });
}

module.exports = { FeePayerMonitor };
