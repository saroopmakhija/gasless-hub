use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Transfer, Token},
    token_interface::TokenAccount,
};

use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct WithdrawForConversion<'info> {
    #[account(
        mut,
        seeds = [FEE_POOL_SEED],
        bump = fee_pool.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub fee_pool: Account<'info, FeePool>,

    #[account(
        mut,
        constraint = usdc_vault.key() == fee_pool.usdc_vault @ ErrorCode::InvalidUsdcMint
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = destination_usdc.mint == fee_pool.usdc_mint @ ErrorCode::InvalidUsdcMint
    )]
    pub destination_usdc: InterfaceAccount<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawForConversion>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    let fee_pool = &mut ctx.accounts.fee_pool;
    let available = fee_pool.total_deposited - fee_pool.total_withdrawn;

    require!(amount <= available, ErrorCode::InsufficientFunds);

    // Transfer USDC from vault to destination for SOL conversion
    let seeds = &[
        FEE_POOL_SEED,
        &[fee_pool.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.usdc_vault.to_account_info(),
        to: ctx.accounts.destination_usdc.to_account_info(),
        authority: fee_pool.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::transfer(cpi_ctx, amount)?;

    // Update records
    fee_pool.total_withdrawn += amount;

    msg!("Withdrew {} USDC for SOL conversion", amount);
    msg!("Remaining in pool: {}", fee_pool.total_deposited - fee_pool.total_withdrawn);

    Ok(())
}
