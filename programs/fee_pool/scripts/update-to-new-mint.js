const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const NEW_USDC_MINT = new PublicKey('3RGmLbkfpcArBosmz3no9SXSJ1bo3oFSdcQ2rQgrhy6U');
const NEW_USDC_VAULT = new PublicKey('E6sj9LLowq2uJn2TpHYKxcvM2VvwrAmruqwZyiyJa8js');

async function updateFeePool() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log('🔄 Updating Fee Pool to new USDC mint...');
  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('New USDC Mint:', NEW_USDC_MINT.toBase58());
  console.log('New USDC Vault:', NEW_USDC_VAULT.toBase58());

  // Derive fee pool PDA
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    PROGRAM_ID
  );
  console.log('Fee Pool PDA:', feePoolPda.toBase58());

  // Build update_fee_pool instruction
  // Discriminator for update_fee_pool: [35, 243, 223, 118, 117, 35, 170, 239]
  const discriminator = Buffer.from([35, 243, 223, 118, 117, 35, 170, 239]);

  // Encode arguments: new_usdc_mint (32 bytes) + new_usdc_vault (32 bytes)
  const data = Buffer.concat([
    discriminator,
    NEW_USDC_MINT.toBuffer(),
    NEW_USDC_VAULT.toBuffer(),
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: feePoolPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  // Create and send transaction
  const transaction = new Transaction().add(instruction);

  try {
    const signature = await connection.sendTransaction(transaction, [wallet], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('📤 Transaction sent:', signature);

    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Fee Pool updated successfully!');
    console.log('   View transaction: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

    // Fetch updated account to verify
    const accountInfo = await connection.getAccountInfo(feePoolPda);
    if (accountInfo) {
      const data = accountInfo.data;
      console.log('\n📊 Updated Fee Pool (raw data):');
      console.log('   Account data length:', data.length);
    }

  } catch (error) {
    console.error('❌ Error updating fee pool:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
    throw error;
  }
}

updateFeePool().catch(console.error);
