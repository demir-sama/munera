/**
 * Mints N test-USDC (whole tokens) to a wallet; creates its ATA if needed.
 *
 *   yarn mint-to <WALLET_PUBKEY> <AMOUNT> [MINT_ADDRESS]
 *
 * MINT_ADDRESS defaults to the one in scripts/mint-address.json (written by create-mint).
 * Signer must be the mint authority (the CLI keypair that ran create-mint).
 */
import { getOrCreateAssociatedTokenAccount, getMint, mintTo } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { MINT_FILE, RPC_URL, connect, loadKeypair } from "./common";

(async () => {
  const [walletArg, amountArg, mintArg] = process.argv.slice(2);
  if (!walletArg || !amountArg) {
    console.error("usage: yarn mint-to <WALLET_PUBKEY> <AMOUNT> [MINT_ADDRESS]");
    process.exit(1);
  }
  const mintStr = mintArg ?? (fs.existsSync(MINT_FILE) ? JSON.parse(fs.readFileSync(MINT_FILE, "utf8")).mint : undefined);
  if (!mintStr) throw new Error("No mint given and scripts/mint-address.json not found. Run create-mint first.");

  const connection = connect();
  const payer = loadKeypair();
  const wallet = new PublicKey(walletArg);
  const mint = new PublicKey(mintStr);
  const mintInfo = await getMint(connection, mint);
  const amount = Number(amountArg);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("AMOUNT must be a positive number");
  const raw = BigInt(Math.round(amount * 10 ** mintInfo.decimals));

  console.log("RPC:", RPC_URL);
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, wallet);
  const sig = await mintTo(connection, payer, mint, ata.address, payer, raw);
  const after = await connection.getTokenAccountBalance(ata.address);
  console.log(`Minted ${amount} to ${wallet.toBase58()} (ATA ${ata.address.toBase58()})`);
  console.log("Signature:", sig);
  console.log("New balance:", after.value.uiAmountString);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
