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

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  function clearAll() {
    if (!confirm("Delete all saved data (profile, products, captions, stock)? This can't be undone.")) return;
    ["sellerai.profile", "sellerai.activity", "sellerai.savedCaptions", "sellerai.savedProducts", "sellerai.stock"].forEach((k) => localStorage.removeItem(k));
    toast.success("All data cleared");
    setTimeout(() => location.reload(), 400);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Settings ⚙️</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalise your SellerAI experience.</p>
      </header>

      {/* Theme */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-brand" /> : <Sun className="h-5 w-5 text-brand" />}
            <div>
              <div className="font-semibold">Dark mode</div>
              <div className="text-xs text-muted-foreground">{theme === "dark" ? "Currently dark 🌙" : "Currently light ☀️"}</div>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
        </div>
      </Card>

      {/* Language */}
      <Card className="p-5 space-y-3">
        <Label>Language preference</Label>
        <Select value={profile.language} onValueChange={(v) => setProfile({ ...profile, language: v as "en" | "ms" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ms">Bahasa Malaysia</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Business profile */}
      <Card className="p-5 space-y-4">
        <div>
          <div className="font-semibold">Business profile</div>
          <div className="text-xs text-muted-foreground mt-0.5">We use this to personalise AI outputs.</div>
        </div>
        <div>
          <Label htmlFor="bn">Business name</Label>
          <Input id="bn" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} placeholder="e.g. Kak Mira's Kuih" className="mt-1.5" />
        </div>
        <div>
          <Label>What do you sell?</Label>
          <Select value={profile.category} onValueChange={(v) => setProfile({ ...profile, category: v as BusinessProfile["category"] })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Baked Goods">Baked Goods</SelectItem>
              <SelectItem value="Handcraft">Handcraft</SelectItem>
              <SelectItem value="Fresh Produce">Fresh Produce</SelectItem>
              <SelectItem value="Clothing">Clothing</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Primary platform</Label>
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
        <Button onClick={() => toast.success("Profile saved! 🎉")} className="bg-brand text-brand-foreground hover:bg-brand/90 w-full">Save profile</Button>
      </Card>

      {/* Clear data */}
      <Card className="p-5">
        <Button variant="ghost" onClick={clearAll} className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full">
          <Trash2 className="h-4 w-4 mr-2" /> Clear all saved data
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