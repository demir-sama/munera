/**
 * Verifies lib/profile.ts against a cluster (default: local validator).
 *   RPC_URL=http://127.0.0.1:8899 pnpm tsx scripts/verify-profile.ts
 * Covers: latest wins, sanitisation (bad keys / long values / javascript: URLs / bad handles), other-app memos ignored,
 * memos where the wallet is NOT a signer (spoof attempt) ignored, empty profile = removal, input normalisation, cache.
 */
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import assert from "assert";
import {
  MEMO_PROGRAM_ID, buildProfileFromForm, buildProfileTx, clearProfileCache, emptyForm, fetchProfile, fetchProfiles, getCachedProfile,
  isEmptyProfile, normalizeSocialInput, parseProfileMemo, sanitizeWebsite, serializeProfile, socialUrl,
} from "../src/lib/profile";

const conn = new Connection(process.env.RPC_URL ?? "http://127.0.0.1:8899", "confirmed");

async function fund(kp: Keypair, sol = 1) {
  const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
  const bh = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
}
const memoIx = (data: string, signers: PublicKey[] = []) =>
  new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: signers.map((pubkey) => ({ pubkey, isSigner: true, isWritable: false })),
    data: Buffer.from(data, "utf8"),
  });
const send = (tx: Transaction, ...signers: Keypair[]) => sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
const fresh = async (w: Keypair | PublicKey) => (clearProfileCache(), fetchProfile(w instanceof Keypair ? w.publicKey : w, conn, { force: true }));

