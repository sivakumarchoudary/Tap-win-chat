import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: () => (
    <AppShell>
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🏆</div>
        <h2 className="text-2xl font-extrabold gradient-text">Leaderboard</h2>
        <p className="text-muted-foreground text-sm mt-2">Top players show here once we add the rankings query.</p>
      </div>
    </AppShell>
  ),
});
