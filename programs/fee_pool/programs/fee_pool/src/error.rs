use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds for withdrawal")]
    InsufficientFunds,

    #[msg("Invalid USDC mint provided")]
    InvalidUsdcMint,

    #[msg("Unauthorized: only authority can perform this action")]
    Unauthorized,

    #[msg("Unauthorized: only the sponsor can modify this metadata")]
    UnauthorizedMetadataOwner,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Invalid metadata: name, website, or logo URL too long")]
    InvalidMetadata,
}
