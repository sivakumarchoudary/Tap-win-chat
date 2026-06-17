import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getLeaderboard, getMyProfile } from "@/lib/game.functions";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

type Tab = "weekly" | "gems" | "gifts";

function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("weekly");
  const getLb = useServerFn(getLeaderboard);
  const getProfile = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const { data: rows, isLoading } = useQuery({
    queryKey: ["lb", tab],
    queryFn: () => getLb({ data: { tab } }),
  });

  const labels: Record<Tab, { title: string; unit: string }> = {
    weekly: { title: "Weekly Wins", unit: "🏆" },
    gems:   { title: "All-Time Gems", unit: "💎" },
    gifts:  { title: "Gifts (30d)", unit: "🎁" },
  };

  const myRankRow = rows?.find((r) => r.id === profile?.id);
  const myRank = myRankRow ? (rows!.indexOf(myRankRow) + 1) : null;

  return (
    <AppShell gems={profile?.gems}>
      <div className="pt-2">
        <div className="flex gap-2 mb-3">
          {(Object.keys(labels) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-sm font-bold tap-target ${
                tab === t ? "btn-brand text-white" : "bg-secondary"
              }`}
            >{labels[t].title}</button>
          ))}
        </div>

        {myRank && (
          <div className="card-soft p-3 mb-3 flex items-center justify-between">
            <div className="text-sm">Your rank</div>
            <div className="font-extrabold">#{myRank} · {myRankRow!.score} {labels[tab].unit}</div>
          </div>
        )}

        {isLoading && <div className="text-center text-muted-foreground py-8">Loading…</div>}

        <div className="space-y-2">
          {rows?.map((r, i) => (
            <div
              key={r.id}
              className={`card-soft p-3 flex items-center gap-3 ${r.id === profile?.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="w-8 text-center font-extrabold text-lg">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </div>
              <div className="size-10 rounded-full btn-brand flex items-center justify-center">👤</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{r.username}</div>
                <div className="text-xs text-muted-foreground truncate">{r.country ?? ""}</div>
              </div>
              <div className="font-extrabold text-primary">{r.score} {labels[tab].unit}</div>
            </div>
          ))}
          {rows?.length === 0 && !isLoading && (
            <div className="text-center text-sm text-muted-foreground py-8">No data yet — play some matches!</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
