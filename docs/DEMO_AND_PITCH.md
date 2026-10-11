# Demo & Pitch

Munera — *Enter the arena. Earn your reward.*

## 1. 2-minute demo video script

**Setup:** two browser profiles, one for the **sponsor** and one for the **creator**, both on devnet with test USDC.
Site: https://munera-opal.vercel.app

| Time | Scene | What to do | Say |
|---|---|---|---|
| 0:00–0:15 | Hook (home page) | Scroll the bounty board once. | "Web3 content campaigns still pay creators through spreadsheets and DMs. Creators don't know they'll get paid, and projects can't prove they paid. This is Munera: enter the arena, earn your reward." |
| 0:15–0:40 | Sponsor creates a bounty | Connect the sponsor wallet and open **Create**. Fill in "Clip our launch", 5 USDC per approved clip, 3 winners, and a deadline. Point at the total budget (15 USDC). Create the bounty and approve the wallet prompt. | "The full budget is locked in an escrow vault, so creators can see the money is real." |
| 0:40–1:00 | Creator submits | Switch to the creator profile and open the bounty. Paste an X or YouTube clip link and submit. | "One submission per creator. It's recorded onchain." |
| 1:00–1:30 | Sponsor approves | Switch back to the sponsor and open the bounty. Show the pending submission and click **Approve**. | "Approval pays the creator from the vault in the same transaction. No spreadsheet, no DM." |
| 1:30–1:50 | Proof | Open **Payments** and click the Explorer link. Show the USDC transfer from the vault to the creator. | "Every payout is public and verifiable." |
| 1:50–2:00 | Close | — | "After the deadline, the sponsor can reclaim unspent funds. Munera: enter the arena, earn your reward." |

## 2. Hackathon submission description

Munera is a Solana-native escrow platform for content bounties. Sponsors lock USDC in a bounty vault. Creators submit clips or
posts, and the sponsor approves or rejects each one. Approval pays the creator from the vault in the same transaction, and after
the deadline the sponsor can reclaim unspent funds. It replaces manual spreadsheet and DM payouts with trustless escrow and an
onchain, publicly verifiable payment history.

Built with an Anchor program (PDA-based bounties, vaults and submissions, checked math, sponsor-only controls, 22 passing tests)
and a Next.js frontend that reads everything straight from onchain accounts, with no backend or database. It's live on devnet.

## 3. 5-slide pitch outline

1. **Problem**
   - Creator campaigns pay by spreadsheet and DM.
   - Creators don't trust they'll be paid.
   - Projects can't prove they paid.
2. **Solution**
   - Munera: escrowed USDC bounties with automatic onchain payouts.
   - Show the logo and tagline.
3. **How it works**
   - Lock budget → submit → approve and pay in one transaction → reclaim after the deadline.
   - Use a four-step diagram.
4. **Product and tech**
   - Screenshots of the bounty board and payments page.
   - Anchor program design.
   - Security basics: sponsor-only actions, no double payment, max winners, checked math, no backend.
5. **Traction and next steps**
   - Live on devnet with a real payout.
   - Next: mainnet USDC, Solana Actions/Blinks to fund and share bounties from X, creator reputation.
