import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DAILY_REWARDS = [1, 2, 3, 5, 8, 13, 20];
const MATCH_WINDOW_MS = 6000; // 3-second countdown + 3-second answer
const QUEUE_STALE_MS = 30_000;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function adjustGems(userId: string, delta: number, type: string, ref?: string | null, note?: string) {
  const admin = await getAdmin();
  const { data, error } = await admin.rpc("adjust_gems" as never, {
    _user_id: userId, _delta: delta, _type: type, _ref: ref ?? null, _note: note ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as number | null;
}

/** Returns the current user's profile with computed fields. */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

/** Idempotent daily login claim. Returns { claimed, amount, streak }. */
export const claimDaily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data: p } = await admin.from("profiles").select("streak,last_login_date").eq("id", context.userId).maybeSingle();
    if (!p) throw new Error("Profile missing");
    const today = new Date().toISOString().slice(0, 10);
    if (p.last_login_date === today) {
      return { claimed: false, amount: 0, streak: p.streak };
    }
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = p.last_login_date === yest ? (p.streak || 0) + 1 : 1;
    const amount = DAILY_REWARDS[Math.min(newStreak - 1, DAILY_REWARDS.length - 1)];
    await admin.from("profiles").update({ streak: newStreak, last_login_date: today }).eq("id", context.userId);
    await adjustGems(context.userId, amount, "daily", null, `Day ${newStreak}`);
    return { claimed: true, amount, streak: newStreak };
  });

/** Join the matchmaking queue. Returns { matchId } if paired, else { waiting:true }. */
export const joinQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const me = context.userId;

    // Clean stale queue entries
    await admin.from("match_queue")
      .delete()
      .lt("joined_at", new Date(Date.now() - QUEUE_STALE_MS).toISOString());

    // Look for a partner (excluding self, blocked, and users who blocked me)
    const { data: blocks } = await admin.from("blocks")
      .select("blocker_id,blocked_id")
      .or(`blocker_id.eq.${me},blocked_id.eq.${me}`);
    const excluded = new Set<string>([me]);
    for (const b of blocks ?? []) {
      excluded.add(b.blocker_id);
      excluded.add(b.blocked_id);
    }

    const { data: candidates } = await admin
      .from("match_queue")
      .select("user_id,joined_at")
      .order("joined_at", { ascending: true })
      .limit(20);

    const partner = (candidates ?? []).find(c => !excluded.has(c.user_id));

    let partnerId: string | null = partner?.user_id ?? null;
    let botAnswer: "a" | "b" | null = null;

    if (!partnerId) {
      // Fall back to a random bot opponent so the player always gets a match.
      const { data: bots } = await admin
        .from("profiles")
        .select("id")
        .eq("is_bot", true)
        .limit(50);
      const usableBots = (bots ?? []).filter(b => !excluded.has(b.id));
      if (usableBots.length > 0) {
        const bot = usableBots[Math.floor(Math.random() * usableBots.length)];
        partnerId = bot.id;
        // Bot answers ~80% of the time, random side
        if (Math.random() < 0.8) botAnswer = Math.random() < 0.5 ? "a" : "b";
      }
    }

    if (!partnerId) {
      await admin.from("match_queue").upsert({ user_id: me, joined_at: new Date().toISOString() });
      return { waiting: true as const };
    }

    const { data: qrows } = await admin.from("questions").select("id").eq("active", true);
    if (!qrows || qrows.length === 0) throw new Error("No questions available");
    const q = qrows[Math.floor(Math.random() * qrows.length)];

    const insertRow: {
      user_a: string; user_b: string; question_id: string; status: "active";
      answer_a?: "a" | "b"; answered_at_a?: string;
    } = { user_a: partnerId, user_b: me, question_id: q.id, status: "active" };
    if (botAnswer) {
      insertRow.answer_a = botAnswer;
      insertRow.answered_at_a = new Date().toISOString();
    }
    const { data: match, error: mErr } = await admin
      .from("matches")
      .insert(insertRow)
      .select("id").single();
    if (mErr) throw mErr;

    await admin.from("match_queue").delete().in("user_id", [me, partnerId]);

    return { waiting: false as const, matchId: match.id };
  });

