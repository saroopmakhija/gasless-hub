const { Transaction } = require('@solana/web3.js');

const base64Tx = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXb3Jb0UTvA998btuRRxdiJN/kSIqJp1Ht1crxRVT6T9bdVn7N+dsZq2yzQs+Sali/kRyHDc2+6ZSoezR9JLwGAgAECrAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxwTcEo5IdR/sKtfxrHccdDod8hiYmTZlntNwanFUJR2JNuHvGmRPRob/jb60p6YJzwLwf8spLSMTvOahWqSY2F4rD/JuGPMviGKq+0eZbQk4aOLV15qh0/y6IBY7vY0xuz2yqNK2m9mWdGQdvtLFrwLv2EggQObn/bH9jO8vI5VDyZ60RH/4FaQey4eCbycvyI4aHo3whX9Vyn49pmAVArgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2AGp9UXGSxcUSGMyUw9SvF/WNruCJuh/UTj29mKAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpSeZkQ201L8a2spO5ZURz527fcyV/5Q3xFdJazswmPsYBBwkFAwIEAAEGCQgQzi+LPLj8JptgrgoAAAAAAA==";

try {
  const txBuffer = Buffer.from(base64Tx, 'base64');
  const tx = Transaction.from(txBuffer);

  console.log('Transaction Details:');
  console.log('===================');
  console.log('Fee Payer:', tx.feePayer?.toBase58());
  console.log('Recent Blockhash:', tx.recentBlockhash);
  console.log('Number of signatures:', tx.signatures.length);
  console.log('Number of instructions:', tx.instructions.length);

  console.log('\nInstructions:');
  tx.instructions.forEach((ix, i) => {
    console.log(`\nInstruction ${i}:`);
    console.log('  Program:', ix.programId.toBase58());
    console.log('  Number of keys:', ix.keys.length);
    console.log('  Data length:', ix.data.length);
    console.log('  Data (hex):', ix.data.toString('hex'));
    console.log('  Accounts:');
    ix.keys.forEach((key, j) => {
      console.log(`    ${j}: ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
    });
  });
} catch (error) {
  console.error('Error decoding transaction:', error.message);
}
