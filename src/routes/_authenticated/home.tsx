import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getMyProfile, claimDaily, joinQueue, leaveQueue } from "@/lib/game.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

const DAILY_REWARDS = [1, 2, 3, 5, 8, 13, 20];

function HomePage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const claim = useServerFn(claimDaily);
  const join = useServerFn(joinQueue);
  const leave = useServerFn(leaveQueue);

  const { data: profile, refetch } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
  });

  const [searching, setSearching] = useState(false);

  // Auto-claim daily on first load
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.last_login_date === today) return;
    claim().then((r) => {
      if (r.claimed) {
        toast.success(`Day ${r.streak} 🔥 +${r.amount} 💎`);
        refetch();
      }
    }).catch(() => {});
  }, [profile, claim, refetch]);


  // Poll while searching
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await join();
        if (cancelled) return;
        if (!res.waiting) {
          setSearching(false);
          navigate({ to: "/match/$id", params: { id: res.matchId! } });
          return;
        }
        timer = setTimeout(tick, 1500);
      } catch (e: any) {
        toast.error(e.message ?? "Couldn't find a match");
        setSearching(false);
      }
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer!); leave().catch(() => {}); };
  }, [searching, join, leave, navigate]);

  const streak = profile?.streak ?? 0;
  const nextReward = DAILY_REWARDS[Math.min(streak, DAILY_REWARDS.length - 1)];

  return (
    <AppShell gems={profile?.gems}>
      <div className="flex flex-col items-center text-center gap-6 pt-4">
        <div className="w-full card-soft p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Login streak</div>
            <div className="text-xl font-extrabold">🔥 Day {streak}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Tomorrow</div>
            <div className="text-sm font-bold text-primary">+{nextReward} 💎</div>
          </div>
        </div>

        <div className="pt-6 pb-2">
          <div className="text-sm text-muted-foreground">Ready to meet someone new?</div>
          <h2 className="text-2xl font-extrabold mt-1">Tap to Play</h2>
        </div>

        {!searching ? (
          <button
            onClick={() => setSearching(true)}
            disabled={joinMut.isPending}
            className="btn-brand rounded-full size-56 text-2xl font-extrabold tap-target hover:scale-105 transition-transform active:scale-95"
            style={{ boxShadow: "var(--shadow-brand)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl">🎯</span>
              <span>PLAY</span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="size-56 rounded-full btn-brand flex items-center justify-center animate-pulse-big">
              <div className="text-center">
                <div className="text-5xl mb-2">🔍</div>
                <div className="font-bold">Finding match...</div>
              </div>
            </div>
            <button onClick={() => setSearching(false)} className="text-sm text-muted-foreground underline tap-target px-4 py-2">
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full mt-6 text-left">
          <div className="card-soft p-3">
            <div className="text-xs text-muted-foreground">Wins</div>
            <div className="font-extrabold text-lg">{profile?.total_matches_won ?? 0} 🏆</div>
          </div>
          <div className="card-soft p-3">
            <div className="text-xs text-muted-foreground">Gems earned</div>
            <div className="font-extrabold text-lg">{profile?.total_gems_earned ?? 0} 💎</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
