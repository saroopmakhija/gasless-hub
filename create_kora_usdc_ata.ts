import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const KORA_WALLET = new PublicKey('CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU');

async function createKoraUSDCAccount() {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  
  // Derive Kora's USDC ATA address
  const koraUsdcATA = await getAssociatedTokenAddress(USDC_MINT, KORA_WALLET);
  
  console.log('Kora USDC ATA address:', koraUsdcATA.toString());
  
  // Check if it exists
  const accountInfo = await connection.getAccountInfo(koraUsdcATA);
  
  if (accountInfo) {
    console.log('✅ Kora USDC account already exists!');
    console.log('Balance:', accountInfo.lamports);
  } else {
    console.log('❌ Kora USDC account does not exist');
    console.log('\nTo create it, someone needs to send USDC to this address first,');
    console.log('or run this with a funded wallet to create the ATA.');
  }
}

createKoraUSDCAccount().catch(console.error);
