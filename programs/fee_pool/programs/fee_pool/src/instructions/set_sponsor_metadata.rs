use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeSponsorMetadata<'info> {
    #[account(
        init,
        payer = payer,
        space = SponsorMetadata::LEN,
        seeds = [SPONSOR_METADATA_SEED, sponsor.key().as_ref()],
        bump
    )]
    pub sponsor_metadata: Account<'info, SponsorMetadata>,

    /// The transaction fee payer (typically Kora for gasless transactions)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The sponsor who owns this metadata
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetSponsorMetadata<'info> {
    #[account(
        seeds = [SPONSOR_METADATA_SEED, sponsor.key().as_ref()],
        bump,
        mut,
        constraint = sponsor_metadata.sponsor == sponsor.key() @ ErrorCode::UnauthorizedMetadataOwner
    )]
    pub sponsor_metadata: Account<'info, SponsorMetadata>,

    /// The sponsor who owns this metadata
    pub sponsor: Signer<'info>,
}

fn validate_metadata(name: &String, website: &String, logo_url: &String) -> Result<()> {
    require!(
        name.len() <= SponsorMetadata::MAX_NAME_LEN,
        ErrorCode::InvalidMetadata
    );
    require!(
        website.len() <= SponsorMetadata::MAX_WEBSITE_LEN,
        ErrorCode::InvalidMetadata
    );
    require!(
        logo_url.len() <= SponsorMetadata::MAX_LOGO_LEN,
        ErrorCode::InvalidMetadata
    );

    Ok(())
}

pub fn initialize_handler(
    ctx: Context<InitializeSponsorMetadata>,
    name: String,
    website: String,
    logo_url: String,
) -> Result<()> {
    validate_metadata(&name, &website, &logo_url)?;

    let sponsor_metadata = &mut ctx.accounts.sponsor_metadata;

    sponsor_metadata.sponsor = ctx.accounts.sponsor.key();
    sponsor_metadata.name = name.clone();
    sponsor_metadata.website = website.clone();
    sponsor_metadata.logo_url = logo_url.clone();
    sponsor_metadata.bump = ctx.bumps.sponsor_metadata;

    msg!("Sponsor metadata initialized for {}", ctx.accounts.sponsor.key());
    msg!("  Name: {}", name);
    msg!("  Website: {}", website);

    Ok(())
}

pub fn handler(
    ctx: Context<SetSponsorMetadata>,
    name: String,
    website: String,
    logo_url: String,
) -> Result<()> {
    validate_metadata(&name, &website, &logo_url)?;

    let sponsor_metadata = &mut ctx.accounts.sponsor_metadata;

    sponsor_metadata.sponsor = ctx.accounts.sponsor.key();
    sponsor_metadata.name = name.clone();
    sponsor_metadata.website = website.clone();
    sponsor_metadata.logo_url = logo_url.clone();
    sponsor_metadata.bump = ctx.bumps.sponsor_metadata;

    msg!("Sponsor metadata set for {}", ctx.accounts.sponsor.key());
    msg!("  Name: {}", name);
    msg!("  Website: {}", website);

    Ok(())
}
