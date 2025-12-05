#!/usr/bin/env node

import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { readFileSync } from 'fs';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const KORA_WALLET = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU');

async function createKoraUSDCAccount() {
  console.log('🔧 Creating Kora USDC Token Account on Solana Devnet\n');

  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // Derive Kora's USDC ATA address
  const koraUsdcATA = await getAssociatedTokenAddress(USDC_MINT, KORA_WALLET);

  console.log('Kora Wallet:', KORA_WALLET.toString());
  console.log('Kora USDC ATA:', koraUsdcATA.toString());
  console.log('');

  // Check if it already exists
  const accountInfo = await connection.getAccountInfo(koraUsdcATA);

  if (accountInfo) {
    console.log('✅ Kora USDC account already exists!');
    console.log('   Address:', koraUsdcATA.toString());
    return;
  }

  console.log('❌ Kora USDC account does not exist. Creating it now...\n');

  // Need a wallet with SOL to pay for account creation
  // You can pass your Phantom wallet's private key as an environment variable
  // or use a keypair file

  let payer;

  if (process.env.PAYER_SECRET_KEY) {
    // Use secret key from environment
    const secretKey = JSON.parse(process.env.PAYER_SECRET_KEY);
    payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
    console.log('Using payer from PAYER_SECRET_KEY env variable');
  } else if (process.argv[2]) {
    // Use keypair file path from argument
    const keypairPath = process.argv[2];
    const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
    payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log('Using payer from keypair file:', keypairPath);
  } else {
    console.log('❌ No payer wallet provided!');
    console.log('');
    console.log('To create the account, you need a wallet with SOL to pay rent.');
    console.log('');
    console.log('Option 1: Use environment variable');
    console.log('  PAYER_SECRET_KEY=\'[your,secret,key,array]\' node create-kora-usdc-account.mjs');
    console.log('');
    console.log('Option 2: Use keypair file');
    console.log('  node create-kora-usdc-account.mjs /path/to/keypair.json');
    console.log('');
    console.log('Option 3: Use Solana CLI (easiest)');
    console.log('  spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --owner CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU --url devnet');
    console.log('');
    process.exit(1);
  }

  console.log('Payer wallet:', payer.publicKey.toString());

  // Check payer balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('Payer balance:', balance / 1e9, 'SOL');

  if (balance < 0.01e9) {
    console.log('❌ Insufficient SOL balance. Need at least 0.01 SOL for rent.');
    console.log('   Get devnet SOL: solana airdrop 1 ' + payer.publicKey.toString() + ' --url devnet');
    process.exit(1);
  }

  // Create the ATA instruction
  const createAtaIx = createAssociatedTokenAccountInstruction(
    payer.publicKey, // payer
    koraUsdcATA, // ata
    KORA_WALLET, // owner
    USDC_MINT // mint
  );

  const transaction = new Transaction().add(createAtaIx);

  console.log('');
  console.log('📤 Sending transaction...');

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log('✅ Kora USDC account created successfully!');
    console.log('');
    console.log('Account address:', koraUsdcATA.toString());
    console.log('Transaction:', signature);
    console.log('Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
    console.log('');
    console.log('🎉 Base → Solana CCTP bridge will now work!');
  } catch (error) {
    console.log('❌ Transaction failed:', error.message);
    process.exit(1);
  }
}

createKoraUSDCAccount().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
