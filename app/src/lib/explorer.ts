import { CLUSTER, RPC_URL } from "./config";

function suffix(): string {
  if (CLUSTER === "mainnet-beta" || CLUSTER === "mainnet") return "";
  if (CLUSTER === "localnet" || CLUSTER === "custom") {
    return `?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
  }
  return `?cluster=${CLUSTER}`;
}

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}${suffix()}`;
export const explorerAddress = (addr: string) => `https://explorer.solana.com/address/${addr}${suffix()}`;
