const anchor = require('@coral-xyz/anchor');
const { PublicKey } = require('@solana/web3.js');

const NEW_USDC_MINT = new PublicKey('3RGmLbkfpcArBosmz3no9SXSJ1bo3oFSdcQ2rQgrhy6U');
const NEW_USDC_VAULT = new PublicKey('E6sj9LLowq2uJn2TpHYKxcvM2VvwrAmruqwZyiyJa8js');

async function updateFeePool() {
  // Connect to devnet
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const idl = require('../target/idl/fee_pool.json');
  const program = new anchor.Program(idl, programId, provider);

  console.log('🔄 Updating Fee Pool USDC configuration...');
  console.log('Program ID:', programId.toBase58());
  console.log('Admin:', wallet.publicKey.toBase58());
  console.log('New USDC Mint:', NEW_USDC_MINT.toBase58());
  console.log('New USDC Vault:', NEW_USDC_VAULT.toBase58());

  // Derive fee pool PDA
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    programId
  );

  console.log('Fee Pool PDA:', feePoolPda.toBase58());

  try {
    // Call update_fee_pool instruction
    const tx = await program.methods
      .updateFeePool(NEW_USDC_MINT, NEW_USDC_VAULT)
      .accounts({
        feePool: feePoolPda,
        admin: wallet.publicKey,
      })
      .rpc();

    console.log('✅ Fee Pool updated successfully!');
    console.log('Transaction:', tx);

    // Fetch and display updated state
    const feePool = await program.account.feePool.fetch(feePoolPda);
    console.log('\n📊 Updated Fee Pool State:');
    console.log('  Authority:', feePool.authority.toBase58());
    console.log('  USDC Mint:', feePool.usdcMint.toBase58());
    console.log('  USDC Vault:', feePool.usdcVault.toBase58());
    console.log('  Total Deposited:', feePool.totalDeposited.toString());
    console.log('  Total Sponsors:', feePool.totalSponsors);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

updateFeePool().catch(console.error);
