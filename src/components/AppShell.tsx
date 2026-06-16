import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children, gems }: { children: ReactNode; gems?: number | null }) {
  const loc = useLocation();
  const items = [
    { to: "/home", label: "Play", Icon: Home },
    { to: "/store", label: "Store", Icon: ShoppingBag },
    { to: "/leaderboard", label: "Ranks", Icon: Trophy },
    { to: "/profile", label: "Me", Icon: User },
  ];
  return (
    <div className="min-h-[100svh] flex flex-col bg-background pb-[88px]">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <div className="font-extrabold text-lg gradient-text">Tap & Connect</div>
          {typeof gems === "number" && (
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-bold">
              <span>💎</span>
              <span className="tabular-nums">{gems}</span>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {items.map(({ to, label, Icon }) => {
            const active = loc.pathname === to || (to === "/home" && loc.pathname === "/");
            return (
              <Link
                key={to} to={to}
                className={`flex flex-col items-center gap-1 py-3 tap-target text-xs font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
