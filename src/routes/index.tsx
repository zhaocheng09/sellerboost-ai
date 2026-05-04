import { createFileRoute, Link } from "@tanstack/react-router";
import { Wand2, Image as ImageIcon, Calculator, PackagePlus, Sparkles, TrendingUp } from "lucide-react";
import { useLocalStorage, type ActivityItem, type BusinessProfile, defaultProfile } from "@/lib/storage";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SellerAI" },
      { name: "description", content: "Your daily AI assistant for selling on Instagram, WhatsApp, Facebook and TikTok." },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK = [
  { to: "/studio", label: "Generate Caption", sub: "Tulis caption", icon: Wand2, tab: "caption" },
  { to: "/studio", label: "Create Poster", sub: "Buat poster", icon: ImageIcon, tab: "poster" },
  { to: "/calculator", label: "Calculate Profit", sub: "Kira untung", icon: Calculator },
  { to: "/inventory", label: "Update Stock", sub: "Update stok", icon: PackagePlus },
] as const;

function HomePage() {
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);

  const monthCount = activity.filter((a) => {
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (a.type === "caption" || a.type === "poster" || a.type === "blast");
  }).length;

  const name = profile.businessName?.trim() || "Seller";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">{name}! 👋</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Apa nak buat hari ini? Let's grow your business.
        </p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.label}
                to={q.to}
                search={"tab" in q ? { tab: q.tab } : undefined}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border p-4 shadow-card hover:shadow-soft transition-all active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center mb-3 shadow-soft">
                  <Icon className="h-5 w-5 text-brand-foreground" />
                </div>
                <div className="font-semibold text-sm">{q.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{q.sub}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-warm p-5 border border-accent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center shadow-soft">
            <TrendingUp className="h-5 w-5 text-brand" />
          </div>
          <div>
            <div className="text-xs text-accent-foreground/80 font-medium">This month</div>
            <div className="text-lg font-bold text-accent-foreground">
              {monthCount === 0 ? "Let's create your first post! 🚀" : `${monthCount} ${monthCount === 1 ? "post" : "posts"} created 🎉`}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent activity</h2>
        {activity.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Sparkles className="h-8 w-8 text-brand mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nothing yet — your generated captions and posters will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {activity.slice(0, 3).map((a) => (
              <Card key={a.id} className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-brand-soft flex items-center justify-center text-base shrink-0">
                  {a.type === "caption" ? "✍️" : a.type === "poster" ? "🎨" : a.type === "blast" ? "📣" : a.type === "product" ? "💰" : "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  {a.preview && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.preview}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}