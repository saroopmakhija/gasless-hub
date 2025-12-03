const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Load the program IDL
const idl = JSON.parse(fs.readFileSync('./target/idl/fee_pool.json', 'utf8'));
const programId = new PublicKey('8uvizWEfsRhY4SGjiGCa6FDw9u1g1KFacFnKRYrpAS1y');

// USDC mint address
const USDC_MINT = new PublicKey('HoSwcrKD8UGB34FdPrDstCQdZspFs4rmwVhLiMjyTBt8');

async function main() {
  // Connect to localhost
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  const program = new anchor.Program(idl, programId, provider);

  console.log('🚀 Initializing Fee Pool...');
  console.log('   Program:', programId.toString());
  console.log('   USDC Mint:', USDC_MINT.toString());
  console.log('   Authority:', wallet.publicKey.toString());

  // Derive PDAs
  const [feePool] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    programId
  );

  const [usdcVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
    programId
  );

  console.log('\n   Fee Pool PDA:', feePool.toString());
  console.log('   USDC Vault PDA:', usdcVault.toString());

  try {
    // Check if already initialized
    const feePoolAccount = await connection.getAccountInfo(feePool);
    if (feePoolAccount) {
      console.log('\n✅ Fee Pool already initialized!');
      return;
    }

    // Initialize
    const tx = await program.methods
      .initializeFeePool()
      .accounts({
        feePool,
        usdcVault,
        usdcMint: USDC_MINT,
        authority: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('\n✅ Fee Pool initialized!');
    console.log('   Transaction:', tx);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
