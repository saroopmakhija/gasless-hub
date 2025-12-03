const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testDirect() {
  // Load keypairs
  const koraKeypairData = JSON.parse(fs.readFileSync('/Users/saroopmakhija/gasless-hub/kora-config/fee-payer.json', 'utf8'));
  const koraKeypair = Keypair.fromSecretKey(Uint8Array.from(koraKeypairData));
  
  const userPubkey = new PublicKey('4EwMZ3btBiv1r7yxTHh9inUQK3nqNGNC5NxdZtmfpQVD');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  
  // Load IDL
  const idl = require('../programs/fee_pool/target/idl/fee_pool.json');
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(koraKeypair),
    { commitment: 'confirmed' }
  );
  
  const program = new anchor.Program(idl, programId, provider);
  
  console.log('Testing setSponsorMetadata directly...');
  
  try {
    const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sponsor_metadata'), userPubkey.toBuffer()],
      programId
    );
    
    console.log('PDA:', sponsorMetadataPda.toBase58());
    console.log('Payer:', koraKeypair.publicKey.toBase58());
    console.log('Sponsor:', userPubkey.toBase58());
    
    // Try to call the instruction
    const tx = await program.methods
      .setSponsorMetadata(
        'Test Direct',
        'https://test.com',
        'https://test.com/logo.png'
      )
      .accounts({
        sponsorMetadata: sponsorMetadataPda,
        payer: koraKeypair.publicKey,
        sponsor: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Success! Transaction:', tx);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
  }
}

testDirect();