const BOT_PROFILES = [
  { name: "Luna", country: "🇫🇷 France", bio: "Coffee addict ☕ & cat mom 🐱" },
  { name: "Kai", country: "🇯🇵 Japan", bio: "Sushi, anime, neon nights ✨" },
  { name: "Zara", country: "🇧🇷 Brazil", bio: "Beach + sunsets = life 🌅" },
  { name: "Milo", country: "🇮🇹 Italy", bio: "Pasta enthusiast 🍝" },
  { name: "Aria", country: "🇰🇷 Korea", bio: "K-pop dancer 💃" },
  { name: "Theo", country: "🇩🇪 Germany", bio: "Berlin techno + bouldering 🧗" },
  { name: "Nova", country: "🇺🇸 USA", bio: "LA based, always exploring 🌴" },
  { name: "Inez", country: "🇲🇽 Mexico", bio: "Tacos > everything 🌮" },
];

/** Seed dummy bot profiles you can match against. Idempotent. */
export const seedBots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = await getAdmin();
    let created = 0;
    for (const b of BOT_PROFILES) {
      const { data: existing } = await admin
        .from("profiles").select("id").eq("username", b.name).maybeSingle();
      if (existing) continue;
      const email = `bot_${b.name.toLowerCase()}@tapconnect.bot`;
      const { data: u, error } = await admin.auth.admin.createUser({
        email, password: crypto.randomUUID(), email_confirm: true,
      });
      if (error || !u.user) continue;
      await admin.from("profiles").update({
        username: b.name, country: b.country, bio: b.bio, is_bot: true,
      }).eq("id", u.user.id);
      created++;
    }
    const { count } = await admin
      .from("profiles").select("id", { count: "exact", head: true }).eq("is_bot", true);
    return { created, total: count ?? 0 };
  });

export const leaveQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    await admin.from("match_queue").delete().eq("user_id", context.userId);
    return { ok: true };
  });

/** Poll for an active match that includes me, created recently. */
export const pollMyMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - QUEUE_STALE_MS).toISOString();
    const { data } = await context.supabase
      .from("matches")
      .select("id,created_at,status")
      .or(`user_a.eq.${context.userId},user_b.eq.${context.userId}`)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

/** Get full match state for a match the user belongs to. */
export const getMatchState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const { data: match } = await context.supabase
      .from("matches").select("*").eq("id", data.matchId).maybeSingle();
    if (!match) throw new Error("Match not found");
    if (match.user_a !== me && match.user_b !== me) throw new Error("Not your match");
    const { data: q } = await context.supabase
      .from("questions").select("*").eq("id", match.question_id).maybeSingle();
    const otherId = match.user_a === me ? match.user_b : match.user_a;
    const myAnswer = match.user_a === me ? match.answer_a : match.answer_b;
    const otherAnswer = match.user_a === me ? match.answer_b : match.answer_a;
    let otherProfile = null;
    if (match.unlocked) {
      const { data: op } = await context.supabase
        .from("profiles").select("id,username,avatar_url,bio,country,streak").eq("id", otherId).maybeSingle();
      otherProfile = op;
    }
    return {
      id: match.id,
      question: q,
      status: match.status,
      unlocked: match.unlocked,
      gemsAwarded: match.gems_awarded,
      myAnswer, otherAnswer,
      otherUserId: otherId,
      otherProfile,
      createdAt: match.created_at,
      isUserA: match.user_a === me,
    };
  });

/** Submit my answer. Idempotent. */
export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchId: z.string().uuid(), choice: z.enum(["a","b"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    const me = context.userId;
    const { data: m } = await admin.from("matches").select("*").eq("id", data.matchId).maybeSingle();
    if (!m) throw new Error("Match not found");
    if (m.user_a !== me && m.user_b !== me) throw new Error("Not your match");
    const isA = m.user_a === me;
    const now = new Date().toISOString();
    if (isA && !m.answer_a) {
      await admin.from("matches").update({ answer_a: data.choice, answered_at_a: now }).eq("id", data.matchId);
    } else if (!isA && !m.answer_b) {
      await admin.from("matches").update({ answer_b: data.choice, answered_at_b: now }).eq("id", data.matchId);
    }
    return await settleInternal(data.matchId);
  });

/** Force settlement (called after the timer expires). */
export const settleMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => settleInternal(data.matchId));

