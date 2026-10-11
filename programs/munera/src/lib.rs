//! Munera - "Enter the arena. Earn your reward."
//!
//! Escrow program for content bounties. A sponsor locks `reward_per_winner * max_winners`
//! of an SPL token (USDC, 6 decimals) in a vault; creators submit links; the sponsor
//! approves (paying the creator from the vault in the same tx) or rejects; after the
//! deadline the sponsor can reclaim whatever is left.
//!
//! ## PDA seeds
//! * Bounty     : `[b"bounty", sponsor, bounty_id.to_le_bytes()]`
//! * Vault      : `[b"vault", bounty]`   (SPL token account, authority = Bounty PDA)
//! * Submission : `[b"submission", bounty, creator]`  (one per creator per bounty)
//!
//! ## Design notes
//! * Approvals are allowed while the bounty is `Open` (even after the deadline) until the
//!   sponsor reclaims; `reclaim_unspent` closes the bounty, after which nothing can be paid.
//! * Total escrow is `reward_per_winner * max_winners` (checked), so every approval is
//!   always fully funded.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W");

pub const BOUNTY_SEED: &[u8] = b"bounty";
pub const VAULT_SEED: &[u8] = b"vault";
pub const SUBMISSION_SEED: &[u8] = b"submission";

pub const MAX_TITLE_LEN: usize = 64;
pub const MAX_DESCRIPTION_LEN: usize = 280;
pub const MAX_LINK_LEN: usize = 200;

#[program]
pub mod munera {
    use super::*;

