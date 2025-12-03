/**
 * Backend API Server
 * Provides stats and controls for the gasless hub
 */

const express = require('express');
const { FeePayerMonitor } = require('./monitor');
const { FeePoolAPISimple } = require('./fee-pool-api-simple');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const monitor = new FeePayerMonitor();
const feePoolApi = new FeePoolAPISimple();

console.log('✅ Fee Pool API initialized');
monitor.start();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gasless-hub-backend' });
});

// ===== Fee Payer Endpoints =====

// Get fee payer stats
app.get('/api/fee-payer/stats', async (req, res) => {
  try {
    const stats = await monitor.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger conversion (manual)
app.post('/api/fee-payer/convert', async (req, res) => {
  try {
    const balance = await monitor.checkBalance();
    await monitor.triggerConversion(balance);
    res.json({ message: 'Conversion triggered', currentBalance: balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Fee Pool Endpoints =====

// Get fee pool stats
app.get('/api/fee-pool/stats', async (req, res) => {
  try {
    const stats = await feePoolApi.getFeePoolStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sponsors (without metadata - legacy)
app.get('/api/sponsors', async (req, res) => {
  try {
    const sponsors = await feePoolApi.getAllSponsors();
    res.json({ sponsors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sponsors with metadata
app.get('/api/sponsors/with-metadata', async (req, res) => {
  try {
    const sponsors = await feePoolApi.getAllSponsorsWithMetadata();
    res.json({ sponsors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sponsor metadata by address
app.get('/api/sponsor/:address/metadata', async (req, res) => {
  try {
    const { address } = req.params;
    const metadata = await feePoolApi.getSponsorMetadata(address);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Sponsor metadata not found' });
    }
    
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific sponsor record
app.get('/api/sponsors/:address', async (req, res) => {
  try {
    const sponsor = await feePoolApi.getSponsorRecord(req.params.address);
    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }
    res.json(sponsor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vault balance
app.get('/api/fee-pool/vault-balance', async (req, res) => {
  try {
    const balance = await feePoolApi.getVaultBalance();
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WORKAROUND: Create sponsor metadata account (bypasses Kora simulation issue)
// Accepts a partially signed transaction from frontend, adds Kora's signature, and sends it
// Frontend should get a fresh blockhash right before sending to avoid staleness
app.post('/api/sponsors/create-metadata-account', async (req, res) => {
  try {
    const { Connection, Transaction, Keypair } = require('@solana/web3.js');
    const fs = require('fs');
    
    const { transactionBase64 } = req.body;
    if (!transactionBase64) {
      return res.status(400).json({ error: 'transactionBase64 is required' });
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

    // Deserialize transaction from frontend (already signed by sponsor with fresh blockhash)
    const transactionBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(transactionBuffer);

    // Load Kora keypair and sign as fee payer
    const koraKeypairPath = process.env.KORA_KEYPAIR_PATH || '/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json';
    const koraKeypairData = JSON.parse(fs.readFileSync(koraKeypairPath, 'utf8'));
    const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));

    // Add Kora's signature (blockhash should still be valid if frontend got it fresh)
    transaction.partialSign(koraKeypair);

    // Send directly to network (bypassing Kora RPC to avoid simulation issue)
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signature, 'confirmed');

    res.json({ 
      signature,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error creating metadata account:', error);
    // If blockhash is stale, provide helpful error
    if (error.message && error.message.includes('Blockhash not found')) {
      res.status(400).json({ 
        error: 'Blockhash expired. Please try again - the transaction will be rebuilt with a fresh blockhash.' 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Stats: http://localhost:${PORT}/api/fee-payer/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});
