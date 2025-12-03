const { VersionedTransaction, PublicKey } = require('@solana/web3.js');

// Latest transaction from Kora logs (line 317)
const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADFZ+x4f5M0pj+1F8wGcgOYEA2Vw/94OGyCmiUFvA/0zr1YiMJccvH8OhvZLOjTrw7TfPg1xK7Es0yHfWL2oFAIAgECBbAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxMCUR6OwTsCLMLYQn/kH6MFeLDqK/riH5V/QjlUgs9pgoxg202XijxWfGBIaRzQUJc/PVgB51LDsa9wuopXEgXgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2Crto8U1GULK9fMVEAHqZPRzruv6vZkfpS6wRe1fGGA5gEEBAIAAQNgkIuS8Fc6XFoGAAAAZ2VtaW5pFgAAAGh0dHBzOi8vd3d3LmdlbWluaS5jb20wAAAAaHR0cHM6Ly93d3cuZ2VtaW5pLmNvbS9zdGF0aWMvaW1hZ2VzL29nLW1ldGEucG5n";

const txBuffer = Buffer.from(txBase64, 'base64');
const tx = VersionedTransaction.deserialize(txBuffer);

console.log('🔍 Transaction Analysis:\n');
console.log('Version:', tx.version);
console.log('Signatures:', tx.signatures.length);
console.log('Signature 0 (user):', tx.signatures[0] ? 'PRESENT' : 'NULL');
console.log('Signature 1 (Kora):', tx.signatures[1] ? 'PRESENT' : 'NULL');

console.log('\n📋 Account Keys:');
tx.message.staticAccountKeys.forEach((key, i) => {
  console.log(`  ${i}: ${key.toBase58()}`);
});

console.log('\n🎯 Instruction:');
const ix = tx.message.compiledInstructions[0];
console.log('  Program ID index:', ix.programIdIndex);
console.log('  Program ID:', tx.message.staticAccountKeys[ix.programIdIndex].toBase58());
console.log('  Account indices:', Array.from(ix.accountKeyIndexes));
console.log('\n  Accounts in instruction:');
ix.accountKeyIndexes.forEach((idx, i) => {
  const account = tx.message.staticAccountKeys[idx];
  const expected = ['sponsor_metadata', 'payer', 'sponsor', 'system_program'];
  console.log(`    ${i} (${expected[i]}): ${account.toBase58()}`);
});

// Verify PDA
const programId = tx.message.staticAccountKeys[ix.programIdIndex];
const sponsor = tx.message.staticAccountKeys[ix.accountKeyIndexes[2]]; // sponsor is index 2
const [expectedPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('sponsor_metadata'), sponsor.toBuffer()],
  programId
);
const actualPda = tx.message.staticAccountKeys[ix.accountKeyIndexes[0]];

console.log('\n✅ PDA Verification:');
console.log('  Expected:', expectedPda.toBase58());
console.log('  Actual:  ', actualPda.toBase58());
console.log('  Match:', expectedPda.equals(actualPda) ? 'YES ✓' : 'NO ✗');

