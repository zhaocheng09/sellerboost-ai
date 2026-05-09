import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage, type ActivityItem, type SavedProduct, type StockEntry } from "@/lib/storage";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — SellerAI" },
      { name: "description", content: "Simple stock tracker for small Malaysian sellers." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t } = useT();
  const [savedProducts] = useLocalStorage<SavedProduct[]>("sellerai.savedProducts", []);
  const [entries, setEntries] = useLocalStorage<StockEntry[]>("sellerai.stock", []);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);

  const [product, setProduct] = useState("");
  const [stock, setStock] = useState<number>(0);
  const [sold, setSold] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const lowStock = entries.filter((e) => e.stock - e.soldToday < 5);
  const todaySold = entries.reduce((s, e) => s + e.soldToday, 0);

  // Weekly: count entries from last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = entries.filter((e) => e.updatedAt >= weekAgo);
  const weekSold = weekEntries.reduce((s, e) => s + e.soldToday, 0);
  const weekProducts = new Set(weekEntries.map((e) => e.product)).size;

  function add() {
    if (!product.trim()) { toast.error(t("t.pickProduct")); return; }
    const next: StockEntry = { id: crypto.randomUUID(), product, stock, soldToday: sold, notes, updatedAt: Date.now() };
    setEntries([next, ...entries].slice(0, 100));
    pushActivity(activity, setActivity, { type: "stock", title: `Stock: ${product}`, preview: `+${stock} added, ${sold} sold today` });
    setProduct(""); setStock(0); setSold(0); setNotes("");
    toast.success(t("t.stockUpdated"));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{t("inv.title")} 📦</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("inv.sub")}</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("inv.products")}</div>
          <div className="text-2xl font-bold mt-1">{new Set(entries.map((e) => e.product)).size}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("inv.soldToday")}</div>
          <div className="text-2xl font-bold mt-1">{todaySold}</div>
        </Card>
        <Card className={`p-4 ${lowStock.length > 0 ? "border-warning bg-warning/5" : ""}`}>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("inv.lowStock")}</div>
          <div className="text-2xl font-bold mt-1 flex items-center gap-1">{lowStock.length} {lowStock.length > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}</div>
        </Card>
      </div>

      {/* Add form */}
      <Card className="p-5 space-y-4">
        <div className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> {t("inv.add")}</div>
        <div>
          <Label htmlFor="prod">{t("inv.product")}</Label>
          {savedProducts.length > 0 ? (
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("inv.pickSaved")} /></SelectTrigger>
              <SelectContent>
                {savedProducts.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
          <Input id="prod" value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("inv.orType")} className="mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="st">{t("inv.stockAdded")}</Label>
            <Input id="st" type="number" inputMode="numeric" value={stock || ""} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="mt-1.5" placeholder="0" />
          </div>
          <div>
            <Label htmlFor="sd">{t("inv.soldToday")}</Label>
            <Input id="sd" type="number" inputMode="numeric" value={sold || ""} onChange={(e) => setSold(parseInt(e.target.value) || 0)} className="mt-1.5" placeholder="0" />
          </div>
        </div>
        <div>
          <Label htmlFor="nt">{t("inv.notes")} <span className="text-muted-foreground">{t("f.optional")}</span></Label>
          <Input id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. fresh batch, restock Friday" className="mt-1.5" />
        </div>
        <Button onClick={add} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-11 font-semibold shadow-soft">
          {t("inv.saveEntry")}
        </Button>
      </Card>

      {/* Weekly */}
      {weekSold > 0 && (
        <Card className="p-5 bg-teal-soft border-secondary/20">
          <div className="text-xs uppercase tracking-wider font-semibold text-secondary">{t("inv.thisWeek")}</div>
          <div className="text-base font-semibold mt-1">{weekSold} × {weekProducts} 🎉</div>
        </Card>
      )}

      {/* Recent entries */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("inv.recent")}</h2>
        {entries.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Package className="h-8 w-8 text-brand mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("inv.empty")}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 10).map((e) => {
              const remaining = e.stock - e.soldToday;
              const isLow = remaining < 5;
              return (
                <Card key={e.id} className="p-4 flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isLow ? "bg-warning/20" : "bg-brand-soft"}`}>
                    {isLow ? <AlertTriangle className="h-4 w-4 text-warning" /> : <Package className="h-4 w-4 text-brand" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.product}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">+{e.stock} stock · {e.soldToday} sold · {remaining} left</div>
                    {e.notes && <div className="text-xs text-muted-foreground italic mt-1">{e.notes}</div>}
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(e.updatedAt).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEntries(entries.filter((x) => x.id !== e.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function pushActivity(activity: ActivityItem[], setActivity: (v: ActivityItem[]) => void, item: Omit<ActivityItem, "id" | "createdAt">) {
  const next: ActivityItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  setActivity([next, ...activity].slice(0, 30));
}