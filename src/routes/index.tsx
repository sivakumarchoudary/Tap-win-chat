import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
  },
  component: Landing,
});

function Landing() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-between p-6 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-soft)", opacity: 0.6 }} />
      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className={mounted ? "animate-bounce-in" : "opacity-0"}>
          <div className="text-7xl mb-2">👋</div>
          <h1 className="text-5xl font-extrabold gradient-text leading-tight">Tap & Connect</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xs">
            Match a stranger in 3 seconds. Tap your answer. Win Gems. Chat.
          </p>
        </div>
        <div className="flex gap-3 text-3xl">
          <span>🎯</span><span>💎</span><span>🔥</span><span>💬</span>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-md space-y-3 pb-4">
        <Link to="/auth" className="btn-brand block rounded-full text-center py-4 font-bold text-lg tap-target">
          Get Started
        </Link>
        <Link to="/auth" search={{ mode: "signin" } as never} className="block text-center py-3 text-sm text-muted-foreground">
          I already have an account
        </Link>
      </div>
    </div>
  );
}
