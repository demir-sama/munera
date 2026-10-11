/**
 * Creates a 6-decimal "test USDC" mint (mint authority = the CLI wallet).
 *
 *   yarn create-mint                       # devnet (default)
 *   RPC_URL=http://127.0.0.1:8899 yarn create-mint
 *
 * Writes the mint address to scripts/mint-address.json.
 */
import { createMint } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import { DECIMALS, KEYPAIR_PATH, MINT_FILE, RPC_URL, connect, loadKeypair } from "./common";

(async () => {
  const connection = connect();
  const payer = loadKeypair();
  console.log("RPC:", RPC_URL);
  console.log("Authority/payer:", payer.publicKey.toBase58(), `(${KEYPAIR_PATH})`);
  const bal = await connection.getBalance(payer.publicKey);
  console.log("Balance (SOL):", bal / 1e9);
  if (bal < 0.01 * 1e9) throw new Error("Insufficient SOL. Try: solana airdrop 2 --url devnet");

  const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, DECIMALS, Keypair.generate());
  console.log("Mint created:", mint.toBase58());
  fs.writeFileSync(
    MINT_FILE,
    JSON.stringify({ mint: mint.toBase58(), decimals: DECIMALS, rpc: RPC_URL, authority: payer.publicKey.toBase58() }, null, 2) + "\n"
  );
  console.log("Saved to", MINT_FILE);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
