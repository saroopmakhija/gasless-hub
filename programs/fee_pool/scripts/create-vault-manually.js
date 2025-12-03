const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createInitializeAccountInstruction } = require('@solana/spl-token');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const USDC_MINT = new PublicKey('3RGmLbkfpcArBosmz3no9SXSJ1bo3oFSdcQ2rQgrhy6U');

// Token Account size
const TOKEN_ACCOUNT_SIZE = 165;

async function createVaultManually() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log('🔄 Creating USDC Vault Token Account...');
  console.log('Payer:', payer.publicKey.toBase58());
  console.log('USDC Mint:', USDC_MINT.toBase58());

  // Derive PDAs
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    PROGRAM_ID
  );
  const [usdcVaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
    PROGRAM_ID
  );

  console.log('Fee Pool PDA (will be authority):', feePoolPda.toBase58());
  console.log('USDC Vault PDA:', usdcVaultPda.toBase58());
  console.log('Vault Bump:', vaultBump);

  // Check if vault already exists
  const existingVault = await connection.getAccountInfo(usdcVaultPda);
  if (existingVault) {
    console.log('✅ USDC Vault already exists!');
    return;
  }

  // Get minimum rent
  const rent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
  console.log('Rent for token account:', rent, 'lamports');

  // Create account using program (so it can create PDA)
  // We need to use a CPI from the program, but since we can't do that directly,
  // let's use the System Program to create the account and then initialize it

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: usdcVaultPda,
    lamports: rent,
    space: TOKEN_ACCOUNT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  // Initialize the token account
  // This needs to be done by the token program
  // But we can't create a PDA directly like this - we need the program to do it

  console.log('❌ Error: Cannot create PDA token account directly from script.');
  console.log('   The vault must be created by calling a program instruction that uses init.');
  console.log('');
  console.log('SOLUTION: Remove USDC_VAULT_OVERRIDE from .env.local');
  console.log('   This will let the program derive and create the vault on first deposit.');
}

createVaultManually().catch(console.error);
