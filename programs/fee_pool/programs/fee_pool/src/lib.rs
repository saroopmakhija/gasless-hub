pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Gf6cs1GPqrkNqvWiP3mxwP9ppd7Pd3q2YiffzZGeui2K");

#[program]
pub mod fee_pool {
    use super::*;

    pub fn initialize_fee_pool(ctx: Context<InitializeFeePool>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn sponsor_deposit(ctx: Context<SponsorDeposit>, amount: u64) -> Result<()> {
        sponsor_deposit::handler(ctx, amount)
    }

    pub fn withdraw_for_conversion(ctx: Context<WithdrawForConversion>, amount: u64) -> Result<()> {
        withdraw_for_conversion::handler(ctx, amount)
    }

    pub fn initialize_sponsor_metadata(
        ctx: Context<InitializeSponsorMetadata>,
        name: String,
        website: String,
        logo_url: String,
    ) -> Result<()> {
        set_sponsor_metadata::initialize_handler(ctx, name, website, logo_url)
    }

    pub fn set_sponsor_metadata(
        ctx: Context<SetSponsorMetadata>,
        name: String,
        website: String,
        logo_url: String,
    ) -> Result<()> {
        set_sponsor_metadata::handler(ctx, name, website, logo_url)
    }

    /// Admin-only maintenance to correct mint/vault configuration
    pub fn update_fee_pool(
        ctx: Context<UpdateFeePool>,
        new_usdc_mint: Pubkey,
        new_usdc_vault: Pubkey,
    ) -> Result<()> {
        update_fee_pool::handler(ctx, new_usdc_mint, new_usdc_vault)
    }
}