async function settleInternal(matchId: string) {
  const admin = await getAdmin();
  const { data: m } = await admin.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!m) throw new Error("Match not found");
  if (m.status === "completed") {
    return { status: "completed", gemsAwarded: m.gems_awarded, unlocked: m.unlocked };
  }
  const bothAnswered = !!m.answer_a && !!m.answer_b;
  const expired = Date.now() - new Date(m.created_at).getTime() > MATCH_WINDOW_MS;
  if (!bothAnswered && !expired) {
    return { status: "active", gemsAwarded: 0, unlocked: false };
  }
  let unlocked = false;
  let gems = 0;
  if (bothAnswered) {
    gems = 5; unlocked = true;
    await adjustGems(m.user_a, gems, "match_win", matchId);
    await adjustGems(m.user_b, gems, "match_win", matchId);
  } else if (m.answer_a || m.answer_b) {
    gems = 3; unlocked = true;
    const winner = m.answer_a ? m.user_a : m.user_b;
    await adjustGems(winner, gems, "match_win", matchId);
  }
  // Increment wins manually + auto-award badges
  if (unlocked) {
    const winners = bothAnswered ? [m.user_a, m.user_b] : [m.answer_a ? m.user_a : m.user_b];
    for (const w of winners) {
      const { data: prof } = await admin.from("profiles").select("total_matches_won").eq("id", w).maybeSingle();
      if (prof) await admin.from("profiles").update({ total_matches_won: (prof.total_matches_won || 0) + 1 }).eq("id", w);
      await admin.rpc("check_and_award_badges" as never, { _user_id: w } as never);
    }
  }
  await admin.from("matches").update({
    status: "completed", unlocked, gems_awarded: gems, completed_at: new Date().toISOString(),
  }).eq("id", matchId);
  return { status: "completed", gemsAwarded: gems, unlocked };
}

/* ====================== PHASE 3: CHAT, GIFTS, SAFETY ====================== */

async function assertMatchAccess(matchId: string, me: string) {
  const admin = await getAdmin();
  const { data: m } = await admin.from("matches").select("user_a,user_b,unlocked").eq("id", matchId).maybeSingle();
  if (!m) throw new Error("Match not found");
  if (m.user_a !== me && m.user_b !== me) throw new Error("Not your match");
  if (!m.unlocked) throw new Error("Match not unlocked yet");
  const other = m.user_a === me ? m.user_b : m.user_a;
  // Block check
  const { data: blocked } = await admin.from("blocks").select("blocker_id")
    .or(`and(blocker_id.eq.${me},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${me})`)
    .limit(1);
  if (blocked && blocked.length > 0) throw new Error("Chat unavailable");
  return { other };
}

export const getChatThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { other } = await assertMatchAccess(data.matchId, context.userId);
    const admin = await getAdmin();
    const { data: msgs } = await admin.from("messages")
      .select("id,sender_id,body,type,created_at")
      .eq("match_id", data.matchId).order("created_at", { ascending: true }).limit(200);
    const { data: prof } = await admin.from("profiles")
      .select("id,username,avatar_url,country,bio,is_bot").eq("id", other).maybeSingle();
    return { messages: msgs ?? [], other: prof };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    matchId: z.string().uuid(),
    body: z.string().trim().min(1).max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertMatchAccess(data.matchId, context.userId);
    const admin = await getAdmin();
    const { data: m, error } = await admin.from("messages").insert({
      match_id: data.matchId, sender_id: context.userId, body: data.body, type: "text",
    }).select("id,sender_id,body,type,created_at").single();
    if (error) throw error;

    // If bot, auto-reply
    const { other } = await assertMatchAccess(data.matchId, context.userId);
    const { data: otherProf } = await admin.from("profiles").select("is_bot,username").eq("id", other).maybeSingle();
    if (otherProf?.is_bot) {
      const replies = [
        "haha same 😂", "noo really??", "omg yes 🔥", "tell me more 👀",
        "bet 💯", "you're funny 😄", "100% agree", "lol stop 😭", "interesting 🤔",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setTimeout(async () => {
        await admin.from("messages").insert({
          match_id: data.matchId, sender_id: other, body: reply, type: "text",
        });
      }, 1200 + Math.random() * 1500);
    }
    return m;
  });

