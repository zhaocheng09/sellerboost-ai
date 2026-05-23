import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, RefreshCw, Save, Sparkles, Upload, Download, Hash, MessageCircle, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import html2canvas from "html2canvas-pro";
import { toast } from "sonner";
import { z } from "zod";
import { callAI } from "@/lib/ai";
import { useLocalStorage, type ActivityItem, type BusinessProfile, defaultProfile } from "@/lib/storage";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{t("studio.title")} ✨</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("studio.sub")}</p>
      </header>
      <Tabs defaultValue={initial} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="caption">{t("studio.tab.caption")}</TabsTrigger>
          <TabsTrigger value="poster">{t("studio.tab.poster")}</TabsTrigger>
          <TabsTrigger value="blast">{t("studio.tab.blast")}</TabsTrigger>
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
  const { t } = useT();
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
      toast.error(t("t.needProduct"));
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
      toast.error(e instanceof Error ? e.message : t("t.tryAgain"));
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
          <Label htmlFor="product">{t("f.product")}</Label>
          <Input id="product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Kuih Lapis Pandan" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="desc">{t("f.shortDesc")} <span className="text-muted-foreground">{t("f.optional")}</span></Label>
          <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="pandan flavour, soft texture, 12 pieces per box" className="mt-1.5 min-h-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("f.platform")}</Label>
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
            <Label>{t("f.tone")}</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Friendly & Casual">{t("tone.friendly")}</SelectItem>
                <SelectItem value="Professional">{t("tone.pro")}</SelectItem>
                <SelectItem value="Cute & Playful">{t("tone.cute")}</SelectItem>
                <SelectItem value="Urgent (Flash Sale)">{t("tone.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("f.lang")}</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[
              { v: "en", l: t("lang.en") },
              { v: "ms", l: t("lang.ms") },
              { v: "both", l: t("lang.both") },
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
          {loading ? cookMsg : t("btn.genCaption")}
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
                <div className="text-xs font-semibold text-brand">{t("label.variation")} {idx + 1}</div>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success(t("t.captionCopied")); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> {t("btn.copy")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => regenerateOne(idx)} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("btn.regen")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setSaved([{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...saved].slice(0, 50)); toast.success(t("t.captionSaved")); }}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> {t("btn.save")}
                </Button>
              </div>
            </Card>
          ))}

          <Button onClick={genHashtags} disabled={hashLoading} variant="outline" className="w-full h-11">
            <Hash className="h-4 w-4 mr-2" />
            {hashLoading ? "..." : t("btn.genHashtags")}
          </Button>

          {hashtags.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">{t("label.hashtags")}</div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(hashtags.join(" ")); toast.success(t("t.hashCopied")); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> {t("btn.copyAll")}
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

const POSTER_LOADING_MSGS = [
  "Reading your product... 📖",
  "Choosing the perfect layout... 🎨",
  "Making it impossible to scroll past... 👀",
  "Adding the final touches... ✨",
  "Almost ready to go viral... 🔥",
];

function usePosterLoadingMsg(loading: boolean) {
  const [msg, setMsg] = useState(POSTER_LOADING_MSGS[0]);
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setMsg(POSTER_LOADING_MSGS[0]);
    const t = setInterval(() => {
      i = (i + 1) % POSTER_LOADING_MSGS.length;
      setMsg(POSTER_LOADING_MSGS[i]);
    }, 1600);
    return () => clearInterval(t);
  }, [loading]);
  return msg;
}

/** Pick a deep overlay color based on product keywords. */
function pickOverlayColor(product: string): { hex: string; rgb: string } {
  const p = product.toLowerCase();
  const map: Array<{ keys: string[]; hex: string; rgb: string }> = [
    { keys: ["chocolate", "brownie", "coffee", "kopi", "mocha", "dark", "cocoa", "tiramisu"], hex: "#1C0A00", rgb: "28,10,0" },
    { keys: ["matcha", "pandan", "ulam", "mint", "green", "kale", "avocado"], hex: "#0A2010", rgb: "10,32,16" },
    { keys: ["strawberry", "rose", "ube", "berry", "raspberry", "grape", "purple", "plum"], hex: "#2A0A1F", rgb: "42,10,31" },
    { keys: ["vanilla", "cream", "butter", "caramel", "honey", "milk", "custard"], hex: "#3A2410", rgb: "58,36,16" },
    { keys: ["plant", "flower", "succulent", "terrarium", "garden"], hex: "#0A2010", rgb: "10,32,16" },
    { keys: ["craft", "bag", "leather", "wood", "weave", "knit"], hex: "#0A0A2A", rgb: "10,10,42" },
  ];
  for (const m of map) if (m.keys.some((k) => p.includes(k))) return { hex: m.hex, rgb: m.rgb };
  return { hex: "#1a1a1a", rgb: "26,26,26" };
}

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/></svg>\")";

