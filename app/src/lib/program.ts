import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import idlJson from "../idl/munera.json";
import type { Munera } from "../idl/munera";
import { PROGRAM_ID } from "./config";

export type MuneraProgram = Program<Munera>;
export const IDL = idlJson as unknown as Munera;

/** Wallet shape accepted by anchor (what useAnchorWallet() returns). */
export type AnchorWalletLike = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
};

/** Wallet used when nothing is connected: can read, can never sign. */
function readOnlyWallet(): Wallet {
  const kp = Keypair.generate();
  const fail = () => Promise.reject(new Error("Connect a wallet to send transactions"));
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: fail,
    signAllTransactions: fail,
  } as unknown as Wallet;
}

/** Builds the Program for the connected wallet (read-only provider when `wallet` is undefined). */
export function getProgram(connection: Connection, wallet?: AnchorWalletLike | null): MuneraProgram {
  const provider = new AnchorProvider(connection, (wallet as Wallet | undefined) ?? readOnlyWallet(), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  // The program address can be overridden through NEXT_PUBLIC_PROGRAM_ID
  const idl = { ...IDL, address: PROGRAM_ID.toBase58() } as Munera;
  return new Program<Munera>(idl, provider);
}