export const sendGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    matchId: z.string().uuid(),
    gift: z.enum(["rose", "fire"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { other } = await assertMatchAccess(data.matchId, context.userId);
    const admin = await getAdmin();
    const cost = 10;
    const newBal = await adjustGems(context.userId, -cost, "gift_sent", null, `Gift: ${data.gift}`);
    if (newBal === null) throw new Error("Not enough 💎");
    await adjustGems(other, Math.ceil(cost / 2), "gift_received", null, `Gift from ${context.userId}`);
    await admin.from("profiles").update({ total_gifts_sent: (await admin.from("profiles").select("total_gifts_sent").eq("id", context.userId).single()).data!.total_gifts_sent + 1 }).eq("id", context.userId);
    const emoji = data.gift === "rose" ? "🌹" : "🔥";
    await admin.from("messages").insert({
      match_id: data.matchId, sender_id: context.userId, body: `Sent a ${emoji}!`, type: "gift",
    });
    await admin.rpc("check_and_award_badges" as never, { _user_id: context.userId } as never);
    return { ok: true, gems: newBal };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Can't block yourself");
    const admin = await getAdmin();
    await admin.from("blocks").upsert({ blocker_id: context.userId, blocked_id: data.userId });
    return { ok: true };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    matchId: z.string().uuid().optional(),
    reason: z.string().trim().min(3).max(300),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await admin.from("reports").insert({
      reporter_id: context.userId, reported_id: data.userId,
      match_id: data.matchId ?? null, reason: data.reason,
    });
    return { ok: true };
  });

/* ====================== PHASE 4: ECONOMY, REFERRALS, LEADERBOARDS ====================== */

export const redeemReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().min(4).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    const { data: r, error } = await admin.rpc("redeem_referral" as never, {
      _user_id: context.userId, _code: data.code,
    } as never);
    if (error) throw error;
    return r as { ok: boolean; reason?: string; owner?: string };
  });

export const spendGems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    item: z.enum(["boost", "mystery", "streak_saver", "badge_legend", "badge_og", "badge_platinum", "badge_globetrotter"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    const me = context.userId;

    if (data.item === "boost") {
      const bal = await adjustGems(me, -50, "spend_boost", null, "Profile Boost 1h");
      if (bal === null) throw new Error("Not enough 💎");
      const until = new Date(Date.now() + 3600_000).toISOString();
      await admin.from("profiles").update({ boost_until: until }).eq("id", me);
      return { ok: true, gems: bal, message: "Boost active for 1 hour ✨" };
    }

    if (data.item === "mystery") {
      const bal = await adjustGems(me, -25, "spend_mystery", null, "Mystery Box");
      if (bal === null) throw new Error("Not enough 💎");
      const roll = Math.random();
      const payout = roll < 0.10 ? 100 : roll < 0.30 ? 50 : 5 + Math.floor(Math.random() * 21);
      const newBal = await adjustGems(me, payout, "mystery_payout", null, `Mystery payout ${payout}`);
      return { ok: true, gems: newBal, payout, message: `🎁 You won +${payout} 💎!` };
    }

    if (data.item === "streak_saver") {
      const bal = await adjustGems(me, -20, "spend_streak_saver", null, "Streak Saver");
      if (bal === null) throw new Error("Not enough 💎");
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await admin.from("profiles").update({ last_login_date: yest }).eq("id", me);
      return { ok: true, gems: bal, message: "Streak saved! 🛟" };
    }

    // Paid badges
    const badgeMap: Record<string, string> = {
      badge_legend: "legend", badge_og: "og",
      badge_platinum: "platinum", badge_globetrotter: "globetrotter",
    };
    const badgeId = badgeMap[data.item];
    const { data: existing } = await admin.from("user_badges").select("badge_id").eq("user_id", me).eq("badge_id", badgeId).maybeSingle();
    if (existing) throw new Error("You already own this badge");
    const bal = await adjustGems(me, -100, "spend_badge", null, `Badge: ${badgeId}`);
    if (bal === null) throw new Error("Not enough 💎");
    await admin.from("user_badges").insert({ user_id: me, badge_id: badgeId });
    return { ok: true, gems: bal, message: `Badge unlocked 🏅` };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tab: z.enum(["weekly", "gems", "gifts"]) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const view = data.tab === "weekly" ? "lb_weekly_wins" : data.tab === "gems" ? "lb_alltime_gems" : "lb_monthly_gifts";
    const { data: rows } = await admin.from(view as never).select("*").limit(25);
    return (rows ?? []) as Array<{ id: string; username: string; avatar_url: string | null; country: string | null; score: number }>;
  });

export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data } = await admin.from("user_badges")
      .select("badge_id,awarded_at,badges(name,emoji,description)").eq("user_id", context.userId);
    return data ?? [];
  });