function PosterTab() {
  const { t } = useT();
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [tagline, setTagline] = useState("");
  const [style, setStyle] = useState<PosterStyle>("Minimal Clean");
  const [copy, setCopy] = useState<PosterCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [shuffleKey, setShuffleKey] = useState(0);
  const [variantNum, setVariantNum] = useState<number>(() => Math.floor(Math.random() * 900) + 100);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const loadingMsg = usePosterLoadingMsg(loading);

  function handleFile(f: File | null) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => setImgUrl(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function generate() {
    if (!product.trim()) { toast.error(t("t.needProduct")); return; }
    const newSeed = Date.now() + Math.floor(Math.random() * 100000);
    setSeed(newSeed);
    setShuffleKey((k) => k + 1);
    setVariantNum(Math.floor(Math.random() * 900) + 100);
    setLoading(true);
    try {
      const { result } = await callAI("poster", { product, price, style, tagline, randomSeed: newSeed }, profile);
      const r = result as PosterCopy;
      setCopy({ headline: r.headline || product, tagline: r.tagline || tagline || "", cta: r.cta || "Order Now", price: price || r.price || "" });
      pushActivity(activity, setActivity, { type: "poster", title: `Poster: ${product}`, preview: r.tagline });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("t.tryAgain"));
    } finally {
      setLoading(false);
    }
  }

  function switchStyle(s: PosterStyle) {
    setStyle(s);
    if (copy) {
      setSeed(Date.now() + Math.floor(Math.random() * 100000));
      setShuffleKey((k) => k + 1);
      setVariantNum(Math.floor(Math.random() * 900) + 100);
    }
  }

  async function downloadAsImage() {
    const element =
      document.getElementById("poster-download-target") ||
      document.getElementById("poster-canvas-container");
    if (!element) return;
    setDownloadState("loading");
    try {
      // Preload fonts so cloned doc renders with correct typography
      try {
        await document.fonts.ready;
        const fontFaces = [
          "700 80px 'Anton'",
          "400 80px 'Bebas Neue'",
          "700 80px 'Oswald'",
          "700 80px 'Barlow Condensed'",
          "800 80px 'Plus Jakarta Sans'",
          "700 80px 'Playfair Display'",
        ];
        await Promise.all(fontFaces.map((f) => (document as any).fonts.load(f).catch(() => {})));
      } catch {}
      // Let images settle
      await new Promise((r) => setTimeout(r, 500));
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 30000,
        onclone: async (clonedDoc, clonedElement) => {
          try { await (clonedDoc as any).fonts.ready; } catch {}
          const all = clonedElement.querySelectorAll<HTMLElement>("*");
          all.forEach((el) => {
            el.style.backdropFilter = "none";
            (el.style as any).webkitBackdropFilter = "none";
            el.style.transition = "none";
            el.style.animation = "none";
          });
          (clonedElement as HTMLElement).style.borderRadius = "0px";
          (clonedElement as HTMLElement).style.overflow = "visible";
          const imgs = clonedElement.querySelectorAll("img");
          await Promise.all(Array.from(imgs).map((img) => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(() => resolve(), 5000);
            });
          }));
          await new Promise((r) => setTimeout(r, 300));
        },
      });
      const link = document.createElement("a");
      const slug = (product || "poster").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poster";
      link.download = `SellerAI-${slug}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadState("success");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (err) {
      console.error(err);
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2500);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div>
          <Label>{t("p.photo")}</Label>
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
                <div className="text-sm font-medium">{t("p.upload")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("p.uploadSub")}</div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="hidden" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pp">{t("f.product")}</Label>
            <Input id="pp" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Kuih Lapis" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pr">{t("p.price")} <span className="text-muted-foreground">{t("f.optional")}</span></Label>
            <Input id="pr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 12" className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="tg">{t("p.tagline")} <span className="text-muted-foreground">{t("p.taglineSub")}</span></Label>
          <Input id="tg" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Fresh from oven" className="mt-1.5" />
        </div>
        <div>
          <Label>{t("p.style")}</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {POSTER_STYLES.map((s) => (
              <button key={s} type="button" onClick={() => switchStyle(s)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${style === s ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"}`}>
                {posterStyleLabel(s, t)}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-12 text-base font-semibold shadow-soft">
          🎨 {loading ? t("p.designing") : t("p.gen")}
        </Button>
      </Card>

      {loading && (
        <div className="space-y-3">
          <div className="relative aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted">
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted-foreground/10 to-muted animate-pulse" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.6s linear infinite",
              }}
            />
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
          <p className="text-center text-sm text-muted-foreground italic">{loadingMsg}</p>
        </div>
      )}

      {copy && !loading && (
        <div className="w-full max-w-sm mx-auto flex flex-col gap-2">
          <div key={shuffleKey} className="poster-fade-in">
            <ScaledPoster ref={posterRef} style={style} copy={copy} imgUrl={imgUrl} product={product} seed={seed} />
          </div>

          <Button
            onClick={downloadAsImage}
            disabled={downloadState === "loading"}
            className="w-full flex h-12 font-semibold rounded-xl text-[15px] text-white"
            style={{
              borderRadius: 12,
              background:
                downloadState === "error" ? "#DC2626"
                : downloadState === "success" ? "#047857"
                : downloadState === "loading" ? "#6B7280"
                : "#059669",
            }}
          >
            {downloadState === "loading" && <>⏳ Saving your poster...</>}
            {downloadState === "success" && <>✅ Downloaded!</>}
            {downloadState === "error" && <>Download failed — try again</>}
            {downloadState === "idle" && (
              <><Download className="h-4 w-4 mr-2" /> ⬇️ Download Poster</>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={generate} disabled={loading}
              className="h-11 border-[#059669] text-[#059669] hover:bg-[#D1FAE5] hover:text-[#065F46]">
              <RefreshCw className="h-4 w-4 mr-2" /> 🔄 Regenerate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11">
                  🎨 Different Style <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {POSTER_STYLES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => switchStyle(s)}>
                    {style === s ? "✓ " : "  "}{posterStyleLabel(s, t)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-center text-[11px] text-muted-foreground m-0">
            ✦ Generated variant #{variantNum}
          </p>

          <style>{`.poster-fade-in{animation:posterFadeIn 300ms ease-out}@keyframes posterFadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
      )}
    </div>
  );
}

function posterStyleLabel(s: PosterStyle, t: (k: string) => string) {
  switch (s) {
    case "Minimal Clean": return t("p.style.minimal");
    case "Bold & Bright": return t("p.style.bold");
    case "Rustic Handmade": return t("p.style.rustic");
    case "Flash Sale": return t("p.style.flash");
  }
}

const ScaledPoster = ({ style, copy, imgUrl, product, seed, ref }: {
  style: PosterStyle; copy: PosterCopy; imgUrl: string | null; product: string; seed: number;
  ref: React.RefObject<HTMLDivElement | null>;
}) => {
  const [scale, setScale] = useState(0.32);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function update() {
      const w = wrapRef.current?.clientWidth ?? 360;
      setScale(w / 1080);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <div ref={wrapRef} className="w-full" style={{ aspectRatio: "1 / 1" }}>
      <div style={{ width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div id="poster-download-target" ref={ref} style={{ width: 1080, height: 1080 }}>
          <PosterPreview style={style} copy={copy} imgUrl={imgUrl} product={product} seed={seed} />
        </div>
      </div>
    </div>
  );
};

/** Randomize sub-variables on every Generate click. */
function getRandomConfig(seed: number) {
  const pick = <T,>(arr: readonly T[], offset: number) => arr[Math.abs(Math.floor(seed / offset)) % arr.length];
  const FONTS = ["'Anton', sans-serif", "'Bebas Neue', sans-serif", "'Oswald', sans-serif", "'Barlow Condensed', sans-serif"] as const;
  const OVERLAY_INTENSITIES = [0.38, 0.52, 0.65, 0.74] as const;
  const ACCENTS = ["#FFD700", "#FF6B6B", "#6EE7B7", "#BAE6FD", "#FDA4AF", "#BEF264", "#FCD34D"] as const;
  const TITLE_SIZES = [72, 60, 52, 80] as const;
  const LETTER_SPACINGS = ["-2px", "-1px", "0px", "2px"] as const;
  const GRADIENT_DIRS = ["to top", "to bottom", "135deg", "160deg"] as const;
  return {
    font: pick(FONTS, 7),
    intensity: pick(OVERLAY_INTENSITIES, 13),
    accent: pick(ACCENTS, 17),
    titleSize: pick(TITLE_SIZES, 23),
    letterSpacing: pick(LETTER_SPACINGS, 29),
    gradientDir: pick(GRADIENT_DIRS, 31),
  };
}

/* Ribbon color picker for Bold style */
function pickRibbonColor(product: string): string {
  const p = product.toLowerCase();
  if (/chocolate|brownie|coffee|kopi|mocha|cocoa/.test(p)) return "#0A0400";
  if (/matcha|pandan|green|mint|ulam/.test(p)) return "#010A03";
  if (/strawberry|rose|ube|berry|purple|grape/.test(p)) return "#0A0108";
  if (/vanilla|cream|cheese|butter|milk/.test(p)) return "#0A0804";
  if (/mango|orange|citrus/.test(p)) return "#0A0500";
  return "#050505";
}

const GRAIN_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage: NOISE_SVG,
  opacity: 0.04,
  mixBlendMode: "overlay",
  zIndex: 50,
};

function PosterPreview({ style, copy, imgUrl, product, seed }: {
  style: PosterStyle; copy: PosterCopy; imgUrl: string | null; product: string; seed: number;
}) {
  const photo = imgUrl || "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200&q=80";
  const cfg = getRandomConfig(seed);

  const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="relative overflow-hidden"
      style={{
        width: 1080,
        height: 1080,
        borderRadius: 16,
        boxShadow: "inset 0 0 150px rgba(0,0,0,0.5)",
      }}
    >
      {children}
      <div style={GRAIN_OVERLAY} />
    </div>
  );

  const BgPhoto = (
    <img
      src={photo}
      alt=""
      crossOrigin="anonymous"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  const TEXT_SHADOW = "0 2px 20px rgba(0,0,0,0.9)";

  /* ---------- STYLE 1: MINIMAL CLEAN — Editorial Magazine ---------- */
  if (style === "Minimal Clean") {
    return (
      <Frame>
        {BgPhoto}
        {/* Bottom 45% gradient only */}
        <div
          className="absolute"
          style={{
            left: 0, right: 0, bottom: 0, height: "55%",
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
          }}
        />
        {/* Bottom floating text */}
        <div className="absolute" style={{ left: 64, right: 64, bottom: 80, color: "white" }}>
          {copy.tagline && (
            <div style={{
              fontSize: 22, color: "rgba(255,255,255,0.7)", textTransform: "uppercase",
              letterSpacing: "0.5em", fontStyle: "italic", marginBottom: 24,
              fontFamily: "'Plus Jakarta Sans', sans-serif", textShadow: TEXT_SHADOW,
            }}>{copy.tagline}</div>
          )}
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
            fontSize: cfg.titleSize * 1.7, letterSpacing: cfg.letterSpacing,
            lineHeight: 1.0, color: "white", textShadow: TEXT_SHADOW,
            maxWidth: "85%",
          }}>{copy.headline}</div>
          <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.5)", marginTop: 28 }} />
          {copy.price && (
            <div style={{
              marginTop: 28, display: "inline-block",
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 999, padding: "16px 40px",
              color: "white", fontSize: 30, fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif", textShadow: TEXT_SHADOW,
            }}>{copy.price}</div>
          )}
        </div>
        {/* Decorative ✦ bottom right */}
        <div style={{
          position: "absolute", right: 56, bottom: 56,
          color: "rgba(255,255,255,0.3)", fontSize: 32,
        }}>✦</div>
      </Frame>
    );
  }

  /* ---------- STYLE 2: BOLD & BRIGHT — Streetwear Drop ---------- */
  if (style === "Bold & Bright") {
    const ribbon = pickRibbonColor(product || copy.headline);
    return (
      <Frame>
        {BgPhoto}
        {/* Subtle corner vignette */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }} />
        {/* Solid dark ribbon bottom 38% */}
        <div className="absolute" style={{
          left: 0, right: 0, bottom: 0, height: "38%", background: ribbon,
        }} />
        {/* NEW DROP badge */}
        <div style={{
          position: "absolute", right: 56, bottom: `calc(38% + 32px)`,
          background: "#FF3B30", color: "white",
          padding: "10px 24px", borderRadius: 4,
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
          fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase",
          boxShadow: "0 6px 24px rgba(255,59,48,0.5)",
        }}>NEW DROP</div>
        {/* Ribbon content */}
        <div className="absolute" style={{
          left: 56, right: 56, bottom: 56, color: "white",
        }}>
          {copy.tagline && (
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 22, color: "rgba(255,255,255,0.6)", marginBottom: 18,
            }}>{copy.tagline}</div>
          )}
          <div style={{
            fontFamily: cfg.font, fontWeight: 900,
            fontSize: 136, lineHeight: 0.92,
            textTransform: "uppercase", letterSpacing: "-0.01em",
            color: "white", textShadow: TEXT_SHADOW,
          }}>{copy.headline}</div>
          <div className="flex items-center justify-between" style={{ marginTop: 32 }}>
            {copy.price && (
              <div style={{
                fontFamily: cfg.font, fontSize: 72, color: "#FFD700",
                fontWeight: 700, textShadow: TEXT_SHADOW,
              }}>{copy.price}</div>
            )}
            <div style={{
              marginLeft: "auto",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: 999, padding: "14px 32px",
              color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: 22,
            }}>{copy.cta || "Order Now"} →</div>
          </div>
        </div>
      </Frame>
    );
  }

  /* ---------- STYLE 3: RUSTIC HANDMADE — Artisan Market ---------- */
  if (style === "Rustic Handmade") {
    return (
      <Frame>
        <img src={photo} alt="" crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            filter: "sepia(0.15) saturate(1.2) brightness(0.95)" }} />
        {/* Top-left "Freshly Made" tag */}
        <div style={{
          position: "absolute", top: 48, left: 48,
          background: "rgba(0,0,0,0.35)", color: "white",
          padding: "8px 20px", borderRadius: 999,
          fontFamily: "'Playfair Display', serif", fontStyle: "italic",
          fontSize: 20,
        }}>Freshly Made ♥</div>
        {/* Torn paper cream band bottom 40% */}
        <div className="absolute" style={{
          left: 0, right: 0, bottom: 0, height: "42%",
          background: "#FDFAF5",
          filter: "drop-shadow(0 -6px 14px rgba(0,0,0,0.18))",
          clipPath: "polygon(0% 18%, 2% 8%, 5% 15%, 9% 4%, 13% 16%, 18% 5%, 22% 17%, 27% 3%, 32% 15%, 37% 5%, 42% 18%, 47% 4%, 52% 16%, 57% 3%, 62% 15%, 67% 5%, 72% 18%, 77% 4%, 82% 15%, 87% 3%, 92% 16%, 96% 6%, 100% 14%, 100% 100%, 0% 100%)",
        }} />
        {/* Stamp circle for price */}
        {copy.price && (
          <div style={{
            position: "absolute", right: 64, bottom: 80,
            width: 140, height: 140, borderRadius: "50%",
            border: "3px solid #8B5A2B",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#8B5A2B", fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 30, transform: "rotate(-7deg)",
            background: "rgba(253,250,245,0.6)",
          }}>{copy.price}</div>
        )}
        {/* Cream band content */}
        <div className="absolute" style={{
          left: 64, right: copy.price ? 240 : 64, bottom: 100, color: "#2C1810",
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 20, color: "#8B6914", letterSpacing: "0.3em",
            marginBottom: 18, textTransform: "uppercase",
          }}>✦ homemade ✦</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontStyle: "italic",
            fontWeight: 700, fontSize: 76, lineHeight: 1.1, color: "#2C1810",
          }}>{copy.headline}</div>
          {copy.tagline && (
            <div style={{
              fontFamily: "'Playfair Display', serif", fontStyle: "italic",
              fontSize: 28, color: "#7A5C45", marginTop: 18,
            }}>{copy.tagline}</div>
          )}
        </div>
      </Frame>
    );
  }

  /* ---------- STYLE 4: FLASH SALE — Shopee 12.12 Energy ---------- */
  return (
    <Frame>
      {BgPhoto}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
      {/* Diagonal FLASH SALE corner banner */}
      <div style={{
        position: "absolute", top: 60, left: -100, width: 380,
        background: "#FF0000", color: "white",
        padding: "16px 0", textAlign: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
        fontSize: 22, letterSpacing: "0.3em",
        transform: "rotate(-45deg)", transformOrigin: "center",
        boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
      }}>
        <div>FLASH</div>
        <div>SALE</div>
      </div>
      {/* Center stacked text */}
      <div className="absolute" style={{
        left: 0, right: 0, top: "50%", transform: "translateY(-55%)",
        textAlign: "center", color: "white", padding: "0 56px",
      }}>
        <div style={{
          fontSize: 22, color: "#FFE000", textTransform: "uppercase",
          letterSpacing: "0.5em", fontFamily: "'Plus Jakarta Sans', sans-serif",
          marginBottom: 24,
        }}>LIMITED TIME OFFER</div>
        <div style={{
          fontFamily: "'Anton', sans-serif", fontSize: 144,
          color: "white", textTransform: "uppercase", lineHeight: 0.95,
          letterSpacing: "-0.01em",
          textShadow: "0 0 60px rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.8)",
        }}>{copy.headline}</div>
        <div style={{
          width: 80, height: 3, background: "#FF0000", margin: "32px auto",
        }} />
        {copy.price && (
          <>
            <div style={{
              fontSize: 22, color: "rgba(255,255,255,0.5)", letterSpacing: "0.3em",
              fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8,
            }}>WAS</div>
            <div style={{
              fontSize: 48, color: "rgba(255,255,255,0.6)",
              textDecoration: "line-through", textDecorationColor: "#FF6B6B",
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              marginBottom: 12,
            }}>{fakeOriginal(copy.price)}</div>
            <div style={{
              fontFamily: "'Anton', sans-serif", fontSize: 168,
              color: "#FFE000", lineHeight: 0.9,
              animation: "urgencyPulse 1.8s ease-in-out infinite",
            }}>{copy.price}</div>
            <style>{`@keyframes urgencyPulse{0%,100%{filter:drop-shadow(0 0 8px rgba(255,224,0,0.6));opacity:1}50%{filter:drop-shadow(0 0 20px rgba(255,224,0,0.9));opacity:.9}}`}</style>
          </>
        )}
      </div>
      {/* Bottom CTA bar */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "#FF0000", color: "white",
        height: 88, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
        fontSize: 28, letterSpacing: "0.18em", textTransform: "uppercase",
      }}>⚡ Order Now — While Stocks Last</div>
    </Frame>
  );
}

function fakeOriginal(price: string): string {
  const m = price.match(/(\D*)([\d.,]+)(.*)/);
  if (!m) return price;
  const num = parseFloat(m[2].replace(/,/g, ""));
  if (!isFinite(num) || num <= 0) return price;
  const inflated = (num * 1.35).toFixed(num >= 10 ? 0 : 2);
  return `${m[1]}${inflated}${m[3]}`;
}

/* ----------------------- BLAST TAB ----------------------- */
function BlastTab() {
  const { t } = useT();
  const [profile] = useLocalStorage<BusinessProfile>("sellerai.profile", defaultProfile);
  const [activity, setActivity] = useLocalStorage<ActivityItem[]>("sellerai.activity", []);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState<"In stock" | "Limited" | "Last few">("In stock");
  const [language, setLanguage] = useState<"en" | "ms" | "both">("en");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");

  async function generate() {
    if (!product.trim()) { toast.error(t("t.needProduct")); return; }
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
          <Label htmlFor="bp">{t("f.product")}</Label>
          <Input id="bp" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Kuih Lapis Pandan" className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bpr">{t("p.price")}</Label>
            <Input id="bpr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 12" className="mt-1.5" />
          </div>
          <div>
            <Label>{t("b.avail")}</Label>
            <Select value={availability} onValueChange={(v) => setAvailability(v as typeof availability)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="In stock">{t("b.instock")}</SelectItem>
                <SelectItem value="Limited">{t("b.limited")}</SelectItem>
                <SelectItem value="Last few">{t("b.lastfew")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("f.lang")}</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {[{ v: "en", l: t("lang.en") }, { v: "ms", l: t("lang.ms") }, { v: "both", l: t("lang.both") }].map((opt) => (
              <button key={opt.v} type="button" onClick={() => setLanguage(opt.v as "en" | "ms" | "both")}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${language === opt.v ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground hover:opacity-90 h-12 text-base font-semibold shadow-soft">
          <MessageCircle className="h-4 w-4 mr-2" />
          {loading ? t("b.writing") : t("b.gen")}
        </Button>
      </Card>

      {out && (
        <Card className="p-5">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{out}</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(out); toast.success(t("t.msgCopied")); }}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> {t("btn.copy")}
            </Button>
            <Button size="sm" variant="outline" onClick={generate} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("btn.regen")}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}