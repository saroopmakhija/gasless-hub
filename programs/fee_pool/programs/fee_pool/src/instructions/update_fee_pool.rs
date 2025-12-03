use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::FeePool;

/// Authority-only maintenance instruction to fix misconfigured fee pool state
#[derive(Accounts)]
pub struct UpdateFeePool<'info> {
    #[account(
        mut,
        seeds = [FEE_POOL_SEED],
        bump = fee_pool.bump
    )]
    pub fee_pool: Account<'info, FeePool>,

    /// Admin signer (upgrade authority or any hotfix signer). This will become the new authority.
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateFeePool>, new_usdc_mint: Pubkey, new_usdc_vault: Pubkey) -> Result<()> {
    let fee_pool = &mut ctx.accounts.fee_pool;

    fee_pool.authority = ctx.accounts.admin.key();
    fee_pool.usdc_mint = new_usdc_mint;
    fee_pool.usdc_vault = new_usdc_vault;
    // Reset counters to avoid mismatched accounting from the old config
    fee_pool.total_deposited = 0;
    fee_pool.total_withdrawn = 0;
    fee_pool.total_sponsors = 0;

    msg!("Fee pool updated. Mint: {}, Vault: {}", fee_pool.usdc_mint, fee_pool.usdc_vault);
    Ok(())
}