async function main() {
  // ---------- pure parsing / sanitisation ----------
  assert.equal(parseProfileMemo("not json"), null);
  assert.equal(parseProfileMemo('{"app":"other","v":1,"t":"profile","socials":{"x":"abc"}}'), null, "other app");
  assert.equal(parseProfileMemo('{"app":"munera","v":2,"t":"profile","socials":{}}'), null, "wrong version");
  assert.equal(parseProfileMemo('{"app":"munera","v":1,"t":"other","socials":{}}'), null, "wrong type");
  assert.equal(parseProfileMemo("[1,2]"), null);
  const dirty = parseProfileMemo(
    JSON.stringify({
      app: "munera", v: 1, t: "profile", name: "  <b>Gladius</b>\u0000 ",
      socials: {
        x: "munera_xyz", instagram: "bad handle!", tiktok: "a".repeat(40), youtube: "ok.channel", telegram: "abc", github: "-bad",
        discord: "UPPER", website: "javascript:alert(1)", evil: "x", __proto__: "y", constructor: "z",
      },
    })
  )!;
  assert.deepEqual(dirty.socials, { x: "munera_xyz", youtube: "ok.channel" }, JSON.stringify(dirty.socials));
  assert.equal(dirty.name, "bGladius/b"); // angle brackets and control chars stripped
  assert.equal(sanitizeWebsite("javascript:alert(1)"), undefined);
  assert.equal(sanitizeWebsite("http://example.com"), undefined);
  assert.equal(sanitizeWebsite("https://user:pw@example.com"), undefined);
  assert.equal(sanitizeWebsite("https://example.com/" + "a".repeat(120)), undefined);
  assert.equal(sanitizeWebsite("data:text/html,<script>"), undefined);
  assert.equal(sanitizeWebsite("https://example.com"), "https://example.com/");
  assert.equal(parseProfileMemo("x".repeat(700)), null, "oversized memo");
  const longName = parseProfileMemo(JSON.stringify({ app: "munera", v: 1, t: "profile", name: "n".repeat(100), socials: {} }))!;
  assert.equal(longName.name!.length, 32);

  // normalisation
  assert.deepEqual(normalizeSocialInput("x", "@Munera_xyz"), { value: "Munera_xyz" });
  assert.deepEqual(normalizeSocialInput("x", "https://twitter.com/munera_xyz?s=11"), { value: "munera_xyz" });
  assert.deepEqual(normalizeSocialInput("x", "x.com/munera_xyz/status/1"), { value: "munera_xyz" });
  assert.deepEqual(normalizeSocialInput("tiktok", "https://www.tiktok.com/@gladius.arena"), { value: "gladius.arena" });
  assert.deepEqual(normalizeSocialInput("youtube", "https://youtube.com/@MuneraXYZ"), { value: "MuneraXYZ" });
  assert.deepEqual(normalizeSocialInput("youtube", "@MuneraXYZ"), { value: "MuneraXYZ" });
  assert.deepEqual(normalizeSocialInput("telegram", "https://t.me/munera_chat"), { value: "munera_chat" });
  assert.deepEqual(normalizeSocialInput("github", "https://github.com/demir-sama/munera"), { value: "demir-sama" });
  assert.deepEqual(normalizeSocialInput("discord", "@Gladius"), { value: "gladius" });
  assert.deepEqual(normalizeSocialInput("website", "example.com"), { value: "https://example.com/" });
  assert(normalizeSocialInput("website", "http://example.com").error);
  assert(normalizeSocialInput("website", "javascript:alert(1)").error);
  assert(normalizeSocialInput("x", "https://evil.com/munera_xyz").error, "wrong host");
  assert(normalizeSocialInput("x", "waytoolonghandle_over15").error);
  assert.deepEqual(normalizeSocialInput("x", "   "), {});
  assert.equal(socialUrl("x", "munera_xyz"), "https://x.com/munera_xyz");
  assert.equal(socialUrl("tiktok", "a.b"), "https://tiktok.com/@a.b");
  assert.equal(socialUrl("youtube", "chan"), "https://youtube.com/@chan");
  assert.equal(socialUrl("discord", "gladius"), null);
  const f = emptyForm();
  f.x = "bad handle"; f.website = "http://x.com";
  assert.deepEqual(Object.keys(buildProfileFromForm(f).errors).sort(), ["website", "x"]);
  console.log("pure checks OK");

  // ---------- onchain ----------
  const creator = Keypair.generate();
  const attacker = Keypair.generate();
  const stranger = Keypair.generate();
  await Promise.all([fund(creator), fund(attacker), fund(stranger)]);

  assert.equal(await fresh(creator), null, "no profile yet");

  // 1. valid v1
  const sig1 = await send(buildProfileTx(creator.publicKey, { name: "Gladius", socials: { x: "munera_xyz", discord: "gladius" } }), creator);
  let p = (await fresh(creator))!;
  assert.equal(p.name, "Gladius");
  assert.deepEqual(p.socials, { x: "munera_xyz", discord: "gladius" });
  assert.equal(p.signature, sig1);
  console.log("save + read OK", sig1.slice(0, 12));

  // 2. latest wins
  const sig2 = await send(buildProfileTx(creator.publicKey, { socials: { x: "second_handle", github: "gladius" } }), creator);
  p = (await fresh(creator))!;
  assert.deepEqual(p.socials, { x: "second_handle", github: "gladius" });
  assert.equal(p.name, undefined);
  assert.equal(p.signature, sig2);
  console.log("latest wins OK");

  // 3. another app's memo, signed by the creator, is ignored
  await send(new Transaction().add(memoIx(JSON.stringify({ app: "other", v: 1, t: "profile", socials: { x: "other_app" } }), [creator.publicKey])), creator);
  await send(new Transaction().add(memoIx("hello world", [creator.publicKey])), creator);
  p = (await fresh(creator))!;
  assert.equal(p.socials.x, "second_handle", "other app/plain memos ignored");

  // 4. spoof: attacker puts a Munera profile memo in a tx that merely mentions the creator (not a signer)
  const spoof = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: attacker.publicKey, toPubkey: creator.publicKey, lamports: 1 }),
    memoIx(serializeProfile({ name: "FAKE", socials: { x: "attacker" } })) // no signer keys on the memo ix
  );
  const spoofSig = await send(spoof, attacker);
  const raw = await conn.getSignaturesForAddress(creator.publicKey, { limit: 10 }, "confirmed");
  assert(raw.some((s) => s.signature === spoofSig && s.memo), "spoof tx shows up in the creator's signature list");
  p = (await fresh(creator))!;
  assert.equal(p.socials.x, "second_handle", "spoofed memo (wallet not a signer) ignored");
  assert.notEqual(p.name, "FAKE");
  console.log("other-app + spoof rejection OK");

  // 4b. the creator signs a tx but the memo ix has no signer account: not attributable -> ignored
  await send(new Transaction().add(memoIx(serializeProfile({ name: "NoAcct", socials: { x: "no_acct" } }))), creator);
  p = (await fresh(creator))!;
  assert.equal(p.socials.x, "second_handle", "memo without the wallet as signer account ignored");
  assert.notEqual(p.name, "NoAcct");

  // 5. a signed but dirty memo is sanitised
  const dirtyMemo = JSON.stringify({
    app: "munera", v: 1, t: "profile", name: "Dirty",
    socials: { x: "clean_x", website: "javascript:alert(1)", tiktok: "x".repeat(60), unknown: "nope", youtube: "not a handle" },
  });
  await send(new Transaction().add(memoIx(dirtyMemo, [creator.publicKey])), creator);
  p = (await fresh(creator))!;
  assert.deepEqual(p.socials, { x: "clean_x" });
  assert.equal(p.name, "Dirty");
  console.log("sanitisation onchain OK");

  // 6. failed tx with a memo is ignored (insufficient funds -> not applicable); remove all links = empty profile wins
  const sig3 = await send(buildProfileTx(creator.publicKey, { socials: {} }), creator);
  p = (await fresh(creator))!;
  assert(isEmptyProfile(p), "empty profile is the latest record");
  assert.equal(p.signature, sig3);
  console.log("remove-all OK");

  // 7. size guard (500-byte cap)
  const maxed = { name: "😀".repeat(32), socials: { website: "https://example.com/" + "a".repeat(78), x: "x".repeat(15), instagram: "i".repeat(30), tiktok: "t".repeat(24), youtube: "y".repeat(30), telegram: "t".repeat(32), github: "g".repeat(39), discord: "d".repeat(32) } };
  buildProfileTx(creator.publicKey, { ...maxed, name: "n".repeat(32) }); // ASCII-maxed (489 bytes) fits
  assert.throws(() => buildProfileTx(creator.publicKey, maxed), /too large/); // emoji-maxed (585 bytes) is refused with a clear error (the editor shows the byte counter)
  assert.throws(() => buildProfileTx(creator.publicKey, { name: "n".repeat(600), socials: {} }), /too large/);

  // 8. cache + batch
  clearProfileCache();
  await send(buildProfileTx(stranger.publicKey, { name: "Stranger", socials: { x: "stranger_x" } }), stranger);
  const t0 = Date.now();
  const m = await fetchProfiles([creator.publicKey, stranger.publicKey, stranger.publicKey.toBase58(), attacker.publicKey], conn);
  assert.equal(m.size, 3);
  assert.equal(m.get(stranger.publicKey.toBase58())?.socials.x, "stranger_x");
  assert.equal(m.get(attacker.publicKey.toBase58()), null, "attacker's own unsigned-account memo is not a profile");
  assert(getCachedProfile(stranger.publicKey.toBase58()) !== undefined, "cached");
  let calls = 0;
  const orig = conn.getSignaturesForAddress.bind(conn);
  (conn as any).getSignaturesForAddress = (...a: any[]) => (calls++, (orig as any)(...a));
  await fetchProfiles([creator.publicKey, stranger.publicKey], conn);
  assert.equal(calls, 0, "second fetch served from cache");
  console.log(`batch + cache OK (${Date.now() - t0}ms)`);

  console.log("ALL PROFILE CHECKS PASSED");
}
main().catch((e) => { console.error("FAILED", e); process.exit(1); });
