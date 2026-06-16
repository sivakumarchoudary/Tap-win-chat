import { createFileRoute, useNavigate, useServerFn } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getMatchState, submitAnswer, settleMatch } from "@/lib/game.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/match/$id")({
  component: MatchPage,
});

type Phase = "countdown" | "question" | "waiting" | "result";

function MatchPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getState = useServerFn(getMatchState);
  const answerFn = useServerFn(submitAnswer);
  const settleFn = useServerFn(settleMatch);

  const [state, setState] = useState<Awaited<ReturnType<typeof getMatchState>> | null>(null);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(3);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const settled = useRef(false);

  // initial fetch
  useEffect(() => {
    getState({ data: { matchId: id } }).then(setState).catch(() => navigate({ to: "/home" }));
  }, [id, getState, navigate]);

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) { setPhase("question"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Answer window timer (3s after countdown)
  useEffect(() => {
    if (phase !== "question") return;
    const t = setTimeout(async () => {
      if (settled.current) return;
      settled.current = true;
      const r = await settleFn({ data: { matchId: id } });
      if (r.status === "completed") {
        const s = await getState({ data: { matchId: id } });
        setState(s);
        setPhase("result");
      } else {
        setPhase("waiting");
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, id, settleFn, getState]);

  // Subscribe to realtime match updates
  useEffect(() => {
    const channel = supabase
      .channel(`match-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
        async () => {
          const s = await getState({ data: { matchId: id } });
          setState(s);
          if (s.status === "completed") setPhase("result");
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, getState]);

  async function pick(choice: "a" | "b") {
    if (picked) return;
    setPicked(choice);
    const r = await answerFn({ data: { matchId: id, choice } });
    if (r.status === "completed") {
      const s = await getState({ data: { matchId: id } });
      setState(s);
      setPhase("result");
    } else {
      setPhase("waiting");
    }
  }

  if (!state) {
    return <div className="min-h-[100svh] flex items-center justify-center bg-background">Loading…</div>;
  }

  if (phase === "countdown") {
    return (
      <Stage>
        <div className="text-9xl font-extrabold gradient-text animate-pulse-big tabular-nums">
          {count > 0 ? count : "GO!"}
        </div>
        <p className="mt-4 text-muted-foreground">Get ready…</p>
      </Stage>
    );
  }

  if (phase === "question") {
    const q = state.question!;
    return (
      <Stage>
        <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
          This or that?
        </div>
        <h2 className="text-2xl font-extrabold text-center mb-6">Pick fast!</h2>
        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
          <ChoiceButton label={q.option_a} disabled={!!picked} picked={picked === "a"} onClick={() => pick("a")} variant="purple" />
          <div className="text-center text-xs uppercase text-muted-foreground">— or —</div>
          <ChoiceButton label={q.option_b} disabled={!!picked} picked={picked === "b"} onClick={() => pick("b")} variant="coral" />
        </div>
        <div className="mt-6 text-xs text-muted-foreground animate-pulse">⏱ 3 seconds</div>
      </Stage>
    );
  }

  if (phase === "waiting") {
    return (
      <Stage>
        <div className="text-6xl mb-4 animate-pulse">⏳</div>
        <h2 className="text-xl font-bold">Waiting for the other player…</h2>
      </Stage>
    );
  }

  // Result
  const { gemsAwarded, unlocked, otherProfile, myAnswer, otherAnswer } = state;
  const win = gemsAwarded > 0;
  return (
    <Stage>
      {win && <CoinShower />}
      <div className="animate-bounce-in text-center w-full max-w-sm">
        <div className="text-6xl mb-2">{win ? (gemsAwarded === 5 ? "🎉" : "💪") : "⏳"}</div>
        <h2 className="text-2xl font-extrabold gradient-text">
          {gemsAwarded === 5 ? "You both win!" : gemsAwarded === 3 ? "You win!" : "Try again"}
        </h2>
        {win && (
          <div className="mt-2 text-lg font-bold">+{gemsAwarded} 💎</div>
        )}
        {(myAnswer || otherAnswer) && state.question && (
          <div className="mt-4 text-sm text-muted-foreground">
            You: <b>{myAnswer ? (myAnswer === "a" ? state.question.option_a : state.question.option_b) : "—"}</b>
            <br />
            Them: <b>{otherAnswer ? (otherAnswer === "a" ? state.question.option_a : state.question.option_b) : "—"}</b>
          </div>
        )}

        {unlocked && otherProfile && (
          <div className="card-soft p-4 mt-6 text-center">
            <div className="text-4xl mb-2">👤</div>
            <div className="font-extrabold text-lg">{otherProfile.username}</div>
            {otherProfile.country && <div className="text-xs text-muted-foreground">{otherProfile.country}</div>}
            {otherProfile.bio && <div className="text-sm mt-2">{otherProfile.bio}</div>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link
                to="/chat/$id" params={{ id }}
                className="btn-brand rounded-full py-3 font-bold tap-target"
              >
                Chat 💬
              </Link>
              <Link to="/home" className="rounded-full bg-secondary py-3 font-bold tap-target">
                Next ➡️
              </Link>
            </div>
          </div>
        )}
        {!unlocked && (
          <div className="mt-6">
            <Link to="/home" className="btn-brand rounded-full px-6 py-3 font-bold tap-target inline-block">
              Try again
            </Link>
          </div>
        )}
      </div>
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-soft)", opacity: 0.5 }} />
      <div className="relative z-10 flex flex-col items-center w-full">{children}</div>
    </div>
  );
}

function ChoiceButton({ label, onClick, disabled, picked, variant }: {
  label: string; onClick: () => void; disabled?: boolean; picked?: boolean;
  variant: "purple" | "coral";
}) {
  const bg = variant === "purple"
    ? "linear-gradient(135deg, oklch(0.62 0.22 285), oklch(0.55 0.24 285))"
    : "linear-gradient(135deg, oklch(0.72 0.21 25), oklch(0.65 0.23 18))";
  return (
    <button
      disabled={disabled} onClick={onClick}
      style={{ background: bg }}
      className={`text-white text-2xl font-extrabold rounded-3xl py-8 tap-target transition-all active:scale-95 ${
        picked ? "ring-4 ring-white/40 scale-105" : ""
      } ${disabled && !picked ? "opacity-40" : ""}`}
    >
      {label}
    </button>
  );
}

function CoinShower() {
  const coins = Array.from({ length: 24 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {coins.map((_, i) => (
        <span
          key={i}
          className="absolute text-3xl animate-coin-fall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.6}s`,
            top: "-40px",
          }}
        >💎</span>
      ))}
    </div>
  );
}
