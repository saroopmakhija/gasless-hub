use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount},
    token::Token,
};

use crate::state::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializeFeePool<'info> {
    #[account(
        init,
        payer = authority,
        space = FeePool::LEN,
        seeds = [FEE_POOL_SEED],
        bump
    )]
    pub fee_pool: Account<'info, FeePool>,

    #[account(
        init,
        payer = authority,
        seeds = [USDC_VAULT_SEED, usdc_mint.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = fee_pool
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeFeePool>) -> Result<()> {
    let fee_pool = &mut ctx.accounts.fee_pool;

    fee_pool.authority = ctx.accounts.authority.key();
    fee_pool.usdc_mint = ctx.accounts.usdc_mint.key();
    fee_pool.usdc_vault = ctx.accounts.usdc_vault.key();
    fee_pool.total_deposited = 0;
    fee_pool.total_withdrawn = 0;
    fee_pool.total_sponsors = 0;
    fee_pool.bump = ctx.bumps.fee_pool;

    msg!("Fee pool initialized with authority: {}", fee_pool.authority);
    msg!("USDC vault: {}", fee_pool.usdc_vault);

    Ok(())
}
