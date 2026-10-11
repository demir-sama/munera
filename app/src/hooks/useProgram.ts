"use client";
import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/program";

/** Program bound to the connected wallet (read-only when disconnected). */
export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(() => getProgram(connection, wallet), [connection, wallet]);
  return { program, connection, wallet };
}
