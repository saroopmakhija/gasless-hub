const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet USDC

async function initDevnet() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const keypairData = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log('🚀 Initializing Fee Pool on Devnet...');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Authority:', authority.publicKey.toBase58());

  // Derive PDAs
  const [feePoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_pool')],
    PROGRAM_ID
  );

  const [usdcVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
    PROGRAM_ID
  );

  console.log('Fee Pool PDA:', feePoolPda.toBase58());
  console.log('USDC Vault PDA:', usdcVaultPda.toBase58());

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(feePoolPda);
  if (accountInfo) {
    console.log('✅ Fee Pool already initialized on devnet!');
    return;
  }

  // Build initialize instruction
  // Discriminator for initialize_fee_pool: [59, 214, 181, 20, 217, 48, 146, 165]
  const discriminator = Buffer.from([59, 214, 181, 20, 217, 48, 146, 165]);

  const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');
  const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const RENT_SYSVAR = new PublicKey('SysvarRent111111111111111111111111111111111');

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: feePoolPda, isSigner: false, isWritable: true },
      { pubkey: usdcVaultPda, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;

  // Sign and send
  transaction.sign(authority);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Fee Pool initialized on devnet!');
  console.log('Transaction:', signature);
}

initDevnet().catch(console.error);

