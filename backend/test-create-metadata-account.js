const { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function testCreateMetadataAccount() {
  // Load Kora keypair (for signing as fee payer in backend)
  const koraKeypairPath = '/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json';
  const koraKeypairData = JSON.parse(fs.readFileSync(koraKeypairPath, 'utf8'));
  const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));
  
  // Generate a test sponsor wallet
  const sponsorKeypair = Keypair.generate();
  console.log('Test sponsor wallet:', sponsorKeypair.publicKey.toBase58());
  console.log('Kora fee payer:', koraKeypair.publicKey.toBase58());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const KORA_FEE_PAYER = koraKeypair.publicKey;

  // Derive PDA
  const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sponsor_metadata'), sponsorKeypair.publicKey.toBuffer()],
    programId
  );

  console.log('\n📋 Test Details:');
  console.log('  PDA:', sponsorMetadataPda.toBase58());
  console.log('  Sponsor:', sponsorKeypair.publicKey.toBase58());
  console.log('  Payer:', KORA_FEE_PAYER.toBase58());

  // Check if account already exists
  const existing = await connection.getAccountInfo(sponsorMetadataPda);
  if (existing) {
    console.log('\n⚠️  Account already exists! Owner:', existing.owner.toBase58());
    if (existing.owner.equals(programId)) {
      console.log('✅ Account is correctly owned by program');
      return;
    } else {
      console.log('❌ Account is owned by wrong program!');
      return;
    }
  }

  console.log('\n🔨 Building transaction...');

  // Build instruction with empty strings (just to create the account)
  const discriminator = Buffer.from([144, 139, 146, 240, 87, 58, 92, 90]);
  const emptyNameBytes = Buffer.from('', 'utf8');
  const emptyWebsiteBytes = Buffer.from('', 'utf8');
  const emptyLogoUrlBytes = Buffer.from('', 'utf8');

  const data = Buffer.concat([
    discriminator,
    Buffer.from(new Uint32Array([emptyNameBytes.length]).buffer),
    emptyNameBytes,
    Buffer.from(new Uint32Array([emptyWebsiteBytes.length]).buffer),
    emptyWebsiteBytes,
    Buffer.from(new Uint32Array([emptyLogoUrlBytes.length]).buffer),
    emptyLogoUrlBytes,
  ]);

  const instruction = new TransactionInstruction({
    programId: programId,
    keys: [
      { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
      { pubkey: KORA_FEE_PAYER, isSigner: true, isWritable: true },
      { pubkey: sponsorKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  // Create transaction and sign with sponsor
  const transaction = new Transaction();
  transaction.feePayer = KORA_FEE_PAYER;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.add(instruction);
  transaction.partialSign(sponsorKeypair);

  // Serialize transaction
  const transactionBase64 = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  console.log('✅ Transaction built and signed by sponsor');
  console.log('📤 Sending to backend API...\n');

  // Send to backend API
  try {
    const response = await fetch('http://localhost:3001/api/sponsors/create-metadata-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionBase64,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend API error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Backend API response:', result);

    // Wait a moment for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify account was created
    console.log('\n🔍 Verifying account creation...');
    const accountInfo = await connection.getAccountInfo(sponsorMetadataPda);
    if (accountInfo) {
      console.log('✅ Account exists!');
      console.log('  Owner:', accountInfo.owner.toBase58());
      console.log('  Data length:', accountInfo.data.length);
      console.log('  Lamports:', accountInfo.lamports);
      
      if (accountInfo.owner.equals(programId)) {
        console.log('\n🎉 SUCCESS! Account created correctly!');
      } else {
        console.log('\n❌ Account owner mismatch!');
      }
    } else {
      console.log('❌ Account not found after creation');
    }

  } catch (error) {
    console.error('❌ Error calling backend API:', error.message);
  }
}

testCreateMetadataAccount().catch(console.error);


