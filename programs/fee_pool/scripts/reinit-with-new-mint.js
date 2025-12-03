const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const USDC_MINT = new PublicKey('3RGmLbkfpcArBosmz3no9SXSJ1bo3oFSdcQ2rQgrhy6U');

async function reinitializeFeePool() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log('🔄 Reinitializing Fee Pool with new USDC mint...');
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('USDC Mint:', USDC_MINT.toBase58());

  // Derive PDAs
  const [feePoolPda, feePoolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    PROGRAM_ID
  );
  const [usdcVaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
    PROGRAM_ID
  );

  console.log('Fee Pool PDA:', feePoolPda.toBase58());
  console.log('USDC Vault PDA:', usdcVaultPda.toBase58());

  // Check if fee pool already exists
  const feePoolAccount = await connection.getAccountInfo(feePoolPda);
  if (feePoolAccount) {
    console.log('⚠️  Fee Pool already exists, using update instruction instead...');

    // Use update_fee_pool instruction
    const discriminator = Buffer.from([35, 243, 223, 118, 117, 35, 170, 239]);
    const data = Buffer.concat([
      discriminator,
      USDC_MINT.toBuffer(),
      usdcVaultPda.toBuffer(),
    ]);

    const updateInstruction = new TransactionInstruction({
      keys: [
        { pubkey: feePoolPda, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data,
    });

    const updateTx = new Transaction().add(updateInstruction);
    const updateSig = await connection.sendTransaction(updateTx, [authority]);
    await connection.confirmTransaction(updateSig, 'confirmed');
    console.log('✅ Fee Pool updated:', updateSig);
  }

  // Check if vault exists
  const vaultAccount = await connection.getAccountInfo(usdcVaultPda);
  if (vaultAccount) {
    console.log('✅ USDC Vault already exists!');
    return;
  }

  // Build initialize_fee_pool instruction to create the vault
  // Discriminator: [59, 214, 181, 20, 217, 48, 146, 165]
  const discriminator = Buffer.from([59, 214, 181, 20, 217, 48, 146, 165]);

  const RENT_SYSVAR = new PublicKey('SysvarRent111111111111111111111111111111111');

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: feePoolPda, isSigner: false, isWritable: true },
      { pubkey: usdcVaultPda, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });

  try {
    const transaction = new Transaction().add(instruction);
    const signature = await connection.sendTransaction(transaction, [authority], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('📤 Transaction sent:', signature);
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Fee Pool reinitialized successfully!');
    console.log('   View transaction: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

    // Verify vault was created
    const newVaultAccount = await connection.getAccountInfo(usdcVaultPda);
    if (newVaultAccount) {
      console.log('✅ USDC Vault created successfully!');
    } else {
      console.log('⚠️  Warning: Vault account not found after initialization');
    }

  } catch (error) {
    console.error('❌ Error reinitializing fee pool:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
    throw error;
  }
}

reinitializeFeePool().catch(console.error);
