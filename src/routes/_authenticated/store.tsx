import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getMyProfile, spendGems } from "@/lib/game.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/store")({
  component: StorePage,
});

type SpendId = "boost" | "mystery" | "streak_saver" | "badge_legend" | "badge_og" | "badge_platinum" | "badge_globetrotter";
type Item = { id: SpendId; title: string; price: number; emoji: string; desc: string };

const SPENDS: Item[] = [
  { id: "boost",              title: "Profile Boost",      price: 50,  emoji: "🚀", desc: "3× visibility for 1 hour" },
  { id: "mystery",            title: "Mystery Box",        price: 25,  emoji: "🎁", desc: "Win 5–100 💎 (10% jackpot)" },
  { id: "streak_saver",       title: "Streak Saver",       price: 20,  emoji: "🛟", desc: "Save your daily streak" },
  { id: "badge_legend",       title: "Legend Badge",       price: 100, emoji: "🏆", desc: "Show off on your profile" },
  { id: "badge_og",           title: "OG Badge",           price: 100, emoji: "💎", desc: "Exclusive identity flex" },
  { id: "badge_platinum",     title: "Platinum Badge",     price: 100, emoji: "🥇", desc: "Premium status" },
  { id: "badge_globetrotter", title: "Globetrotter Badge", price: 100, emoji: "🌍", desc: "Worldwide vibes" },
];

const PACKS = [
  { gems: 100,  price: "€0.99" },
  { gems: 600,  price: "€4.99" },
  { gems: 1500, price: "€9.99" },
];

function StorePage() {
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const spend = useServerFn(spendGems);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  async function handleSpend(item: Item) {
    try {
      const r = await spend({ data: { item: item.id } });
      toast.success(r.message ?? "Done");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <AppShell gems={profile?.gems}>
      <div className="pt-2 space-y-6">
        <section>
          <h2 className="font-extrabold text-lg mb-2">💎 Buy Gems</h2>
          <div className="grid grid-cols-3 gap-2">
            {PACKS.map((p) => (
              <button
                key={p.gems}
                onClick={() => toast("Stripe checkout coming next 🚧")}
                className="card-soft p-3 text-center tap-target active:scale-95 transition-transform"
              >
                <div className="text-2xl">💎</div>
                <div className="font-extrabold">{p.gems}</div>
                <div className="text-xs font-bold text-primary">{p.price}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Real Stripe checkout enables once payments are configured.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-lg mb-2">Spend your Gems</h2>
          <div className="grid grid-cols-1 gap-2">
            {SPENDS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSpend(s)}
                className="card-soft p-3 flex items-center gap-3 text-left tap-target active:scale-[0.98] transition-transform"
              >
                <div className="text-3xl">{s.emoji}</div>
                <div className="flex-1">
                  <div className="font-extrabold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
                <div className="font-bold text-primary whitespace-nowrap">{s.price} 💎</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
