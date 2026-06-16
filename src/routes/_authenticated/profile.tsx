import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getMyProfile } from "@/lib/game.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });

  async function signOut() {
    await supabase.auth.signOut();
    toast("Signed out");
    navigate({ to: "/auth" });
  }

  function copyRef() {
    if (!profile?.referral_code) return;
    const link = `${window.location.origin}/?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  }

  return (
    <AppShell gems={profile?.gems}>
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="size-24 rounded-full btn-brand flex items-center justify-center text-4xl">👤</div>
        <div className="text-center">
          <div className="text-xl font-extrabold">{profile?.username}</div>
          <div className="text-xs text-muted-foreground">Member of Tap & Connect</div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          <Stat label="Gems" value={profile?.gems ?? 0} emoji="💎" />
          <Stat label="Streak" value={profile?.streak ?? 0} emoji="🔥" />
          <Stat label="Wins" value={profile?.total_matches_won ?? 0} emoji="🏆" />
          <Stat label="Gifts" value={profile?.total_gifts_sent ?? 0} emoji="🎁" />
        </div>

        <div className="card-soft p-4 w-full">
          <div className="text-xs text-muted-foreground">Your referral code</div>
          <div className="flex items-center justify-between mt-1">
            <div className="font-mono font-bold text-lg">{profile?.referral_code}</div>
            <button onClick={copyRef} className="text-sm font-semibold text-primary tap-target px-3">Copy link</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Invite a friend → both of you get 50 💎.</p>
        </div>

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
