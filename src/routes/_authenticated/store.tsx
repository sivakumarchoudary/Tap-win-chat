import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/store")({
  component: () => (
    <AppShell>
      <div className="text-center py-16">
        <div className="text-5xl mb-3">💎</div>
        <h2 className="text-2xl font-extrabold gradient-text">Gem Store</h2>
        <p className="text-muted-foreground text-sm mt-2">Coming in the next update — real Stripe checkout.</p>
      </div>
    </AppShell>
  ),
});
