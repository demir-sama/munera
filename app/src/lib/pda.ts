import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "./config";

// Seeds exactly as in programs/munera/src/lib.rs
export const bountyPda = (sponsor: PublicKey, bountyId: BN, programId: PublicKey = PROGRAM_ID) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), sponsor.toBuffer(), bountyId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];

export const vaultPda = (bounty: PublicKey, programId: PublicKey = PROGRAM_ID) =>
  PublicKey.findProgramAddressSync([Buffer.from("vault"), bounty.toBuffer()], programId)[0];

export const submissionPda = (bounty: PublicKey, creator: PublicKey, programId: PublicKey = PROGRAM_ID) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("submission"), bounty.toBuffer(), creator.toBuffer()],
    programId
  )[0];
