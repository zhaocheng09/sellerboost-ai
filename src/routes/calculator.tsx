import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Sparkles, Lightbulb, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage, type ActivityItem, type BusinessProfile, type SavedProduct, defaultProfile } from "@/lib/storage";
import { callAI } from "@/lib/ai";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Profit Calculator — SellerAI" },
      { name: "description", content: "Step-by-step profit and pricing calculator for Malaysian small sellers." },
    ],
  }),
  component: CalcPage,
});

const COMMON_INGREDIENTS = ["Tepung", "Gula", "Mentega", "Telur", "Packaging", "Gas", "Sticker label"];

type Ing = { name: string; cost: number };

function CalcPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Business Calculator 💰</h1>
        <p className="text-sm text-muted-foreground mt-1">Know your numbers, price with confidence.</p>
      </header>
      <Tabs defaultValue="profit">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="profit">Profit Calculator</TabsTrigger>
          <TabsTrigger value="saved">Saved Products</TabsTrigger>
        </TabsList>
        <TabsContent value="profit" className="mt-5"><ProfitTab /></TabsContent>
        <TabsContent value="saved" className="mt-5"><SavedTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfitTab() {
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [saved, setSaved] = useLocalStorage<SavedProduct[]>("sellerai.savedProducts", []);

  const [name, setName] = useState("");
  const [ings, setIngs] = useState<Ing[]>([{ name: "", cost: 0 }]);
  const [units, setUnits] = useState<number>(0);
  const [extra, setExtra] = useState<number>(0);
  const [tip, setTip] = useState<string>("");
  const [tipLoading, setTipLoading] = useState(false);

  const ingTotal = ings.reduce((s, i) => s + (Number(i.cost) || 0), 0);
  const totalCost = ingTotal + (Number(extra) || 0);
  const perUnit = units > 0 ? totalCost / units : 0;

  const margins = [40, 60, 80].map((m) => {
    const price = perUnit > 0 ? perUnit / (1 - m / 100) : 0;
    return { m, price, profit: price - perUnit };
  });

  const packagingCost = ings.find((i) => i.name.toLowerCase().includes("packaging"))?.cost || 0;
  const packagingPct = totalCost > 0 ? (packagingCost / totalCost) * 100 : 0;

  function addIng() { setIngs([...ings, { name: "", cost: 0 }]); }
  function removeIng(i: number) { setIngs(ings.filter((_, idx) => idx !== i)); }
  function updateIng(i: number, patch: Partial<Ing>) {
    setIngs(ings.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function getAITip() {
    setTipLoading(true);
    try {
      const { result } = await callAI("tip", { breakdown: { ingredients: ings, units, extra, totalCost } }, profile);
      setTip(typeof result === "string" ? result : JSON.stringify(result));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get tip");
    } finally {
      setTipLoading(false);
    }
  }

  function saveProduct() {
    if (!name.trim() || units <= 0) { toast.error("Add product name and unit count"); return; }
    const next: SavedProduct = { id: crypto.randomUUID(), name, ingredients: ings.filter((i) => i.name), units, extraCosts: extra, createdAt: Date.now() };
    setSaved([next, ...saved].slice(0, 50));
    pushActivity(activity, setActivity, { type: "product", title: `Saved: ${name}`, preview: `RM ${perUnit.toFixed(2)}/unit` });
    toast.success("Product saved! 🎉");
  }

  return (
    <div className="space-y-5">
      {/* Step 1 */}
      <Card className="p-5">
        <Step n={1} label="What are you selling?" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kuih Lapis Pandan" className="mt-3" />
      </Card>

      {/* Step 2 */}
      <Card className="p-5">
        <Step n={2} label="Add your ingredients & materials" />
        <div className="space-y-2 mt-3">
          {ings.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input value={it.name} onChange={(e) => updateIng(i, { name: e.target.value })} placeholder="Item" className="flex-1" />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
                <Input type="number" inputMode="decimal" value={it.cost || ""} onChange={(e) => updateIng(i, { cost: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="pl-9" />
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeIng(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addIng} className="mt-3"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add item</Button>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {COMMON_INGREDIENTS.map((s) => (
            <button key={s} onClick={() => setIngs([...ings, { name: s, cost: 0 }])}
              className="text-xs px-2 py-1 rounded-md bg-brand-soft text-accent-foreground hover:opacity-80 transition-opacity">
              + {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 3 */}
      <Card className="p-5">
        <Step n={3} label="How many units does this batch make?" />
        <Input type="number" inputMode="numeric" value={units || ""} onChange={(e) => setUnits(parseInt(e.target.value) || 0)} placeholder="e.g. 24" className="mt-3" />
      </Card>

      {/* Step 4 */}
      <Card className="p-5">
        <Step n={4} label="Any other costs?" sub="delivery, sticker labels, marketing — optional" />
        <div className="relative mt-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
          <Input type="number" inputMode="decimal" value={extra || ""} onChange={(e) => setExtra(parseFloat(e.target.value) || 0)} placeholder="0.00" className="pl-9" />
        </div>
      </Card>

      {/* Results */}
      {units > 0 && totalCost > 0 && (
        <Card className="p-5 bg-gradient-warm border-accent space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-accent-foreground/80">Cost per unit</div>
            <div className="text-3xl font-extrabold text-accent-foreground mt-1">RM {perUnit.toFixed(2)}</div>
            <div className="text-xs text-accent-foreground/70 mt-1">Batch total: RM {totalCost.toFixed(2)} ÷ {units} units</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-accent-foreground/80 mb-2">Suggested selling price</div>
            <div className="grid grid-cols-3 gap-2">
              {margins.map((m) => (
                <div key={m.m} className="rounded-xl bg-card p-3 text-center shadow-card">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.m}% margin</div>
                  <div className="text-lg font-bold mt-1">RM {m.price.toFixed(2)}</div>
                  <div className="text-[11px] text-success font-medium mt-0.5">+RM {m.profit.toFixed(2)}/unit</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-accent-foreground/80 mb-2">Cost breakdown</div>
            <CostBar ings={ings} extra={extra} totalCost={totalCost} />
          </div>

          {tip ? (
            <div className="rounded-xl bg-card p-3 flex gap-2 items-start">
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{tip}</p>
            </div>
          ) : packagingPct > 25 ? (
            <div className="rounded-xl bg-card p-3 flex gap-2 items-start">
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">Your packaging cost is {packagingPct.toFixed(0)}% of total — consider buying in bulk to reduce cost.</p>
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={getAITip} disabled={tipLoading} variant="outline" size="sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {tipLoading ? "Thinking..." : "Get AI tip"}
            </Button>
            <Button onClick={saveProduct} className="bg-brand text-brand-foreground hover:bg-brand/90" size="sm">
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save this product
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Step({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full bg-brand text-brand-foreground text-sm font-bold flex items-center justify-center shrink-0">{n}</div>
      <div>
        <div className="font-semibold">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function CostBar({ ings, extra, totalCost }: { ings: Ing[]; extra: number; totalCost: number }) {
  const palette = ["#F59E0B", "#FB923C", "#FBBF24", "#0F766E", "#14B8A6", "#84CC16", "#A78BFA"];
  const items = [...ings.filter((i) => i.cost > 0), ...(extra > 0 ? [{ name: "Other", cost: extra }] : [])];
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {items.map((it, i) => (
          <div key={i} style={{ width: `${(it.cost / totalCost) * 100}%`, background: palette[i % palette.length] }} title={`${it.name}: RM ${it.cost}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px]">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: palette[i % palette.length] }} />
            <span className="text-accent-foreground/80 truncate">{it.name || "Item"}</span>
            <span className="ml-auto font-semibold text-accent-foreground">RM {it.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pushActivity(activity: ActivityItem[], setActivity: (v: ActivityItem[]) => void, item: Omit<ActivityItem, "id" | "createdAt">) {
  const next: ActivityItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  setActivity([next, ...activity].slice(0, 30));
}

function SavedTab() {
  const [saved, setSaved] = useLocalStorage<SavedProduct[]>("sellerai.savedProducts", []);
  const [open, setOpen] = useState<string | null>(null);

  if (saved.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-4xl mb-2">💰</div>
        <p className="text-sm text-muted-foreground">No saved products yet. Calculate one and hit Save!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {saved.map((p) => {
        const ingTotal = p.ingredients.reduce((s, i) => s + (i.cost || 0), 0);
        const totalCost = ingTotal + (p.extraCosts || 0);
        const perUnit = p.units > 0 ? totalCost / p.units : 0;
        const sellAt60 = perUnit > 0 ? perUnit / 0.4 : 0;
        const margin = sellAt60 > 0 ? ((sellAt60 - perUnit) / sellAt60) * 100 : 0;
        const color = margin > 50 ? "bg-success/20 text-success" : margin > 30 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive";
        const isOpen = open === p.id;
        return (
          <Card key={p.id} className="p-4">
            <button className="flex items-center w-full gap-3 text-left" onClick={() => setOpen(isOpen ? null : p.id)}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">RM {perUnit.toFixed(2)}/unit · {p.units} units/batch</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md font-semibold ${color}`}>{margin.toFixed(0)}% margin</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            </button>
            {isOpen && (
              <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                {p.ingredients.map((i, idx) => (
                  <div key={idx} className="flex justify-between"><span className="text-muted-foreground">{i.name}</span><span>RM {i.cost.toFixed(2)}</span></div>
                ))}
                {p.extraCosts > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Other</span><span>RM {p.extraCosts.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>Batch total</span><span>RM {totalCost.toFixed(2)}</span></div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setSaved(saved.filter((x) => x.id !== p.id)); toast.success("Deleted"); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}