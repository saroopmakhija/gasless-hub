const { VersionedTransaction, PublicKey } = require('@solana/web3.js');

// Transaction from Kora logs (line 104)
const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABeahDHNDzHRMbUDKlrsWMbi4BvhmddPcP1Ke9rIJGU/dO6ja7KG7TGs0e2yDfbIHWdTuI6oUOBuc3G0who0jcIAgACBbAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxMCUR6OwTsCLMLYQn/kH6MFeLDqK/riH5V/QjlUgs9pgoxg202XijxWfGBIaRzQUJc/PVgB51LDsa9wuopXEgXgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2Dv6KsHedNZaXOBvndGXqY38RVYkrf7/ziIJyoviNpa+AEEAwIBA2CQi5LwVzpcWgYAAABnZW1pbmkWAAAAaHR0cHM6Ly93d3cuZ2VtaW5pLmNvbTAAAABodHRwczovL3d3dy5nZW1pbmkuY29tL3N0YXRpYy9pbWFnZXMvb2ctbWV0YS5wbmc=";

const txBuffer = Buffer.from(txBase64, 'base64');
const tx = VersionedTransaction.deserialize(txBuffer);

console.log('🔍 Frontend Transaction Analysis:\n');
console.log('Message version:', tx.version);
console.log('Number of signatures:', tx.signatures.length);
console.log('Signature 0 (should be user):', tx.signatures[0] ? 'PRESENT' : 'NULL');
console.log('Signature 1 (should be Kora):', tx.signatures[1] ? 'PRESENT' : 'NULL');

console.log('\n📋 Account keys:');
tx.message.staticAccountKeys.forEach((key, i) => {
  console.log(`  ${i}: ${key.toBase58()}`);
});

console.log('\n🎯 Instruction details:');
const ix = tx.message.compiledInstructions[0];
console.log('  Program ID index:', ix.programIdIndex);
console.log('  Program ID:', tx.message.staticAccountKeys[ix.programIdIndex].toBase58());
console.log('  Account indices:', Array.from(ix.accountKeyIndexes));
console.log('  Accounts used:');
ix.accountKeyIndexes.forEach(idx => {
  console.log(`    - ${tx.message.staticAccountKeys[idx].toBase58()}`);
});

console.log('\n  Instruction data:');
console.log('    Discriminator:', Array.from(ix.data.slice(0, 8)));
console.log('    Data length:', ix.data.length);

// Decode the metadata
let offset = 8;
const nameLen = ix.data.readUInt32LE(offset);
offset += 4;
const name = ix.data.slice(offset, offset + nameLen).toString('utf8');
offset += nameLen;

const websiteLen = ix.data.readUInt32LE(offset);
offset += 4;
const website = ix.data.slice(offset, offset + websiteLen).toString('utf8');
offset += websiteLen;

const logoLen = ix.data.readUInt32LE(offset);
offset += 4;
const logo = ix.data.slice(offset, offset + logoLen).toString('utf8');

console.log('\n  Decoded metadata:');
console.log('    Name:', name);
console.log('    Website:', website);
console.log('    Logo:', logo);

// Check PDA derivation
const userPubkey = tx.message.staticAccountKeys[1];
const programId = tx.message.staticAccountKeys[ix.programIdIndex];
const [expectedPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('sponsor_metadata'), userPubkey.toBuffer()],
  programId
);

const actualPda = tx.message.staticAccountKeys[ix.accountKeyIndexes[0]];

console.log('\n✅ PDA Verification:');
console.log('  Expected PDA:', expectedPda.toBase58());
console.log('  Actual PDA:  ', actualPda.toBase58());
console.log('  Match:', expectedPda.equals(actualPda) ? 'YES ✓' : 'NO ✗');

