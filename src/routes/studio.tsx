import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, RefreshCw, Save, Sparkles, Upload, Download, Hash, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { callAI } from "@/lib/ai";
import { useLocalStorage, type ActivityItem, type BusinessProfile, defaultProfile } from "@/lib/storage";

const searchSchema = z.object({
  tab: z.enum(["caption", "poster", "blast"]).optional(),
});

export const Route = createFileRoute("/studio")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Content Studio — SellerAI" },
      { name: "description", content: "AI captions, hashtags, posters and WhatsApp blasts for your products." },
    ],
  }),
  component: StudioPage,
});

const COOK_MSG = ["Cooking up your caption... 🍳", "Stirring the words... 🥄", "Adding spices... 🌶️", "Plating it nice... 🍽️"];

function useCookingMessage(loading: boolean) {
  const [msg, setMsg] = useState(COOK_MSG[0]);
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % COOK_MSG.length;
      setMsg(COOK_MSG[i]);
    }, 1400);
    return () => clearInterval(t);
  }, [loading]);
  return msg;
}

function pushActivity(activity: ActivityItem[], setActivity: (v: ActivityItem[]) => void, item: Omit<ActivityItem, "id" | "createdAt">) {
  const next: ActivityItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  setActivity([next, ...activity].slice(0, 30));
}

