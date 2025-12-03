use anchor_lang::prelude::*;

#[account]
pub struct FeePool {
    pub authority: Pubkey,          // Admin authority
    pub usdc_mint: Pubkey,           // USDC mint address
    pub usdc_vault: Pubkey,          // PDA holding USDC
    pub total_deposited: u64,        // Total USDC deposited by all sponsors
    pub total_withdrawn: u64,        // Total USDC withdrawn for SOL conversion
    pub total_sponsors: u64,         // Number of unique sponsors
    pub bump: u8,                    // PDA bump
}

impl FeePool {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // usdc_mint
        32 + // usdc_vault
        8 +  // total_deposited
        8 +  // total_withdrawn
        8 +  // total_sponsors
        1;   // bump
}

#[account]
pub struct SponsorRecord {
    pub sponsor: Pubkey,             // Sponsor's wallet address
    pub total_contributed: u64,      // Total USDC contributed
    pub transactions_sponsored: u64, // Number of transactions sponsored (tracked off-chain)
    pub last_deposit_time: i64,      // Unix timestamp of last deposit
    pub bump: u8,                    // PDA bump
}

impl SponsorRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // sponsor
        8 +  // total_contributed
        8 +  // transactions_sponsored
        8 +  // last_deposit_time
        1;   // bump
}

#[account]
pub struct SponsorMetadata {
    pub sponsor: Pubkey,             // Sponsor's wallet address
    pub name: String,                // Display name (max 32 chars)
    pub website: String,             // Website URL (max 64 chars)
    pub logo_url: String,            // Logo URL (max 128 chars)
    pub bump: u8,                    // PDA bump
}

impl SponsorMetadata {
    pub const MAX_NAME_LEN: usize = 32;
    pub const MAX_WEBSITE_LEN: usize = 64;
    pub const MAX_LOGO_LEN: usize = 128;
    
    pub const LEN: usize = 8 + // discriminator
        32 + // sponsor pubkey
        4 + Self::MAX_NAME_LEN + // String (4 bytes length + data)
        4 + Self::MAX_WEBSITE_LEN + // String
        4 + Self::MAX_LOGO_LEN + // String
        1;   // bump
}
