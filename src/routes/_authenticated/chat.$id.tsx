import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatThread, sendMessage, sendGift, blockUser, reportUser, getMyProfile } from "@/lib/game.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; body: string; type: "text" | "gift"; created_at: string };

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const load = useServerFn(getChatThread);
  const send = useServerFn(sendMessage);
  const gift = useServerFn(sendGift);
  const block = useServerFn(blockUser);
  const report = useServerFn(reportUser);
  const getProfile = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const { data: thread, refetch } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => load({ data: { matchId: id } }),
  });

  const [text, setText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase.channel(`chat-${id}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${id}` },
      () => refetch(),
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, refetch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    try { await send({ data: { matchId: id, body } }); refetch(); }
    catch (err: any) { toast.error(err.message); }
  }

  async function handleGift(g: "rose" | "fire") {
    try {
      const r = await gift({ data: { matchId: id, gift: g } });
      toast.success(`Sent ${g === "rose" ? "🌹" : "🔥"} (-10 💎)`);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      refetch();
      void r;
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleBlock() {
    if (!thread?.other) return;
    if (!confirm("Block this user? You won't be matched again.")) return;
    await block({ data: { userId: thread.other.id } });
    toast("User blocked");
    navigate({ to: "/home" });
  }

  async function handleReport() {
    if (!thread?.other || reason.trim().length < 3) return;
    await report({ data: { userId: thread.other.id, matchId: id, reason } });
    setReportOpen(false); setReason("");
    toast.success("Report submitted");
  }

  const other = thread?.other;
  const me = profile?.id;

  return (
    <AppShell gems={profile?.gems}>
      <div className="flex flex-col h-[calc(100svh-160px)]">
        <div className="card-soft p-3 flex items-center gap-3 mb-2">
          <div className="size-10 rounded-full btn-brand flex items-center justify-center">👤</div>
          <div className="flex-1">
            <div className="font-extrabold">{other?.username ?? "…"}</div>
            <div className="text-xs text-muted-foreground">{other?.country ?? ""}</div>
          </div>
          <button onClick={() => setReportOpen(true)} className="text-xs px-2 py-1 rounded-full bg-secondary tap-target">Report</button>
          <button onClick={handleBlock} className="text-xs px-2 py-1 rounded-full bg-destructive/15 text-destructive tap-target">Block</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pb-2">
          {thread?.messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">Say hi 👋</div>
          )}
          {thread?.messages.map((m: Msg) => {
            const mine = m.sender_id === me;
            const isGift = m.type === "gift";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isGift ? "bg-accent text-accent-foreground italic" :
                    mine ? "btn-brand text-white" : "bg-secondary"
                  }`}
                >{m.body}</div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={() => handleGift("rose")} className="flex-1 rounded-full bg-secondary py-2 text-sm font-semibold tap-target">🌹 Rose (10💎)</button>
          <button onClick={() => handleGift("fire")} className="flex-1 rounded-full bg-secondary py-2 text-sm font-semibold tap-target">🔥 Fire (10💎)</button>
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Message…" maxLength={500}
            className="flex-1 rounded-full bg-secondary px-4 py-3 outline-none"
          />
          <button type="submit" className="btn-brand rounded-full px-5 font-bold tap-target">Send</button>
        </form>

        {reportOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
            <div className="card-soft p-4 w-full max-w-sm">
              <h3 className="font-extrabold mb-2">Report user</h3>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="What happened?" maxLength={300} rows={4}
                className="w-full rounded-xl bg-secondary p-3 outline-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setReportOpen(false)} className="flex-1 rounded-full bg-secondary py-2 font-semibold">Cancel</button>
                <button onClick={handleReport} className="flex-1 btn-brand rounded-full py-2 font-bold">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
