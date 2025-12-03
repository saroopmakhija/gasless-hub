const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testDirect() {
  // Load Kora keypair (as payer)
  const koraKeypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));
  
  // Generate a test user wallet
  const userKeypair = Keypair.generate();
  console.log('User wallet:', userKeypair.publicKey.toBase58());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const KORA_FEE_PAYER = koraKeypair.publicKey;

  // Airdrop SOL to user for rent (if needed) - but we won't use it since Kora pays
  console.log('Airdropping SOL to user (for testing)...');
  try {
    const sig = await connection.requestAirdrop(userKeypair.publicKey, 1e9);
    await connection.confirmTransaction(sig);
    console.log('✅ Airdropped 1 SOL');
  } catch (e) {
    console.log('Airdrop failed (might be rate limited):', e.message);
  }

  // Derive PDA
  const [sponsorMetadataPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('sponsor_metadata'), userKeypair.publicKey.toBuffer()],
    programId
  );

  console.log('\nBuilding transaction...');
  console.log('PDA:', sponsorMetadataPda.toBase58());
  console.log('Bump:', bump);
  console.log('Payer:', KORA_FEE_PAYER.toBase58());
  console.log('Sponsor:', userKeypair.publicKey.toBase58());

  // Check if account exists
  const existingAccount = await connection.getAccountInfo(sponsorMetadataPda);
  if (existingAccount) {
    console.log('⚠️  Account exists! Owner:', existingAccount.owner.toBase58());
    if (!existingAccount.owner.equals(programId)) {
      console.log('❌ Account is owned by wrong program!');
      return;
    }
  } else {
    console.log('✅ Account does not exist - will be created');
  }

  // Build instruction exactly as frontend does
  const discriminator = Buffer.from([144, 139, 146, 240, 87, 58, 92, 90]);
  const name = 'Test Direct';
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
    programId: programId,
    keys: [
      { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
      { pubkey: KORA_FEE_PAYER, isSigner: true, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  // Create transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = KORA_FEE_PAYER;

  // Sign with both signers
  transaction.partialSign(userKeypair);
  transaction.partialSign(koraKeypair);

  console.log('\nSimulating transaction...');
  try {
    const result = await connection.simulateTransaction(transaction);
    
    if (result.value.err) {
      console.log('❌ Simulation failed:', JSON.stringify(result.value.err, null, 2));
      if (result.value.logs) {
        console.log('\nLogs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
    } else {
      console.log('✅ Simulation succeeded!');
      console.log('Units consumed:', result.value.unitsConsumed);
      if (result.value.logs) {
        console.log('\nLogs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
      
      // If simulation works, try sending
      console.log('\nSending transaction...');
      const sig = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log('✅ Transaction sent:', sig);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log('✅ Transaction confirmed!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirect().catch(console.error);

