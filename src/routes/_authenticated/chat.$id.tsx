import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
});

function ChatPage() {
  return (
    <AppShell>
      <div className="text-center py-16">
        <div className="text-5xl mb-3">💬</div>
        <h2 className="text-2xl font-extrabold gradient-text">Chat</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Live chat ships in the next iteration. Your match is unlocked — come back soon!
        </p>
        <Link to="/home" className="btn-brand rounded-full px-6 py-3 mt-6 inline-block font-bold tap-target">
          Back home
        </Link>
      </div>
    </AppShell>
  );
}
