const { Transaction, PublicKey } = require('@solana/web3.js');

const base64Tx = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACmxu2xjPRwbfwLdjcsN5S88m9qo12847lKCmJnfwEfZ98CVJOGNNAM02e+1vKzUj24uENhX7pgPZWLqmkca0UCAgAECrAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxMCUR6OwTsCLMLYQn/kH6MFeLDqK/riH5V/QjlUgs9pgYPbVzC+YELNNUqBGK0x+Q/rbmYy8C/qac1q/ggSB0qE24e8aZE9Ghv+NvrSnpgnPAvB/yyktIxO85qFapJjYXa4/4woD3g+oWzWr0jk0YaBYn0e9kn1HKs/ptFuijfDvyZ60RH/4FaQey4eCbycvyI4aHo3whX9Vyn49pmAVArgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2AGp9UXGSxcUSGMyUw9SvF/WNruCJuh/UTj29mKAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpgbjc7LQezxO2ATlEg4xRtQGaDW83i85JYGOtbtYJclUBBwkFAgMEAAEGCQgQzi+LPLj8JpvAJwkAAAAAAA==";

const txBuffer = Buffer.from(base64Tx, 'base64');
const tx = Transaction.from(txBuffer);

const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');

console.log('Deposit Transaction (Error 0x1) Analysis:');
console.log('=========================================\n');

// Check if this is ATA creation + deposit
console.log('Number of instructions:', tx.instructions.length);

tx.instructions.forEach((ix, i) => {
  console.log(`\n--- Instruction ${i} ---`);
  console.log('Program:', ix.programId.toBase58());

  if (ix.programId.equals(programId)) {
    console.log('Type: Fee Pool Instruction');
    console.log('Data (hex):', ix.data.toString('hex'));

    if (ix.data.length === 16) {
      const discriminator = ix.data.slice(0, 8).toString('hex');
      const amount = ix.data.slice(8, 16).readBigUInt64LE();
      console.log('Discriminator:', discriminator);
      console.log('Amount:', amount.toString(), 'base units');
      console.log('Amount (USDC):', (Number(amount) / 1_000_000).toFixed(6), 'USDC');
    }
  } else {
    console.log('Type: Other program');
  }

  console.log('Accounts:');
  ix.keys.forEach((key, j) => {
    const role = j === 0 ? 'fee_pool' :
                 j === 1 ? 'sponsor_record' :
                 j === 2 ? 'usdc_vault' :
                 j === 3 ? 'payer_usdc' :
                 j === 4 ? 'payer' :
                 j === 5 ? 'sponsor' :
                 j === 6 ? 'system_program' :
                 j === 7 ? 'token_program' :
                 j === 8 ? 'rent' : 'unknown';
    console.log(`  ${j} (${role}): ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
  });
});
