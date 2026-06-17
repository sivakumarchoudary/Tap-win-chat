import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getMyProfile, getMyBadges, redeemReferral } from "@/lib/game.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const getBadges = useServerFn(getMyBadges);
  const redeem = useServerFn(redeemReferral);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const { data: badges } = useQuery({ queryKey: ["my-badges"], queryFn: () => getBadges() });
  const [code, setCode] = useState("");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function copyRef() {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${profile.referral_code}`);
    toast.success("Referral link copied");
  }

  async function handleRedeem() {
    if (!code.trim()) return;
    try {
      const r = await redeem({ data: { code: code.trim() } });
      if (r.ok) {
        toast.success("+50 💎 — referral redeemed!");
        setCode("");
        qc.invalidateQueries({ queryKey: ["my-profile"] });
      } else {
        toast.error(r.reason === "already_redeemed" ? "Already redeemed once"
                  : r.reason === "own_code" ? "That's your own code"
                  : "Code not found");
      }
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <AppShell gems={profile?.gems}>
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="size-24 rounded-full btn-brand flex items-center justify-center text-4xl">👤</div>
        <div className="text-center">
          <div className="text-xl font-extrabold">{profile?.username}</div>
          <div className="text-xs text-muted-foreground">{profile?.country ?? "Member of Tap & Connect"}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <Stat label="Gems" value={profile?.gems ?? 0} emoji="💎" />
          <Stat label="Streak" value={profile?.streak ?? 0} emoji="🔥" />
          <Stat label="Wins" value={profile?.total_matches_won ?? 0} emoji="🏆" />
          <Stat label="Gifts" value={profile?.total_gifts_sent ?? 0} emoji="🎁" />
        </div>

        {badges && badges.length > 0 && (
          <div className="card-soft p-3 w-full">
            <div className="text-xs text-muted-foreground mb-2">Your badges</div>
            <div className="flex flex-wrap gap-2">
              {badges.map((b: any) => (
                <span key={b.badge_id} className="text-2xl" title={b.badges?.name}>{b.badges?.emoji}</span>
              ))}
            </div>
          </div>
        )}

        <div className="card-soft p-4 w-full">
          <div className="text-xs text-muted-foreground">Your referral code</div>
          <div className="flex items-center justify-between mt-1">
            <div className="font-mono font-bold text-lg">{profile?.referral_code}</div>
            <button onClick={copyRef} className="text-sm font-semibold text-primary tap-target px-3">Copy link</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Invite a friend → both get 50 💎.</p>
        </div>

        {!profile?.referred_by && (
          <div className="card-soft p-4 w-full">
            <div className="text-xs text-muted-foreground mb-2">Got a friend's code?</div>
            <div className="flex gap-2">
              <input
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD123" maxLength={20}
                className="flex-1 rounded-full bg-secondary px-4 py-2 font-mono outline-none"
              />
              <button onClick={handleRedeem} className="btn-brand rounded-full px-4 font-bold tap-target">Redeem</button>
            </div>
          </div>
        )}

        <button onClick={signOut} className="mt-4 text-sm text-muted-foreground underline tap-target px-4 py-2">
          Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="card-soft p-3 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="font-extrabold text-lg">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
