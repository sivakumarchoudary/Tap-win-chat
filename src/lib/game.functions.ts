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

    if (!partner) {
      // Put myself in queue
      await admin.from("match_queue").upsert({ user_id: me, joined_at: new Date().toISOString() });
      return { waiting: true as const };
    }

    // Pair! Pick random question, create match, remove both from queue.
    const { data: qrows } = await admin.from("questions").select("id").eq("active", true);
    if (!qrows || qrows.length === 0) throw new Error("No questions available");
    const q = qrows[Math.floor(Math.random() * qrows.length)];

    const { data: match, error: mErr } = await admin
      .from("matches")
      .insert({ user_a: partner.user_id, user_b: me, question_id: q.id, status: "active" })
      .select("id").single();
    if (mErr) throw mErr;

    await admin.from("match_queue").delete().in("user_id", [me, partner.user_id]);

    return { waiting: false as const, matchId: match.id };
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
    await admin.from("profiles").update({ total_matches_won: undefined }).eq("id", m.user_a); // placeholder no-op
    await admin.rpc("increment_wins" as never, {} as never).select(); // ignore if missing
  } else if (m.answer_a || m.answer_b) {
    gems = 3; unlocked = true;
    const winner = m.answer_a ? m.user_a : m.user_b;
    await adjustGems(winner, gems, "match_win", matchId);
  }
  // Increment wins manually
  if (unlocked) {
    const winners = bothAnswered ? [m.user_a, m.user_b] : [m.answer_a ? m.user_a : m.user_b];
    for (const w of winners) {
      const { data: prof } = await admin.from("profiles").select("total_matches_won").eq("id", w).maybeSingle();
      if (prof) await admin.from("profiles").update({ total_matches_won: (prof.total_matches_won || 0) + 1 }).eq("id", w);
    }
  }
  await admin.from("matches").update({
    status: "completed", unlocked, gems_awarded: gems, completed_at: new Date().toISOString(),
  }).eq("id", matchId);
  return { status: "completed", gemsAwarded: gems, unlocked };
}
