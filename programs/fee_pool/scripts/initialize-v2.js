#!/usr/bin/env node
const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const RPC_URL = 'http://127.0.0.1:8899';

async function main() {
  console.log('🚀 Initializing Fee Pool V2\n');
  console.log('==================================================\n');

  // Load wallet
  const wallet = anchor.Wallet.local();
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  console.log('1️⃣  Loading program...');
  console.log('   Program ID:', PROGRAM_ID.toBase58());
  console.log('   Wallet:', wallet.publicKey.toBase58());

  // Load IDL
  const idlPath = '../target/idl/fee_pool.json';
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    PROGRAM_ID
  );

  console.log('\n2️⃣  Checking if fee pool exists...');
  try {
    const feePoolAccount = await connection.getAccountInfo(feePoolPda);
    if (feePoolAccount) {
      console.log('   ⚠️  Fee pool already initialized!');
      console.log('   Fee Pool PDA:', feePoolPda.toBase58());
      const feePoolData = await program.account.feePool.fetch(feePoolPda);
      console.log('   Authority:', feePoolData.authority.toBase58());
      console.log('   USDC Mint:', feePoolData.usdcMint.toBase58());
      console.log('   USDC Vault:', feePoolData.usdcVault.toBase58());
      console.log('   Total Deposited:', feePoolData.totalDeposited.toString());
      return;
    }
  } catch (e) {
    console.log('   Fee pool not initialized yet');
  }

  console.log('\n3️⃣  Creating test USDC mint...');
  const usdcMint = Keypair.generate();
  console.log('   USDC Mint:', usdcMint.publicKey.toBase58());

  // Create USDC mint (6 decimals like real USDC)
  const createMintIx = await anchor.web3.SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: usdcMint.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(82),
    space: 82,
    programId: anchor.utils.token.TOKEN_PROGRAM_ID,
  });

  const initMintIx = anchor.utils.token.createInitializeMintInstruction(
    usdcMint.publicKey,
    6, // decimals
    wallet.publicKey, // mint authority
    null // freeze authority
  );

  const tx1 = new anchor.web3.Transaction().add(createMintIx, initMintIx);
  await provider.sendAndConfirm(tx1, [usdcMint]);
  console.log('   ✅ USDC mint created');

  // Derive USDC vault PDA
  const [usdcVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), usdcMint.publicKey.toBuffer()],
    PROGRAM_ID
  );

  console.log('\n4️⃣  Initializing fee pool...');
  console.log('   Fee Pool PDA:', feePoolPda.toBase58());
  console.log('   USDC Vault PDA:', usdcVaultPda.toBase58());

  try {
    const tx = await program.methods
      .initializeFeePool()
      .accounts({
        feePool: feePoolPda,
        authority: wallet.publicKey,
        usdcMint: usdcMint.publicKey,
        usdcVault: usdcVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log('   ✅ Fee pool initialized!');
    console.log('   Transaction:', tx);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    throw error;
  }

  console.log('\n5️⃣  Verifying initialization...');
  const feePoolData = await program.account.feePool.fetch(feePoolPda);
  console.log('   Authority:', feePoolData.authority.toBase58());
  console.log('   USDC Mint:', feePoolData.usdcMint.toBase58());
  console.log('   USDC Vault:', feePoolData.usdcVault.toBase58());
  console.log('   Total Deposited:', feePoolData.totalDeposited.toString());
  console.log('   Total Withdrawn:', feePoolData.totalWithdrawn.toString());
  console.log('   Total Sponsors:', feePoolData.totalSponsors.toString());

  // Save addresses to env file
  console.log('\n6️⃣  Saving addresses...');
  const envContent = `
# Fee Pool V2 Configuration
FEE_POOL_PROGRAM_ID=${PROGRAM_ID.toBase58()}
FEE_POOL_PDA=${feePoolPda.toBase58()}
USDC_MINT=${usdcMint.publicKey.toBase58()}
USDC_VAULT_PDA=${usdcVaultPda.toBase58()}
AUTHORITY=${wallet.publicKey.toBase58()}
`;

  fs.writeFileSync('../../backend/.env.feepool', envContent.trim());
  console.log('   ✅ Saved to backend/.env.feepool');

  console.log('\n==================================================');
  console.log('✅ Fee Pool V2 initialized successfully!\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});

