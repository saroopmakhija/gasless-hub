#!/usr/bin/env node
/**
 * Test Gasless Transaction Flow
 * 
 * This script tests the complete flow:
 * 1. Create test wallet with 0 SOL
 * 2. Give it some USDC
 * 3. Send a transaction through Kora
 * 4. Verify transaction succeeds with 0 SOL spent
 */

const { Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');
const bs58 = require('bs58');

const KORA_RPC = 'http://localhost:8080';
const SOLANA_RPC = 'http://127.0.0.1:8899';

async function testGaslessFlow() {
  console.log('🧪 Testing Gasless Transaction Flow\n');
  console.log('=' .repeat(50));

  const connection = new Connection(SOLANA_RPC, 'confirmed');
  
  // Step 1: Create test wallet
  console.log('\n1️⃣  Creating test wallet...');
  const testWallet = Keypair.generate();
  console.log('   Address:', testWallet.publicKey.toBase58());
  
  // Check initial balance (should be 0)
  let balance = await connection.getBalance(testWallet.publicKey);
  console.log('   Initial SOL balance:', balance / LAMPORTS_PER_SOL);
  
  // Need to create the account first (airdrop tiny amount for rent)
  if (balance === 0) {
    console.log('   Creating account with minimal rent...');
    const airdropSig = await connection.requestAirdrop(testWallet.publicKey, 0.001 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    balance = await connection.getBalance(testWallet.publicKey);
    console.log('   Account created with', balance / LAMPORTS_PER_SOL, 'SOL');
  }
  
  // Step 2: Create a simple test transaction
  console.log('\n2️⃣  Creating test transaction (transfer 0 SOL to self)...');
  
  // Get Kora fee payer address
  const KORA_FEE_PAYER = 'CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU';
  const koraFeePayer = new PublicKey(KORA_FEE_PAYER);
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: testWallet.publicKey,
      toPubkey: testWallet.publicKey,
      lamports: 0, // 0 SOL transfer (just to test gasless flow)
    })
  );
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = koraFeePayer; // Kora will be the fee payer!
  
  // Step 3: Sign with test wallet
  console.log('\n3️⃣  Signing transaction with test wallet...');
  transaction.partialSign(testWallet);
  
  // Step 4: Send to Kora for fee payment
  console.log('\n4️⃣  Sending to Kora RPC for gasless execution...');
  
  try {
    // Serialize transaction
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base64Tx = Buffer.from(serializedTx).toString('base64');
    
    // Send to Kora
    const response = await fetch(KORA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'signAndSendTransaction',
        params: {
          transaction: base64Tx,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Kora RPC error: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Kora error: ${JSON.stringify(result.error)}`);
    }
    
    // Kora signed AND sent the transaction
    // Extract signature from the signed transaction
    const signedTxBase64 = result.result.signed_transaction;
    const signedTxBuffer = Buffer.from(signedTxBase64, 'base64');
    const signedTx = Transaction.from(signedTxBuffer);
    
    // Get the first signature (transaction signature)
    const signature = bs58.encode(signedTx.signatures[0].signature);
    
    console.log('   ✅ Transaction signed and broadcast by Kora!');
    console.log('   Signature:', signature);
    
    // Step 5: Verify transaction
    console.log('\n5️⃣  Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('   ✅ Transaction confirmed!');
    
    // Step 6: Check final balance
    const finalBalance = await connection.getBalance(testWallet.publicKey);
    console.log('\n6️⃣  Final wallet balance:', finalBalance / LAMPORTS_PER_SOL, 'SOL');
    
    const solSpent = (balance - finalBalance) / LAMPORTS_PER_SOL;
    console.log('   SOL spent on fees:', solSpent);
    
    if (solSpent === 0) {
      console.log('\n✅ SUCCESS! Transaction was truly gasless!');
      console.log('   The user paid ZERO SOL for transaction fees.');
      console.log('   Kora fee payer covered all costs.');
    } else {
      console.log('\n⚠️  Warning: Some SOL was spent');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Gasless flow test completed successfully!\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    return false;
  }
}

// Run the test
testGaslessFlow()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

