import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, Wand2, Calculator, Package, Settings, Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocalStorage } from "@/lib/storage";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/studio", label: "Studio", icon: Wand2 },
  { to: "/calculator", label: "Profit", icon: Calculator },
  { to: "/inventory", label: "Stock", icon: Package },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [theme] = useLocalStorage<"light" | "dark">("sellerai.theme", "light");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 border-r border-border bg-sidebar flex-col p-5 gap-1 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-soft">
            <Sparkles className="h-5 w-5 text-brand-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">SellerAI</div>
            <div className="text-xs text-muted-foreground mt-0.5">AI Kedai 🇲🇾</div>
          </div>
        </Link>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border-l-[3px] ${
                active
                  ? "bg-brand-soft text-accent-foreground border-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto text-xs text-muted-foreground px-2">
          Built for Malaysian micro-entrepreneurs ❤️
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <div className={`h-6 w-6 flex items-center justify-center rounded-lg ${active ? "bg-brand-soft" : ""}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Quick Generate */}
      {!path.startsWith("/studio") && (
        <Link
          to="/studio"
          search={{ tab: "caption" }}
          aria-label="Quick generate caption"
          className="fixed right-4 bottom-20 md:bottom-6 z-30 h-14 w-14 rounded-full bg-gradient-brand text-brand-foreground flex items-center justify-center shadow-soft hover:scale-105 active:scale-95 transition-transform"
        >
          <Zap className="h-6 w-6" />
        </Link>
      )}

      <Toaster position="top-center" />
    </div>
  );
}