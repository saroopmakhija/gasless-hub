/**
 * Fee Pool API - Interacts with the Anchor fee pool program
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('8uvizWEfsRhY4SGjiGCa6FDw9u1g1KFacFnKRYrpAS1y');
const USDC_MINT = new PublicKey(process.env.USDC_MINT || 'HoSwcrKD8UGB34FdPrDstCQdZspFs4rmwVhLiMjyTBt8');

class FeePoolAPI {
  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Load authority wallet
    const walletPath = process.env.AUTHORITY_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    this.authority = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    // Create provider
    const wallet = new anchor.Wallet(this.authority);
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
    
    // Load program - use fetchIdl for Anchor 0.32+
    this.programId = PROGRAM_ID;
    
    // Derive PDAs
    this.feePoolPda = PublicKey.findProgramAddressSync(
      [Buffer.from('fee_pool')],
      PROGRAM_ID
    )[0];
    
    this.usdcVaultPda = PublicKey.findProgramAddressSync(
      [Buffer.from('usdc_vault'), USDC_MINT.toBuffer()],
      PROGRAM_ID
    )[0];
  }

  /**
   * Initialize the fee pool (one-time setup)
   */
  async initializeFeePool() {
    try {
      // Check if already initialized
      const feePoolAccount = await this.connection.getAccountInfo(this.feePoolPda);
      if (feePoolAccount) {
        return {
          success: false,
          message: 'Fee pool already initialized',
          feePool: this.feePoolPda.toBase58(),
        };
      }

      const tx = await this.program.methods
        .initializeFeePool()
        .accounts({
          feePool: this.feePoolPda,
          usdcVault: this.usdcVaultPda,
          usdcMint: USDC_MINT,
          authority: this.authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      return {
        success: true,
        message: 'Fee pool initialized',
        transaction: tx,
        feePool: this.feePoolPda.toBase58(),
        usdcVault: this.usdcVaultPda.toBase58(),
      };
    } catch (error) {
      console.error('Error initializing fee pool:', error);
      throw error;
    }
  }

  /**
   * Get fee pool stats
   */
  async getFeePoolStats() {
    try {
      const feePoolData = await this.program.account.feePool.fetch(this.feePoolPda);
      
      return {
        authority: feePoolData.authority.toBase58(),
        usdcMint: feePoolData.usdcMint.toBase58(),
        usdcVault: feePoolData.usdcVault.toBase58(),
        totalDeposited: feePoolData.totalDeposited.toNumber(),
        totalWithdrawn: feePoolData.totalWithdrawn.toNumber(),
        totalSponsors: feePoolData.totalSponsors.toNumber(),
        availableBalance: feePoolData.totalDeposited.toNumber() - feePoolData.totalWithdrawn.toNumber(),
      };
    } catch (error) {
      console.error('Error fetching fee pool stats:', error);
      throw error;
    }
  }

  /**
   * Get all sponsors and their contributions
   */
  async getAllSponsors() {
    try {
      const sponsors = await this.program.account.sponsorRecord.all();
      
      return sponsors.map(sponsor => ({
        address: sponsor.account.sponsor.toBase58(),
        totalContributed: sponsor.account.totalContributed.toNumber(),
        transactionsSponsored: sponsor.account.transactionsSponsored.toNumber(),
        lastDepositTime: sponsor.account.lastDepositTime.toNumber(),
        publicKey: sponsor.publicKey.toBase58(),
      })).sort((a, b) => b.totalContributed - a.totalContributed); // Sort by contribution
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      throw error;
    }
  }

  /**
   * Get specific sponsor record
   */
  async getSponsorRecord(sponsorPubkey) {
    try {
      const sponsorRecordPda = PublicKey.findProgramAddressSync(
        [Buffer.from('sponsor_record'), new PublicKey(sponsorPubkey).toBuffer()],
        PROGRAM_ID
      )[0];

      const sponsorData = await this.program.account.sponsorRecord.fetch(sponsorRecordPda);
      
      return {
        address: sponsorData.sponsor.toBase58(),
        totalContributed: sponsorData.totalContributed.toNumber(),
        transactionsSponsored: sponsorData.transactionsSponsored.toNumber(),
        lastDepositTime: sponsorData.lastDepositTime.toNumber(),
      };
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deposit USDC as a sponsor
   * Note: This is typically called by sponsors from the frontend
   */
  async sponsorDeposit(sponsorKeypair, amount) {
    try {
      const sponsorRecordPda = PublicKey.findProgramAddressSync(
        [Buffer.from('sponsor_record'), sponsorKeypair.publicKey.toBuffer()],
        PROGRAM_ID
      )[0];

      const sponsorUsdcAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        sponsorKeypair.publicKey
      );

      const tx = await this.program.methods
        .sponsorDeposit(new anchor.BN(amount))
        .accounts({
          feePool: this.feePoolPda,
          sponsorRecord: sponsorRecordPda,
          usdcVault: this.usdcVaultPda,
          sponsorUsdc: sponsorUsdcAccount,
          sponsor: sponsorKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([sponsorKeypair])
        .rpc();

      return {
        success: true,
        transaction: tx,
        amount,
        sponsor: sponsorKeypair.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('Error depositing as sponsor:', error);
      throw error;
    }
  }

  /**
   * Withdraw USDC for conversion to SOL (authority only)
   */
  async withdrawForConversion(amount) {
    try {
      const authorityUsdcAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        this.authority.publicKey
      );

      const tx = await this.program.methods
        .withdrawForConversion(new anchor.BN(amount))
        .accounts({
          feePool: this.feePoolPda,
          usdcVault: this.usdcVaultPda,
          destinationUsdc: authorityUsdcAccount,
          authority: this.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return {
        success: true,
        transaction: tx,
        amount,
        destination: authorityUsdcAccount.toBase58(),
      };
    } catch (error) {
      console.error('Error withdrawing for conversion:', error);
      throw error;
    }
  }

  /**
   * Get USDC vault balance
   */
  async getVaultBalance() {
    try {
      const vaultInfo = await this.connection.getTokenAccountBalance(this.usdcVaultPda);
      return {
        amount: vaultInfo.value.amount,
        decimals: vaultInfo.value.decimals,
        uiAmount: vaultInfo.value.uiAmount,
      };
    } catch (error) {
      console.error('Error fetching vault balance:', error);
      throw error;
    }
  }
}

module.exports = { FeePoolAPI };

