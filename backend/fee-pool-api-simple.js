/**
 * Fee Pool API - Simple version using direct account queries
 * Avoids Anchor IDL compatibility issues
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { struct, u64, u8, publicKey: publicKeyLayout } = require('@solana/buffer-layout');
const { publicKey, u64 : u64Layout } = require('@solana/buffer-layout-utils');

// Load fee pool V2 config
require('dotenv').config({ path: '.env.feepool' });

const PROGRAM_ID = new PublicKey(process.env.FEE_POOL_PROGRAM_ID || 'Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K');
const USDC_MINT = new PublicKey(process.env.USDC_MINT || 'AZXgZ5JeCRaPSA3j3NDkHnkJWL49DhW3DGWXoafK13Nn');

class FeePoolAPISimple {
  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
    this.connection = new Connection(rpcUrl, 'confirmed');
    
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
   * Decode FeePool account data
   */
  decodeFeePool(data) {
    // Skip 8-byte discriminator
    const offset = 8;
    
    return {
      authority: new PublicKey(data.slice(offset, offset + 32)),
      usdcMint: new PublicKey(data.slice(offset + 32, offset + 64)),
      usdcVault: new PublicKey(data.slice(offset + 64, offset + 96)),
      totalDeposited: data.readBigUInt64LE(offset + 96),
      totalWithdrawn: data.readBigUInt64LE(offset + 104),
      totalSponsors: data.readBigUInt64LE(offset + 112),
      bump: data.readUInt8(offset + 120),
    };
  }

  /**
   * Decode SponsorRecord account data
   */
  decodeSponsorRecord(data) {
    // Skip 8-byte discriminator
    const offset = 8;
    
    return {
      sponsor: new PublicKey(data.slice(offset, offset + 32)),
      totalContributed: data.readBigUInt64LE(offset + 32),
      transactionsSponsored: data.readBigUInt64LE(offset + 40),
      lastDepositTime: data.readBigInt64LE(offset + 48),
      bump: data.readUInt8(offset + 56),
    };
  }

  /**
   * Decode SponsorMetadata account data
   */
  decodeSponsorMetadata(data) {
    // Skip 8-byte discriminator
    let offset = 8;
    
    // Read sponsor pubkey (32 bytes)
    const sponsor = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read name (String: 4 bytes length + data)
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8');
    offset += nameLen;
    
    // Read website (String: 4 bytes length + data)
    const websiteLen = data.readUInt32LE(offset);
    offset += 4;
    const website = data.slice(offset, offset + websiteLen).toString('utf8');
    offset += websiteLen;
    
    // Read logo URL (String: 4 bytes length + data)
    const logoLen = data.readUInt32LE(offset);
    offset += 4;
    const logoUrl = data.slice(offset, offset + logoLen).toString('utf8');
    offset += logoLen;
    
    // Read bump
    const bump = data.readUInt8(offset);
    
    return {
      sponsor,
      name,
      website,
      logoUrl,
      bump,
    };
  }

  /**
   * Get fee pool stats
   */
  async getFeePoolStats() {
    try {
      const accountInfo = await this.connection.getAccountInfo(this.feePoolPda);
      
      if (!accountInfo) {
        return {
          initialized: false,
          message: 'Fee pool not initialized',
        };
      }

      const feePoolData = this.decodeFeePool(accountInfo.data);
      
      return {
        initialized: true,
        authority: feePoolData.authority.toBase58(),
        usdcMint: feePoolData.usdcMint.toBase58(),
        usdcVault: feePoolData.usdcVault.toBase58(),
        totalDeposited: Number(feePoolData.totalDeposited),
        totalWithdrawn: Number(feePoolData.totalWithdrawn),
        totalSponsors: Number(feePoolData.totalSponsors),
        availableBalance: Number(feePoolData.totalDeposited - feePoolData.totalWithdrawn),
      };
    } catch (error) {
      console.error('Error fetching fee pool stats:', error);
      throw error;
    }
  }

  /**
   * Get all sponsors
   */
  async getAllSponsors() {
    try {
      // Get all accounts owned by the fee pool program
      const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            // Filter for SponsorRecord accounts (discriminator + size)
            dataSize: 8 + 32 + 8 + 8 + 8 + 1, // discriminator + sponsor + totalContributed + transactionsSponsored + lastDepositTime + bump
          },
        ],
      });

      const sponsors = accounts.map(account => {
        const data = this.decodeSponsorRecord(account.account.data);
        return {
          address: data.sponsor.toBase58(),
          totalContributed: Number(data.totalContributed),
          transactionsSponsored: Number(data.transactionsSponsored),
          lastDepositTime: Number(data.lastDepositTime),
          publicKey: account.pubkey.toBase58(),
        };
      });

      // Sort by contribution (highest first)
      return sponsors.sort((a, b) => b.totalContributed - a.totalContributed);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      return [];
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

      const accountInfo = await this.connection.getAccountInfo(sponsorRecordPda);
      
      if (!accountInfo) {
        return null;
      }

      const data = this.decodeSponsorRecord(accountInfo.data);
      
      return {
        address: data.sponsor.toBase58(),
        totalContributed: Number(data.totalContributed),
        transactionsSponsored: Number(data.transactionsSponsored),
        lastDepositTime: Number(data.lastDepositTime),
      };
    } catch (error) {
      if (error.message && error.message.includes('Account does not exist')) {
        return null;
      }
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
      return {
        amount: '0',
        decimals: 6,
        uiAmount: 0,
      };
    }
  }

  /**
   * Get sponsor metadata
   */
  async getSponsorMetadata(sponsorPubkey) {
    try {
      const sponsorMetadataPda = PublicKey.findProgramAddressSync(
        [Buffer.from('sponsor_metadata'), new PublicKey(sponsorPubkey).toBuffer()],
        PROGRAM_ID
      )[0];

      const accountInfo = await this.connection.getAccountInfo(sponsorMetadataPda);
      
      if (!accountInfo) {
        return null;
      }

      const data = this.decodeSponsorMetadata(accountInfo.data);
      
      return {
        sponsor: data.sponsor.toBase58(),
        name: data.name,
        website: data.website,
        logoUrl: data.logoUrl,
        publicKey: sponsorMetadataPda.toBase58(),
      };
    } catch (error) {
      console.error('Error fetching sponsor metadata:', error);
      return null;
    }
  }

  /**
   * Get all sponsors with their metadata
   */
  async getAllSponsorsWithMetadata() {
    try {
      // Get all sponsor records
      const sponsors = await this.getAllSponsors();
      
      // Fetch metadata for each sponsor
      const sponsorsWithMetadata = await Promise.all(
        sponsors.map(async (sponsor) => {
          const metadata = await this.getSponsorMetadata(sponsor.address);
          return {
            ...sponsor,
            metadata: metadata || {
              name: `Sponsor ${sponsor.address.slice(0, 6)}...`,
              website: '',
              logoUrl: '',
            },
          };
        })
      );

      return sponsorsWithMetadata;
    } catch (error) {
      console.error('Error fetching sponsors with metadata:', error);
      return [];
    }
  }
}

module.exports = { FeePoolAPISimple };

