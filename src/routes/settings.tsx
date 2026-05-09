import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage, type BusinessProfile, defaultProfile } from "@/lib/storage";
import { useT, LANGS } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SellerAI" },
      { name: "description", content: "Theme, language, and your business profile." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("sellerai.theme", "light");
  const [profile, setProfile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const { t, lang, setLang } = useT();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  function clearAll() {
    if (!confirm(t("set.clearConfirm"))) return;
    ["sellerai.profile", "sellerai.activity", "sellerai.savedCaptions", "sellerai.savedProducts", "sellerai.stock"].forEach((k) => localStorage.removeItem(k));
    toast.success(t("set.cleared"));
    setTimeout(() => location.reload(), 400);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{t("set.title")} ⚙️</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("set.sub")}</p>
      </header>

      {/* Theme */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-brand" /> : <Sun className="h-5 w-5 text-brand" />}
            <div>
              <div className="font-semibold">{t("set.darkMode")}</div>
              <div className="text-xs text-muted-foreground">{theme === "dark" ? t("set.dark") : t("set.light")}</div>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
        </div>
      </Card>

      {/* App Language */}
      <Card className="p-5 space-y-3">
        <div>
          <div className="font-semibold">{t("set.appLang")}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t("set.appLangSub")}</div>
        </div>
        <div className="grid gap-2">
          {LANGS.map((opt) => {
            const active = lang === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLang(opt.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  active ? "bg-brand-soft border-brand text-accent-foreground shadow-soft" : "bg-card border-border hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{opt.flag}</span>
                <span className="font-medium">{opt.label}</span>
                {active && <span className="ml-auto text-brand">✓</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Business profile */}
      <Card className="p-5 space-y-4">
        <div>
          <div className="font-semibold">{t("set.profile")}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t("set.profileSub")}</div>
        </div>
        <div>
          <Label htmlFor="bn">{t("set.bizName")}</Label>
          <Input id="bn" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} placeholder="e.g. Kak Mira's Kuih" className="mt-1.5" />
        </div>
        <div>
          <Label>{t("set.whatSell")}</Label>
          <Select value={profile.category} onValueChange={(v) => setProfile({ ...profile, category: v as BusinessProfile["category"] })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Baked Goods">{t("cat.baked")}</SelectItem>
              <SelectItem value="Handcraft">{t("cat.handcraft")}</SelectItem>
              <SelectItem value="Fresh Produce">{t("cat.fresh")}</SelectItem>
              <SelectItem value="Clothing">{t("cat.clothing")}</SelectItem>
              <SelectItem value="Other">{t("cat.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("set.platform")}</Label>
          <Select value={profile.platform} onValueChange={(v) => setProfile({ ...profile, platform: v as BusinessProfile["platform"] })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => toast.success(t("set.profileSaved"))} className="bg-brand text-brand-foreground hover:bg-brand/90 w-full">{t("set.saveProfile")}</Button>
      </Card>

      {/* Clear data */}
      <Card className="p-5">
        <Button variant="ghost" onClick={clearAll} className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full">
          <Trash2 className="h-4 w-4 mr-2" /> {t("set.clear")}
        </Button>
      </Card>

      {/* About */}
      <Card className="p-5 text-center text-xs text-muted-foreground">
        <div className="font-semibold text-foreground text-sm">SellerAI · v1.0</div>
        <div className="mt-1">Built for Malaysian micro-entrepreneurs ❤️</div>
      </Card>
    </div>
  );
}