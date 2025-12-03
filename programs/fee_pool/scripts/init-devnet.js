const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

const USDC_MINT = new PublicKey('3RGmLbkfpcArBosmz3no9SXSJ1bo3oFSdcQ2rQgrhy6U'); // Test USDC with controlled authority

async function initDevnet() {
  // Connect to devnet
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
  const idl = require('../target/idl/fee_pool.json');
  const program = new anchor.Program(idl, programId, provider);

  console.log('🚀 Initializing Fee Pool on Devnet...');
  console.log('Program ID:', programId.toBase58());
  console.log('Authority:', wallet.publicKey.toBase58());

  // Derive PDAs
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    programId
  );

  const [usdcVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
    programId
  );

  console.log('Fee Pool PDA:', feePoolPda.toBase58());
  console.log('USDC Vault PDA:', usdcVaultPda.toBase58());

  try {
    // Check if already initialized
    try {
      const feePool = await program.account.feePool.fetch(feePoolPda);
      console.log('✅ Fee Pool already initialized!');
      console.log('Total Deposited:', feePool.totalDeposited.toString());
      console.log('Total Sponsors:', feePool.totalSponsors);
      return;
    } catch (e) {
      console.log('Fee Pool not initialized, creating...');
    }

    // Initialize fee pool
    const tx = await program.methods
      .initializeFeePool()
      .accounts({
        authority: wallet.publicKey,
      })
      .rpc();

    console.log('✅ Fee Pool initialized!');
    console.log('Transaction:', tx);

    // Fetch and display
    const feePool = await program.account.feePool.fetch(feePoolPda);
    console.log('\n📊 Fee Pool State:');
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

initDevnet().catch(console.error);

