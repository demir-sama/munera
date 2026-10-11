"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { fetchProfile, getCachedProfile, subscribeProfiles, type Profile } from "@/lib/profile";

/**
 * Lazily loads a wallet's onchain profile. `undefined` = loading/unknown, `null` = none (or RPC failed).
 * Never blocks rendering. With `lazy`, fetching starts only once the returned `ref` element is near the viewport.
 */
export function useProfile(wallet: string | undefined, lazy = false) {
  const { connection } = useConnection();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [visible, setVisible] = useState(!lazy);
  const nodeRef = useRef<Element | null>(null);

  const ref = useCallback(
    (node: Element | null) => {
      nodeRef.current = node;
      if (!lazy || !node) return;
      if (typeof IntersectionObserver === "undefined") return setVisible(true);
      const io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) {
            setVisible(true);
            io.disconnect();
          }
        },
        { rootMargin: "200px" }
      );
      io.observe(node);
    },
    [lazy]
  );

  useEffect(() => {
    if (!wallet) return setProfile(undefined);
    const c = getCachedProfile(wallet);
    if (c !== undefined) setProfile(c);
    else setProfile(undefined);
    const off = subscribeProfiles((w) => {
      if (w === wallet) setProfile(getCachedProfile(wallet));
    });
    if (visible && c === undefined) {
      let alive = true;
      fetchProfile(wallet, connection).then((p) => alive && setProfile(p));
      return () => {
        alive = false;
        off();
      };
    }
    return off;
  }, [wallet, connection, visible]);

  const reload = useCallback(async () => {
    if (!wallet) return null;
    const p = await fetchProfile(wallet, connection, { force: true });
    setProfile(p);
    return p;
  }, [wallet, connection]);

  return { profile, ref, reload };
}
