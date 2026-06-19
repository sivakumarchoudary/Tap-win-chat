import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Tap & Connect" },
      { name: "description", content: "How Tap & Connect handles your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-primary font-semibold">← Back</Link>
      <h1 className="text-3xl font-extrabold mt-4 mb-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: June 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <p>Tap & Connect ("we", "us") respects your privacy. This policy explains what data we collect and how we use it.</p>

        <h2 className="font-extrabold text-lg pt-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account info: email, username, optional avatar and country.</li>
          <li>Gameplay data: matches, answers, Gem balance, streaks, badges, gifts.</li>
          <li>Messages you send to other matched users.</li>
          <li>Reports and blocks you submit for safety moderation.</li>
        </ul>

        <h2 className="font-extrabold text-lg pt-2">How we use it</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To run matchmaking, chat, leaderboards, and the Gem economy.</li>
          <li>To enforce safety rules and investigate abuse reports.</li>
          <li>To send transactional emails (sign-in, receipts).</li>
        </ul>

        <h2 className="font-extrabold text-lg pt-2">Your rights</h2>
        <p>You may request deletion of your account and associated data at any time by contacting support. Blocking another user prevents them from messaging you.</p>

        <h2 className="font-extrabold text-lg pt-2">Age requirement</h2>
        <p>You must be 18 or older to use Tap & Connect.</p>

        <h2 className="font-extrabold text-lg pt-2">Contact</h2>
        <p>Questions? Reach us at support@tapandconnect.app.</p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        See also: <Link to="/terms" className="text-primary font-semibold">Terms of Service</Link>
      </p>
    </div>
  );
}
