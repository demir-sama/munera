import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const DECIMALS = 6;
export const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
export const KEYPAIR_PATH =
  process.env.KEYPAIR_PATH ?? path.join(os.homedir(), ".config", "solana", "id.json");
export const MINT_FILE = path.join(__dirname, "mint-address.json");

export function loadKeypair(file = KEYPAIR_PATH): Keypair {
  if (!fs.existsSync(file)) {
    throw new Error(`Keypair not found at ${file}. Run: solana-keygen new --no-bip39-passphrase -o ${file}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
}

export function connect(): Connection {
  return new Connection(RPC_URL, "confirmed");
}