function StudioPage() {
  const search = Route.useSearch();
  const initial = (search.tab as "caption" | "poster" | "blast" | undefined) ?? "caption";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Content Studio ✨</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered content for your store.</p>
      </header>
      <Tabs defaultValue={initial} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="caption">Caption</TabsTrigger>
          <TabsTrigger value="poster">Poster</TabsTrigger>
          <TabsTrigger value="blast">Blast</TabsTrigger>
        </TabsList>
        <TabsContent value="caption" className="mt-5">
          <CaptionTab />
        </TabsContent>
        <TabsContent value="poster" className="mt-5">
          <PosterTab />
        </TabsContent>
        <TabsContent value="blast" className="mt-5">
          <BlastTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------- CAPTION TAB ----------------------- */
function CaptionTab() {
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [saved, setSaved] = useLocalStorage<{ id: string; text: string; createdAt: number }[]>("sellerai.savedCaptions", []);

  const [product, setProduct] = useState("");
  const [desc, setDesc] = useState("");
  const [platform, setPlatform] = useState(profile.platform);
  const [tone, setTone] = useState("Friendly & Casual");
  const [language, setLanguage] = useState<"en" | "ms" | "both">("en");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashLoading, setHashLoading] = useState(false);
  const cookMsg = useCookingMessage(loading);

  async function generate() {
    if (!product.trim()) {
      toast.error("Tell us your product name first 🙏");
      return;
    }
    setLoading(true);
    setResults([]);
    setHashtags([]);
    try {
      const { result } = await callAI("captions", { product, description: desc, platform, tone, language }, profile);
      const arr = Array.isArray(result) ? (result as string[]) : [];
      setResults(arr);
      pushActivity(activity, setActivity, { type: "caption", title: `Caption: ${product}`, preview: arr[0]?.slice(0, 120) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Oops, let's try that again! 🔄");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateOne(idx: number) {
    setLoading(true);
    try {
      const { result } = await callAI("captions", { product, description: desc, platform, tone, language }, profile);
      const arr = Array.isArray(result) ? (result as string[]) : [];
      if (arr[0]) {
        const next = [...results];
        next[idx] = arr[0];
        setResults(next);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  }

  async function genHashtags() {
    setHashLoading(true);
    try {
      const { result } = await callAI("hashtags", { product, platform }, profile);
      setHashtags(Array.isArray(result) ? (result as string[]) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Try again");
    } finally {
      setHashLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="product">Product name</Label>
          <Input id="product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Kuih Lapis Pandan" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="desc">Short description <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="pandan flavour, soft texture, 12 pieces per box" className="mt-1.5 min-h-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as BusinessProfile["platform"])}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Friendly & Casual">Friendly & Casual</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Cute & Playful">Cute & Playful</SelectItem>
                <SelectItem value="Urgent (Flash Sale)">Urgent (Flash Sale)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Language / Bahasa</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[
              { v: "en", l: "English" },
              { v: "ms", l: "Bahasa" },
              { v: "both", l: "Bilingual" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setLanguage(opt.v as "en" | "ms" | "both")}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  language === opt.v ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-12 text-base font-semibold shadow-soft">
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? cookMsg : "Generate Caption"}
        </Button>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-3 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-5/6" />
            </Card>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((text, idx) => (
            <Card key={idx} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-brand">Variation {idx + 1}</div>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Caption copied! ✅"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => regenerateOne(idx)} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setSaved([{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...saved].slice(0, 50)); toast.success("Caption saved! 🎉"); }}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
              </div>
            </Card>
          ))}

          <Button onClick={genHashtags} disabled={hashLoading} variant="outline" className="w-full h-11">
            <Hash className="h-4 w-4 mr-2" />
            {hashLoading ? "Mixing hashtags..." : "Generate Hashtags"}
          </Button>

          {hashtags.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Hashtags</div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(hashtags.join(" ")); toast.success("Hashtags copied! ✅"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((h, i) => (
                  <span key={i} className="px-2 py-1 text-xs rounded-md bg-brand-soft text-accent-foreground font-medium">{h}</span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------- POSTER TAB ----------------------- */
type PosterCopy = { headline: string; tagline: string; cta: string; price: string };
const POSTER_STYLES = ["Minimal Clean", "Bold & Bright", "Rustic Handmade", "Flash Sale"] as const;
type PosterStyle = (typeof POSTER_STYLES)[number];

function PosterTab() {
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [tagline, setTagline] = useState("");
  const [style, setStyle] = useState<PosterStyle>("Minimal Clean");
  const [copy, setCopy] = useState<PosterCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => setImgUrl(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function generate() {
    if (!product.trim()) { toast.error("Add a product name first"); return; }
    setLoading(true);
    try {
      const { result } = await callAI("poster", { product, price, style, tagline }, profile);
      const r = result as PosterCopy;
      setCopy({ headline: r.headline || product, tagline: r.tagline || "", cta: r.cta || "Order Now", price: price || r.price || "" });
      pushActivity(activity, setActivity, { type: "poster", title: `Poster: ${product}`, preview: r.tagline });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  }

  function downloadAsImage() {
    // Lightweight: open print dialog scoped to poster
    if (!posterRef.current) return;
    const html = `<html><head><title>poster</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;font-family:'Plus Jakarta Sans',sans-serif}</style></head><body>${posterRef.current.outerHTML}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div>
          <Label>Product photo</Label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] || null); }}
            className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {imgUrl ? (
              <img src={imgUrl} alt="upload preview" className="max-h-40 mx-auto rounded-lg" />
            ) : (
              <>
                <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm font-medium">Tap to upload or drag photo here</div>
                <div className="text-xs text-muted-foreground mt-0.5">JPG, PNG up to ~5MB</div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="hidden" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pp">Product name</Label>
            <Input id="pp" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Kuih Lapis" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pr">Price <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="pr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 12" className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="tg">Tagline hint <span className="text-muted-foreground">(optional, AI will polish)</span></Label>
          <Input id="tg" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Fresh from oven" className="mt-1.5" />
        </div>
        <div>
          <Label>Poster style</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {POSTER_STYLES.map((s) => (
              <button key={s} type="button" onClick={() => setStyle(s)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${style === s ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-12 text-base font-semibold shadow-soft">
          🎨 {loading ? "Designing your poster..." : "Generate Poster"}
        </Button>
      </Card>

      {copy && (
        <div className="space-y-3">
          <div ref={posterRef}>
            <PosterPreview style={style} copy={copy} imgUrl={imgUrl} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={downloadAsImage}><Download className="h-4 w-4 mr-1.5" /> Download / Print</Button>
            <Button variant="outline" onClick={generate} disabled={loading}><RefreshCw className="h-4 w-4 mr-1.5" /> Regenerate</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PosterPreview({ style, copy, imgUrl }: { style: PosterStyle; copy: PosterCopy; imgUrl: string | null }) {
  const base = "relative aspect-[4/5] w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-card";
  const photo = imgUrl || "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600";

  if (style === "Minimal Clean") {
    return (
      <div className={`${base} bg-white text-neutral-900`}>
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 overflow-hidden bg-neutral-100">
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="p-5">
            <div className="text-2xl font-bold leading-tight">{copy.headline}</div>
            {copy.tagline && <div className="text-xs text-neutral-500 mt-1">{copy.tagline}</div>}
            <div className="flex items-center justify-between mt-3">
              {copy.price && <div className="text-lg font-bold">{copy.price}</div>}
              <div className="text-[10px] tracking-widest uppercase text-neutral-500">{copy.cta}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (style === "Bold & Bright") {
    return (
      <div className={`${base}`} style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
        <div className="absolute inset-0 p-5 flex flex-col text-white">
          <div className="text-[11px] uppercase tracking-widest opacity-90 font-bold">Just dropped</div>
          <div className="text-4xl font-extrabold mt-2 leading-tight">{copy.headline}</div>
          <div className="text-sm mt-2 opacity-95">{copy.tagline}</div>
          <div className="flex-1 my-4 rounded-xl overflow-hidden ring-4 ring-white/30">
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            {copy.price && <div className="text-3xl font-extrabold">{copy.price}</div>}
            <div className="px-4 py-2 rounded-full bg-white text-neutral-900 font-bold text-sm">{copy.cta} →</div>
          </div>
        </div>
      </div>
    );
  }
  if (style === "Rustic Handmade") {
    return (
      <div className={`${base}`} style={{ background: "#F5EFE6" }}>
        <div className="absolute inset-0 p-6 flex flex-col text-stone-800">
          <div className="text-center text-[11px] tracking-[0.3em] uppercase">~ Handmade with love ~</div>
          <div className="my-4 rounded-full overflow-hidden aspect-square mx-auto w-44 ring-4 ring-stone-200">
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center" style={{ fontFamily: "Georgia, serif" }}>
            <div className="text-3xl italic">{copy.headline}</div>
            <div className="text-sm text-stone-600 mt-2 px-3">{copy.tagline}</div>
          </div>
          <div className="mt-auto text-center">
            {copy.price && <div className="text-2xl font-bold">{copy.price}</div>}
            <div className="mt-2 inline-block border border-stone-800 px-4 py-1.5 text-xs uppercase tracking-widest">{copy.cta}</div>
          </div>
        </div>
      </div>
    );
  }
  // Flash Sale
  return (
    <div className={`${base} bg-neutral-900 text-white`}>
      <div className="absolute inset-0">
        <img src={photo} alt="" className="w-full h-full object-cover opacity-40" />
      </div>
      <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest" style={{ background: "#F59E0B", color: "#111" }}>⚡ FLASH SALE</div>
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="text-5xl font-black leading-none uppercase">{copy.headline}</div>
        <div className="text-sm mt-2 opacity-90">{copy.tagline}</div>
        <div className="flex items-end justify-between mt-4">
          {copy.price && <div className="text-4xl font-black" style={{ color: "#F59E0B" }}>{copy.price}</div>}
          <div className="px-4 py-2 rounded-md font-bold text-sm" style={{ background: "#F59E0B", color: "#111" }}>{copy.cta}</div>
        </div>
        <div className="text-[10px] mt-3 uppercase tracking-widest opacity-80">Today only · DM to grab yours</div>
      </div>
    </div>
  );
}

/* ----------------------- BLAST TAB ----------------------- */
function BlastTab() {
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState<"In stock" | "Limited" | "Last few">("In stock");
  const [language, setLanguage] = useState<"en" | "ms" | "both">("en");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");

  async function generate() {
    if (!product.trim()) { toast.error("Tell us your product name"); return; }
    setLoading(true);
    try {
      const { result } = await callAI("blast", { product, price, availability, language }, profile);
      const text = typeof result === "string" ? result : JSON.stringify(result);
      setOut(text);
      pushActivity(activity, setActivity, { type: "blast", title: `Blast: ${product}`, preview: text.slice(0, 120) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="bp">Product name</Label>
          <Input id="bp" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Kuih Lapis Pandan" className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bpr">Price</Label>
            <Input id="bpr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 12" className="mt-1.5" />
          </div>
          <div>
            <Label>Availability</Label>
            <Select value={availability} onValueChange={(v) => setAvailability(v as typeof availability)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="In stock">In stock</SelectItem>
                <SelectItem value="Limited">Limited</SelectItem>
                <SelectItem value="Last few">Last few</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Language</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[{ v: "en", l: "English" }, { v: "ms", l: "Bahasa" }, { v: "both", l: "Bilingual" }].map((opt) => (
              <button key={opt.v} type="button" onClick={() => setLanguage(opt.v as "en" | "ms" | "both")}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${language === opt.v ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-12 text-base font-semibold shadow-soft">
          <MessageCircle className="h-4 w-4 mr-2" />
          {loading ? "Writing your blast..." : "Generate Blast Message"}
        </Button>
      </Card>

      {out && (
        <Card className="p-5">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{out}</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(out); toast.success("Message copied! ✅"); }}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
            <Button size="sm" variant="outline" onClick={generate} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate</Button>
          </div>
        </Card>
      )}
    </div>
  );
}