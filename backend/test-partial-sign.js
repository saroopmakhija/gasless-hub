const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testPartialSign() {
  // Load Kora fee payer wallet
  const koraKeypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));
  console.log('Kora fee payer:', koraKeypair.publicKey.toBase58());

  // Load your user wallet (from Samui)
  const userPublicKey = new PublicKey('4EwMZ3btBiv1r7yxTHh9inUQK3nqNGNC5NxdZtmfpQVD');
  
  // For testing, create a dummy user keypair (in production, this comes from Samui)
  const dummyUserKeypair = Keypair.generate();
  console.log('Dummy user (for testing):', dummyUserKeypair.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');

  // Derive sponsor metadata PDA for dummy user
  const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sponsor_metadata'), dummyUserKeypair.publicKey.toBuffer()],
    programId
  );

  console.log('Sponsor metadata PDA:', sponsorMetadataPda.toBase58());

  // Build instruction
  const discriminator = Buffer.from([144, 139, 146, 240, 87, 58, 92, 90]);
  const name = 'Test';
  const website = 'https://test.com';
  const logoUrl = 'https://test.com/logo.png';

  const nameBytes = Buffer.from(name, 'utf8');
  const websiteBytes = Buffer.from(website, 'utf8');
  const logoUrlBytes = Buffer.from(logoUrl, 'utf8');

  const data = Buffer.concat([
    discriminator,
    Buffer.from(new Uint32Array([nameBytes.length]).buffer),
    nameBytes,
    Buffer.from(new Uint32Array([websiteBytes.length]).buffer),
    websiteBytes,
    Buffer.from(new Uint32Array([logoUrlBytes.length]).buffer),
    logoUrlBytes,
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
      { pubkey: dummyUserKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: programId,
    data,
  });

  // Create transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = koraKeypair.publicKey; // Kora is fee payer

  console.log('\n📝 Transaction before user signs:');
  console.log('  Fee payer:', transaction.feePayer.toBase58());
  console.log('  Signatures needed:', transaction.signatures.length);

  // User signs (partialSign)
  transaction.partialSign(dummyUserKeypair);
  
  console.log('\n✍️  After user partialSign:');
  console.log('  Signatures present:', transaction.signatures.filter(s => s.signature !== null).length);
  console.log('  User signature:', transaction.signatures.find(s => s.publicKey.equals(dummyUserKeypair.publicKey))?.signature ? 'YES' : 'NO');
  console.log('  Kora signature:', transaction.signatures.find(s => s.publicKey.equals(koraKeypair.publicKey))?.signature ? 'YES' : 'NO');

  // Serialize for Kora
  const serialized = transaction.serialize({ requireAllSignatures: false });
  const base64 = serialized.toString('base64');
  
  console.log('\n📤 Sending to Kora:');
  console.log('  Transaction size:', serialized.length, 'bytes');
  console.log('  Base64 (first 100 chars):', base64.substring(0, 100));

  // Send to Kora
  try {
    const response = await fetch('http://localhost:8080', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'signAndSendTransaction',
        params: {
          transaction: base64,
        },
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      console.log('\n❌ Kora error:', result.error.message);
    } else {
      console.log('\n✅ Kora success! Signature:', result.result.signature);
    }
  } catch (error) {
    console.error('\n💥 Request error:', error.message);
  }
}

testPartialSign();

