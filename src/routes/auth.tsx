import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age18, setAge18] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !age18) {
      toast.error("You must confirm you're 18 or older.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) throw error;
        toast.success("Welcome! Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/home" });
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup" && !age18) {
      toast.error("You must confirm you're 18 or older.");
      return;
    }
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/home" });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-[100svh] flex flex-col p-6 bg-background">
      <div className="text-center mb-6 pt-4">
        <h1 className="text-3xl font-extrabold gradient-text">Tap & Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">{mode === "signup" ? "Create your account" : "Welcome back"}</p>
      </div>

      <form onSubmit={handleEmail} className="space-y-3 w-full max-w-sm mx-auto">
        <input
          type="email" required placeholder="you@example.com" value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email"
          className="w-full rounded-2xl bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring tap-target"
        />
        <input
          type="password" required placeholder="Password (min 6 chars)" minLength={6} value={password}
          onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="w-full rounded-2xl bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring tap-target"
        />
        {mode === "signup" && (
          <label className="flex items-start gap-2 text-sm text-muted-foreground py-2">
            <input type="checkbox" checked={age18} onChange={e => setAge18(e.target.checked)} className="mt-1 size-5" />
            <span>I confirm I'm 18 years or older and agree to fair-play rules.</span>
          </label>
        )}
        <button disabled={loading} className="btn-brand w-full rounded-full py-4 font-bold text-lg tap-target disabled:opacity-60">
          {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="w-full max-w-sm mx-auto mt-4">
        <div className="flex items-center gap-3 my-3 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
        </div>
        <button
          onClick={handleGoogle} disabled={loading}
          className="w-full rounded-full bg-card border border-border py-3 font-semibold tap-target disabled:opacity-60"
        >
          Continue with Google
        </button>
      </div>

      <div className="text-center mt-6 text-sm">
        {mode === "signup" ? (
          <>Already have an account? <button onClick={() => setMode("signin")} className="font-semibold text-primary">Sign in</button></>
        ) : (
          <>New here? <button onClick={() => setMode("signup")} className="font-semibold text-primary">Create account</button></>
        )}
      </div>

      <div className="text-center mt-6 text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline">Terms</a> and{" "}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </div>
    </div>
  );
}

