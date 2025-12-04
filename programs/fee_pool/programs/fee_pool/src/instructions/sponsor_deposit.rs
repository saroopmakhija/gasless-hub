use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Transfer, Token},
    token_interface::TokenAccount,
};

use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct SponsorDeposit<'info> {
    #[account(
        mut,
        seeds = [FEE_POOL_SEED],
        bump = fee_pool.bump
    )]
    pub fee_pool: Account<'info, FeePool>,

    #[account(
        init_if_needed,
        payer = payer,
        space = SponsorRecord::LEN,
        seeds = [SPONSOR_RECORD_SEED, sponsor.key().as_ref()],
        bump
    )]
    pub sponsor_record: Account<'info, SponsorRecord>,

    #[account(
        mut,
        constraint = usdc_vault.key() == fee_pool.usdc_vault @ ErrorCode::InvalidUsdcMint
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = payer_usdc.mint == fee_pool.usdc_mint @ ErrorCode::InvalidUsdcMint
    )]
    pub payer_usdc: InterfaceAccount<'info, TokenAccount>,

    /// The transaction fee payer (Kora) funds rent for the sponsor_record init
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<SponsorDeposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    let fee_pool = &mut ctx.accounts.fee_pool;
    let sponsor_record = &mut ctx.accounts.sponsor_record;

    // Initialize sponsor record if first deposit
    if sponsor_record.total_contributed == 0 {
        sponsor_record.sponsor = ctx.accounts.sponsor.key();
        sponsor_record.total_contributed = 0;
        sponsor_record.transactions_sponsored = 0;
        sponsor_record.bump = ctx.bumps.sponsor_record;
        fee_pool.total_sponsors += 1;
    }

    // Transfer USDC from sponsor to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_usdc.to_account_info(),
        to: ctx.accounts.usdc_vault.to_account_info(),
        authority: ctx.accounts.sponsor.to_account_info(), // Sponsor owns the USDC being transferred
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::transfer(cpi_ctx, amount)?;

    // Update records
    sponsor_record.total_contributed += amount;
    sponsor_record.last_deposit_time = Clock::get()?.unix_timestamp;
    fee_pool.total_deposited += amount;

    msg!("Sponsor {} deposited {} USDC", ctx.accounts.sponsor.key(), amount);
    msg!("Total contributed by sponsor: {}", sponsor_record.total_contributed);
    msg!("Total in pool: {}", fee_pool.total_deposited);

    Ok(())
}
