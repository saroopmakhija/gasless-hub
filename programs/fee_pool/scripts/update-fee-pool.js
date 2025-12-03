const anchor = require('@coral-xyz/anchor');
const { PublicKey } = anchor.web3;
const fs = require('fs');

// Program + PDAs
const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const FEE_POOL_SEED = Buffer.from('fee_pool');

// Desired config (devnet USDC + correct vault PDA)
const NEW_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const NEW_USDC_VAULT = new PublicKey('9d9gv93g8XUCzhX6PP6enwEw2hpc2mPmNz59US5mcF7J');

async function main() {
  const connection = new anchor.web3.Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  // Load authority wallet (same one that initialized the pool)
  const walletPath =
    process.env.ANCHOR_WALLET || process.env.WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const authority = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(walletData));
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Load IDL from local target
  const idl = require('../target/idl/fee_pool.json');
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  const [feePoolPda] = PublicKey.findProgramAddressSync([FEE_POOL_SEED], PROGRAM_ID);

  console.log('Updating fee pool config...');
  console.log('Fee pool PDA:', feePoolPda.toBase58());
  console.log('New mint:', NEW_USDC_MINT.toBase58());
  console.log('New vault:', NEW_USDC_VAULT.toBase58());

  const sig = await program.methods
    .updateFeePool(NEW_USDC_MINT, NEW_USDC_VAULT)
    .accounts({
      feePool: feePoolPda,
      authority: authority.publicKey,
    })
    .rpc();

  console.log('✅ Updated fee pool config. Tx:', sig);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
