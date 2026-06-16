This is a large build (real-time matchmaking, chat, Gems economy, Stripe, leaderboard, badges, streaks, referrals). I'll ship it in phases so each one is testable before stacking the next.

## Phase 1 — Foundation (this turn)
- Enable Lovable Cloud (database + auth + realtime).
- Mobile-first design system in `src/styles.css`: gradient `#6C63FF → #FF6B6B`, rounded Poppins, dark mode, large tap targets, coin/confetti/pulse animations.
- Auth: email/password + Google, age-gate (18+) on signup.
- Schema + RLS + grants:
  - `profiles` (auto-name "Player N", optional avatar, gems, streak, last_login, country, referral_code, referred_by)
  - `user_roles` + `has_role` (admin moderation)
  - `questions` (100+ "This or That" seeded via migration, categories)
  - `match_queue` (waiting users)
  - `matches` (two user_ids, question_id, answers, winners, gems_awarded, status)
  - `messages` (match_id, sender_id, body, type: text/gift)
  - `gem_transactions` (purchase, win, gift, spend, daily, referral)
  - `badges` + `user_badges` (auto + paid)
  - `blocks`, `reports`
- Home screen, navigation shell (Home / Store / Leaderboard / Profile).

## Phase 2 — Match loop
- Matchmaking server fn: insert into queue, pair with oldest waiting user, create match row, return match id. Realtime channel on `matches`.
- Match screen: 3-2-1 countdown with pulse, question card with two big buttons, submit answer server fn (idempotent).
- Result screen with Gem award logic (5 / 3 / 0), confetti + coin shower.
- Profile unlock card → Chat or Next Match.

## Phase 3 — Chat + safety
- Realtime `messages` per match, Send Gift (10 Gems → Rose), Block, Report.
- Messages disabled if either user blocked.

## Phase 4 — Economy & engagement
- Daily login streak (1/2/3/5/8/13/20 Gems), Streak Saver.
- Gem Store: Profile Boost, Mystery Box (RNG server-side), Virtual Gift, Streak Saver, Exclusive Badge.
- Referral codes + redemption.
- Leaderboards (weekly wins, all-time Gems, monthly gifts) via SQL views.
- Auto-badge triggers on match/gift/streak/referral milestones.

## Phase 5 — Real Stripe payments
- Run `recommend_payment_provider`, then `enable_stripe_payments`.
- Create Gem-pack products (100 / 600 / 1500 Gems), checkout server fn, webhook crediting Gems.

## Technical notes
- Stack: TanStack Start + Lovable Cloud (Supabase). Realtime via Supabase channels.
- Matchmaking is a server function with a SQL transaction (`FOR UPDATE SKIP LOCKED`) to avoid double-pairing.
- All Gem mutations go through server fns that write to `gem_transactions` and update `profiles.gems` atomically (RPC) — never client-side.
- Question bank seeded in migration; users can suggest new ones to a `question_suggestions` table moderated by admins.
- Mobile viewport set to mobile preview.

## What you'll see after Phase 1
A signed-in homepage with your Gem balance, a big "Tap to Play" button (matchmaking wired in Phase 2), bottom nav, and the visual style locked in. Then I'll iterate phase by phase — reply "go" between phases or let me chain them.

Approve and I'll start Phase 1.