import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Tap & Connect" },
      { name: "description", content: "Rules for using Tap & Connect." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-primary font-semibold">← Back</Link>
      <h1 className="text-3xl font-extrabold mt-4 mb-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: June 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <p>By creating an account on Tap & Connect you agree to these terms.</p>

        <h2 className="font-extrabold text-lg pt-2">Eligibility</h2>
        <p>You must be at least 18 years old. One account per person.</p>

        <h2 className="font-extrabold text-lg pt-2">Acceptable use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>No harassment, hate speech, nudity, threats, spam, scams, or illegal content.</li>
          <li>No impersonation, scraping, or automated play.</li>
          <li>No attempts to manipulate matchmaking, Gems, or leaderboards.</li>
          <li>Reported violations may result in suspension or permanent ban.</li>
        </ul>

        <h2 className="font-extrabold text-lg pt-2">Virtual Gems</h2>
        <p>Gems are an in-app virtual currency. They have no cash value, are non-refundable except where required by law, and cannot be transferred outside the app.</p>

        <h2 className="font-extrabold text-lg pt-2">Content & safety</h2>
        <p>You are responsible for what you send. We may remove content and accounts that violate these terms. Blocking another user is always available.</p>

        <h2 className="font-extrabold text-lg pt-2">Disclaimer</h2>
        <p>The service is provided "as is" without warranties. We are not liable for indirect or consequential damages.</p>

        <h2 className="font-extrabold text-lg pt-2">Changes</h2>
        <p>We may update these terms; continued use means you accept the changes.</p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        See also: <Link to="/privacy" className="text-primary font-semibold">Privacy Policy</Link>
      </p>
    </div>
  );
}