    /// Creates the Bounty PDA + vault and escrows `reward_per_winner * max_winners`
    /// from the sponsor's token account into the vault.
    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        bounty_id: u64,
        title: String,
        description: String,
        reward_per_winner: u64,
        max_winners: u16,
        deadline: i64,
    ) -> Result<()> {
        require!(reward_per_winner > 0, MuneraError::InvalidReward);
        require!(max_winners > 0, MuneraError::InvalidMaxWinners);
        require!(!title.is_empty() && title.len() <= MAX_TITLE_LEN, MuneraError::TitleTooLong);
        require!(description.len() <= MAX_DESCRIPTION_LEN, MuneraError::DescriptionTooLong);
        let now = Clock::get()?.unix_timestamp;
        require!(deadline > now, MuneraError::DeadlineInPast);

        let total = reward_per_winner
            .checked_mul(max_winners as u64)
            .ok_or(MuneraError::MathOverflow)?;

        let bounty = &mut ctx.accounts.bounty;
        bounty.sponsor = ctx.accounts.sponsor.key();
        bounty.mint = ctx.accounts.mint.key();
        bounty.reward_per_winner = reward_per_winner;
        bounty.max_winners = max_winners;
        bounty.paid_count = 0;
        bounty.submission_count = 0;
        bounty.deadline = deadline;
        bounty.status = BountyStatus::Open;
        bounty.title = title;
        bounty.description = description;
        bounty.bump = ctx.bumps.bounty;
        bounty.vault_bump = ctx.bumps.vault;
        bounty.bounty_id = bounty_id;

        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sponsor_ata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.sponsor.to_account_info(),
                },
            ),
            total,
            ctx.accounts.mint.decimals,
        )?;

        emit!(BountyCreated {
            bounty: bounty.key(),
            sponsor: bounty.sponsor,
            mint: bounty.mint,
            bounty_id,
            reward_per_winner,
            max_winners,
            deadline,
            total_escrowed: total,
        });
        Ok(())
    }

    /// A creator submits a link. Only while the bounty is Open and before the deadline.
    pub fn submit_clip(ctx: Context<SubmitClip>, link: String) -> Result<()> {
        require!(!link.is_empty() && link.len() <= MAX_LINK_LEN, MuneraError::LinkTooLong);
        let now = Clock::get()?.unix_timestamp;
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, MuneraError::BountyClosed);
        require!(now < bounty.deadline, MuneraError::DeadlinePassed);

        bounty.submission_count = bounty
            .submission_count
            .checked_add(1)
            .ok_or(MuneraError::MathOverflow)?;

        let submission = &mut ctx.accounts.submission;
        submission.bounty = bounty.key();
        submission.creator = ctx.accounts.creator.key();
        submission.link = link;
        submission.status = SubmissionStatus::Pending;
        submission.paid_amount = 0;
        submission.paid_at = 0;
        submission.bump = ctx.bumps.submission;

        emit!(SubmissionCreated {
            bounty: bounty.key(),
            creator: submission.creator,
            submission: submission.key(),
        });
        Ok(())
    }

    /// Sponsor approves a Pending submission; the reward is paid from the vault to the
    /// creator's ATA (created on demand, sponsor pays rent) in the same transaction.
    pub fn approve_submission(ctx: Context<ApproveSubmission>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let submission = &mut ctx.accounts.submission;

        require!(bounty.status == BountyStatus::Open, MuneraError::BountyClosed);
        require!(submission.status == SubmissionStatus::Pending, MuneraError::SubmissionNotPending);
        require!(bounty.paid_count < bounty.max_winners, MuneraError::MaxWinnersReached);

        let amount = bounty.reward_per_winner;
        let sponsor_key = bounty.sponsor;
        let id_bytes = bounty.bounty_id.to_le_bytes();
        let bump = [bounty.bump];
        let signer_seeds: &[&[&[u8]]] = &[&[BOUNTY_SEED, sponsor_key.as_ref(), &id_bytes, &bump]];

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_ata.to_account_info(),
                    authority: bounty.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        let now = Clock::get()?.unix_timestamp;
        submission.status = SubmissionStatus::Approved;
        submission.paid_amount = amount;
        submission.paid_at = now;
        bounty.paid_count = bounty
            .paid_count
            .checked_add(1)
            .ok_or(MuneraError::MathOverflow)?;

        emit!(PayoutEvent {
            bounty: bounty.key(),
            submission: submission.key(),
            creator: submission.creator,
            amount,
            paid_count: bounty.paid_count,
            timestamp: now,
        });
        Ok(())
    }

    /// Sponsor rejects a Pending submission.
    pub fn reject_submission(ctx: Context<RejectSubmission>) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        require!(submission.status == SubmissionStatus::Pending, MuneraError::SubmissionNotPending);
        submission.status = SubmissionStatus::Rejected;
        emit!(RejectEvent {
            bounty: ctx.accounts.bounty.key(),
            submission: submission.key(),
            creator: submission.creator,
        });
        Ok(())
    }

    /// After the deadline the sponsor withdraws the remaining vault balance and the
    /// bounty is Closed (a second call fails with `BountyClosed`).
    pub fn reclaim_unspent(ctx: Context<ReclaimUnspent>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, MuneraError::BountyClosed);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= bounty.deadline, MuneraError::DeadlineNotReached);

        // Effects before interaction.
        bounty.status = BountyStatus::Closed;

        let remaining = ctx.accounts.vault.amount;
        if remaining > 0 {
            let sponsor_key = bounty.sponsor;
            let id_bytes = bounty.bounty_id.to_le_bytes();
            let bump = [bounty.bump];
            let signer_seeds: &[&[&[u8]]] =
                &[&[BOUNTY_SEED, sponsor_key.as_ref(), &id_bytes, &bump]];
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.sponsor_ata.to_account_info(),
                        authority: bounty.to_account_info(),
                    },
                    signer_seeds,
                ),
                remaining,
                ctx.accounts.mint.decimals,
            )?;
        }

        emit!(ReclaimEvent {
            bounty: bounty.key(),
            sponsor: bounty.sponsor,
            amount: remaining,
        });
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub mint: Account<'info, Mint>,

    /// seeds = [b"bounty", sponsor, bounty_id le]
    #[account(
        init,
        payer = sponsor,
        space = 8 + Bounty::INIT_SPACE,
        seeds = [BOUNTY_SEED, sponsor.key().as_ref(), &bounty_id.to_le_bytes()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// seeds = [b"vault", bounty]; authority = bounty PDA
    #[account(
        init,
        payer = sponsor,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = bounty,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = sponsor,
    )]
    pub sponsor_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitClip<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.sponsor.as_ref(), &bounty.bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    /// seeds = [b"submission", bounty, creator] -> one per creator per bounty
    #[account(
        init,
        payer = creator,
        space = 8 + Submission::INIT_SPACE,
        seeds = [SUBMISSION_SEED, bounty.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveSubmission<'info> {
    /// Pays rent for the creator ATA if it must be created.
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        mut,
        has_one = sponsor @ MuneraError::Unauthorized,
        has_one = mint,
        seeds = [BOUNTY_SEED, sponsor.key().as_ref(), &bounty.bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        has_one = bounty,
        has_one = creator,
        seeds = [SUBMISSION_SEED, bounty.key().as_ref(), creator.key().as_ref()],
        bump = submission.bump,
    )]
    pub submission: Account<'info, Submission>,

    /// CHECK: verified against `submission.creator` through `has_one`; only used as ATA authority.
    pub creator: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump = bounty.vault_bump,
        token::mint = mint,
        token::authority = bounty,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sponsor,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectSubmission<'info> {
    pub sponsor: Signer<'info>,

    #[account(
        has_one = sponsor @ MuneraError::Unauthorized,
        seeds = [BOUNTY_SEED, sponsor.key().as_ref(), &bounty.bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        has_one = bounty,
        seeds = [SUBMISSION_SEED, bounty.key().as_ref(), submission.creator.as_ref()],
        bump = submission.bump,
    )]
    pub submission: Account<'info, Submission>,
}

