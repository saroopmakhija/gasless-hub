const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testDirect() {
  // Load user wallet
  const userPubkey = new PublicKey('4EwMZ3btBiv1r7yxTHh9inUQK3nqNGNC5NxdZtmfpQVD');
  
  // For testing, we'll use Kora's keypair to sign (since user needs to sign)
  // In real flow, user signs with their keypair
  const koraKeypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const KORA_FEE_PAYER = koraKeypair.publicKey;

  // Derive PDA
  const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sponsor_metadata'), userPubkey.toBuffer()],
    programId
  );

  console.log('Testing direct transaction on devnet...');
  console.log('PDA:', sponsorMetadataPda.toBase58());
  console.log('Payer (Kora):', KORA_FEE_PAYER.toBase58());
  console.log('Sponsor (User):', userPubkey.toBase58());

  // Build instruction
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
      { pubkey: userPubkey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  // Create transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = KORA_FEE_PAYER;

  // Sign with both (simulating user + Kora)
  transaction.partialSign(koraKeypair); // User would sign here, but for test we use Kora
  transaction.partialSign(koraKeypair); // Kora signs as payer

  console.log('\nSimulating transaction...');
  try {
    const result = await connection.simulateTransaction(transaction, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });

    if (result.value.err) {
      console.log('❌ Simulation failed:', JSON.stringify(result.value.err, null, 2));
      if (result.value.logs) {
        console.log('\nLogs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
    } else {
      console.log('✅ Simulation succeeded!');
      if (result.value.logs) {
        console.log('\nLogs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
    }
  } catch (error) {
    console.error('💥 Simulation error:', error.message);
  }
}

testDirect();

