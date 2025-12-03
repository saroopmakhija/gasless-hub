const { VersionedTransaction } = require('@solana/web3.js');

// The transaction from Kora logs
const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgACBbAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxMCUR6OwTsCLMLYQn/kH6MFeLDqK/riH5V/QjlUgs9pgoxg202XijxWfGBIaRzQUJc/PVgB51LDsa9wuopXEgXgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2BRyxk90834AbZLdsQanhCRSzBaXEM6yZeypx6vopWA1QEEAwIBA2CQi5LwVzpcWgYAAABnZW1pbmkWAAAAaHR0cHM6Ly93d3cuZ2VtaW5pLmNvbTAAAABodHRwczovL3d3dy5nZW1pbmkuY29tL3N0YXRpYy9pbWFnZXMvb2ctbWV0YS5wbmc=";

const txBuffer = Buffer.from(txBase64, 'base64');
const tx = VersionedTransaction.deserialize(txBuffer);

console.log('Transaction details:');
console.log('Message version:', tx.version);
console.log('Signatures:', tx.signatures.length);
console.log('\nAccount keys:');
tx.message.staticAccountKeys.forEach((key, i) => {
  console.log(`  ${i}: ${key.toBase58()}`);
});

console.log('\nInstructions:', tx.message.compiledInstructions.length);
tx.message.compiledInstructions.forEach((ix, i) => {
  console.log(`\nInstruction ${i}:`);
  console.log('  Program ID index:', ix.programIdIndex);
  console.log('  Program ID:', tx.message.staticAccountKeys[ix.programIdIndex].toBase58());
  console.log('  Account indices:', Array.from(ix.accountKeyIndexes));
  console.log('  Data length:', ix.data.length);
  console.log('  Discriminator:', Array.from(ix.data.slice(0, 8)));
  console.log('  Full data (hex):', ix.data.toString('hex'));
  
  // Try to decode the strings
  let offset = 8; // Skip discriminator
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
});