#[derive(Accounts)]
pub struct ReclaimUnspent<'info> {
    pub sponsor: Signer<'info>,

    #[account(
        mut,
        has_one = sponsor @ MuneraError::Unauthorized,
        has_one = mint,
        seeds = [BOUNTY_SEED, sponsor.key().as_ref(), &bounty.bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump = bounty.vault_bump,
        token::mint = mint,
        token::authority = bounty,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = sponsor,
    )]
    pub sponsor_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Bounty {
    pub sponsor: Pubkey,
    pub mint: Pubkey,
    pub reward_per_winner: u64,
    pub max_winners: u16,
    pub paid_count: u16,
    pub submission_count: u32,
    pub deadline: i64,
    pub status: BountyStatus,
    #[max_len(64)]
    pub title: String,
    #[max_len(280)]
    pub description: String,
    pub bump: u8,
    pub vault_bump: u8,
    pub bounty_id: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Submission {
    pub bounty: Pubkey,
    pub creator: Pubkey,
    #[max_len(200)]
    pub link: String,
    pub status: SubmissionStatus,
    pub paid_amount: u64,
    pub paid_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum BountyStatus {
    Open,
    Closed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct BountyCreated {
    pub bounty: Pubkey,
    pub sponsor: Pubkey,
    pub mint: Pubkey,
    pub bounty_id: u64,
    pub reward_per_winner: u64,
    pub max_winners: u16,
    pub deadline: i64,
    pub total_escrowed: u64,
}

#[event]
pub struct SubmissionCreated {
    pub bounty: Pubkey,
    pub creator: Pubkey,
    pub submission: Pubkey,
}

#[event]
pub struct PayoutEvent {
    pub bounty: Pubkey,
    pub submission: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub paid_count: u16,
    pub timestamp: i64,
}

#[event]
pub struct RejectEvent {
    pub bounty: Pubkey,
    pub submission: Pubkey,
    pub creator: Pubkey,
}

#[event]
pub struct ReclaimEvent {
    pub bounty: Pubkey,
    pub sponsor: Pubkey,
    pub amount: u64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum MuneraError {
    #[msg("Reward per winner must be greater than zero")]
    InvalidReward,
    #[msg("Max winners must be greater than zero")]
    InvalidMaxWinners,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Title must be 1-64 bytes")]
    TitleTooLong,
    #[msg("Description must be at most 280 bytes")]
    DescriptionTooLong,
    #[msg("Link must be 1-200 bytes")]
    LinkTooLong,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Only the bounty sponsor can do this")]
    Unauthorized,
    #[msg("Bounty is closed")]
    BountyClosed,
    #[msg("Submission deadline has passed")]
    DeadlinePassed,
    #[msg("Deadline has not been reached yet")]
    DeadlineNotReached,
    #[msg("Submission is not pending")]
    SubmissionNotPending,
    #[msg("Maximum number of winners already paid")]
    MaxWinnersReached,
}
