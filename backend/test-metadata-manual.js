const { Connection, PublicKey, Keypair, TransactionInstruction, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const crypto = require('crypto');

async function testSetMetadata() {
  // Load Kora fee payer wallet
  const keypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log('Testing with wallet:', wallet.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Wallet balance:', balance / 1e9, 'SOL\n');

  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');

  // Derive sponsor metadata PDA
  const [sponsorMetadataPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('sponsor_metadata'), wallet.publicKey.toBuffer()],
    programId
  );
  console.log('Sponsor metadata PDA:', sponsorMetadataPda.toBase58());
  console.log('Bump:', bump);

  // Calculate discriminator for initialize_sponsor_metadata
  const discriminator = Buffer.from(
    crypto.createHash('sha256')
      .update('global:initialize_sponsor_metadata')
      .digest()
  ).subarray(0, 8);
  console.log('Discriminator:', Array.from(discriminator));

  // Serialize instruction data (Borsh format for Anchor strings)
  const name = 'Kora Test';
  const website = 'https://kora.network';
  const logoUrl = 'https://kora.network/logo.png';

  const nameBytes = Buffer.from(name, 'utf8');
  const websiteBytes = Buffer.from(website, 'utf8');
  const logoUrlBytes = Buffer.from(logoUrl, 'utf8');

  // Borsh encodes strings as: u32 length (little-endian) + bytes
  const data = Buffer.concat([
    discriminator,
    Buffer.from(new Uint32Array([nameBytes.length]).buffer),
    nameBytes,
    Buffer.from(new Uint32Array([websiteBytes.length]).buffer),
    websiteBytes,
    Buffer.from(new Uint32Array([logoUrlBytes.length]).buffer),
    logoUrlBytes,
  ]);

  console.log('\n📦 Instruction data length:', data.length);

  // Build instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: sponsorMetadataPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: programId,
    data,
  });

  try {
    // Send transaction
    console.log('\n🚀 Sending transaction...');
    const transaction = new Transaction().add(instruction);
    const signature = await connection.sendTransaction(transaction, [wallet], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('Transaction signature:', signature);
    console.log('Confirming...');
    
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Transaction confirmed!');

    // Try to fetch the account
    console.log('\n📊 Fetching metadata account...');
    const accountInfo = await connection.getAccountInfo(sponsorMetadataPda);
    if (accountInfo) {
      console.log('Account exists! Data length:', accountInfo.data.length);
      // Try to decode (simple read of strings)
      const data = accountInfo.data;
      console.log('Raw data (first 100 bytes):', Array.from(data.slice(0, 100)));
    } else {
      console.log('❌ Account not found');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
  }
}

testSetMetadata();
