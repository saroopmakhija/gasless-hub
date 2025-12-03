#!/usr/bin/env node
/**
 * Test Send Functionality
 * Tests the logic that SendModal uses to send SOL/tokens
 */

const { Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');
const bs58 = require('bs58');

const KORA_RPC = 'http://localhost:8080';
const SOLANA_RPC = 'http://127.0.0.1:8899';
const KORA_FEE_PAYER = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU');

async function testSendSOL() {
  console.log('🧪 Testing Send SOL Functionality\n');
  console.log('=' .repeat(50));

  const connection = new Connection(SOLANA_RPC, 'confirmed');
  
  // Step 1: Create sender wallet and fund it
  console.log('\n1️⃣  Creating sender wallet...');
  const sender = Keypair.generate();
  console.log('   Sender:', sender.publicKey.toBase58());
  
  // Fund sender with some SOL
  const airdropSig = await connection.requestAirdrop(sender.publicKey, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig);
  
  const initialBalance = await connection.getBalance(sender.publicKey);
  console.log('   Initial balance:', initialBalance / LAMPORTS_PER_SOL, 'SOL');
  
  // Step 2: Create recipient
  console.log('\n2️⃣  Creating recipient...');
  const recipient = Keypair.generate();
  console.log('   Recipient:', recipient.publicKey.toBase58());
  
  // Step 3: Create send transaction (like SendModal does)
  console.log('\n3️⃣  Creating send transaction (0.5 SOL)...');
  const sendAmount = 0.5;
  const lamports = Math.floor(sendAmount * LAMPORTS_PER_SOL);
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient.publicKey,
      lamports,
    })
  );
  
  // Set Kora as fee payer
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = KORA_FEE_PAYER;
  
  // Step 4: Sender signs
  console.log('\n4️⃣  Sender signing transaction...');
  transaction.partialSign(sender);
  
  // Step 5: Send through Kora (gasless)
  console.log('\n5️⃣  Sending through Kora for gasless execution...');
  
  try {
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base64Tx = Buffer.from(serializedTx).toString('base64');
    
    const response = await fetch(KORA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'signAndSendTransaction',
        params: { transaction: base64Tx },
      }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Kora error: ${JSON.stringify(result.error)}`);
    }
    
    // Extract signature
    const signedTxBase64 = result.result.signed_transaction;
    const signedTxBuffer = Buffer.from(signedTxBase64, 'base64');
    const signedTx = Transaction.from(signedTxBuffer);
    const signature = bs58.encode(signedTx.signatures[0].signature);
    
    console.log('   ✅ Transaction broadcast!');
    console.log('   Signature:', signature);
    
    // Step 6: Wait for confirmation
    console.log('\n6️⃣  Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('   ✅ Confirmed!');
    
    // Step 7: Verify balances
    console.log('\n7️⃣  Verifying balances...');
    const senderFinalBalance = await connection.getBalance(sender.publicKey);
    const recipientBalance = await connection.getBalance(recipient.publicKey);
    
    console.log('   Sender final balance:', senderFinalBalance / LAMPORTS_PER_SOL, 'SOL');
    console.log('   Recipient balance:', recipientBalance / LAMPORTS_PER_SOL, 'SOL');
    console.log('   Amount sent:', sendAmount, 'SOL');
    
    // Calculate SOL spent on fees
    const expectedBalance = initialBalance - lamports;
    const actualBalance = senderFinalBalance;
    const feesSpent = (expectedBalance - actualBalance) / LAMPORTS_PER_SOL;
    
    console.log('   Fees paid by sender:', feesSpent, 'SOL');
    
    if (feesSpent === 0) {
      console.log('\n✅ SUCCESS! Send was gasless!');
    } else {
      console.log('\n⚠️  Warning: Sender paid', feesSpent, 'SOL in fees');
    }
    
    if (recipientBalance === lamports) {
      console.log('✅ Recipient received correct amount!');
    } else {
      console.log('❌ Recipient balance mismatch!');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Send SOL test completed!\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    return false;
  }
}

// Test validation logic (like SendModal does)
async function testValidation() {
  console.log('\n🧪 Testing Address Validation\n');
  console.log('=' .repeat(50));
  
  const validateAddress = (address) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };
  
  const testCases = [
    { address: 'HYmTJA5jGMCw2DPg5xmnGxHeRwHL2V87tfJhvpWrfQH7', expected: true, desc: 'Valid address' },
    { address: 'invalid', expected: false, desc: 'Invalid address' },
    { address: '', expected: false, desc: 'Empty address' },
    { address: '11111111111111111111111111111111', expected: true, desc: 'System program' },
  ];
  
  let passed = 0;
  for (const test of testCases) {
    const result = validateAddress(test.address);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.desc}: ${test.address.slice(0, 20)}... → ${result}`);
    if (result === test.expected) passed++;
  }
  
  console.log(`\nPassed ${passed}/${testCases.length} validation tests\n`);
}

// Run tests
async function main() {
  await testValidation();
  const success = await testSendSOL();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

