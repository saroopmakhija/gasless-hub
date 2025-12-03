const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const bs58 = require('bs58');
const idl = require('../programs/fee_pool/target/idl/fee_pool.json');

async function testSetMetadata() {
  // Load Kora fee payer wallet (already funded on devnet)
  const fs = require('fs');
  const keypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log('Testing with wallet:', wallet.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Wallet balance:', balance / 1e9, 'SOL');

  // Setup Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: 'confirmed' }
  );
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const program = new anchor.Program(idl, programId, provider);

  console.log('\n🧪 Testing metadata init + update...');

  try {
    const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sponsor_metadata'), wallet.publicKey.toBuffer()],
      programId
    );

    console.log('Sponsor metadata PDA:', sponsorMetadataPda.toBase58());

    const initTx = await program.methods
      .initializeSponsorMetadata(
        'Test Sponsor',
        'https://test.com',
        'https://test.com/logo.png'
      )
      .accounts({
        sponsorMetadata: sponsorMetadataPda,
        payer: wallet.publicKey,
        sponsor: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Initialize transaction successful:', initTx);

    const updateTx = await program.methods
      .setSponsorMetadata(
        'Updated Sponsor',
        'https://updated.com',
        'https://updated.com/logo.png'
      )
      .accounts({
        sponsorMetadata: sponsorMetadataPda,
        sponsor: wallet.publicKey,
      })
      .rpc();

    console.log('✅ Update transaction successful:', updateTx);

    // Fetch the metadata
    const metadataAccount = await program.account.sponsorMetadata.fetch(sponsorMetadataPda);
    console.log('\n📊 Metadata:');
    console.log('  Name:', metadataAccount.name);
    console.log('  Website:', metadataAccount.website);
    console.log('  Logo URL:', metadataAccount.logoUrl);

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.logs) {
      console.error('Logs:', error.logs);
    }
  }
}

testSetMetadata();
