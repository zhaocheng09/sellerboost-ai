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
  "Sprinkling some magic on your poster... ✨",
  "Making your product look irresistible... 🍫",
  "Professional designer mode: ON 🎨",
  "Your customers won't be able to scroll past this... 👀",
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
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [shuffleKey, setShuffleKey] = useState(0);
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
    setLoading(true);
    try {
      const { result } = await callAI("poster", { product, price, style, tagline, randomSeed: newSeed }, profile);
      const r = result as PosterCopy;
      setCopy({ headline: r.headline || product, tagline: r.tagline || "", cta: r.cta || "Order Now", price: price || r.price || "" });
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
    }
  }

  async function downloadAsImage() {
    const element = document.getElementById("poster-canvas") || posterRef.current;
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: null,
        scale: 1, // poster already renders at 1080x1080
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement("a");
      const slug = (product || "poster").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poster";
      link.download = `SellerAI-${slug}-poster-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(t("t.posterDownloaded"));
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 1800);
    } catch (err) {
      console.error(err);
      toast.error(t("t.tryAgain"));
    } finally {
      setDownloading(false);
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

      {copy && (
        <div className="space-y-3">
          {/* Scaled wrapper — actual poster renders at 1080x1080 inside */}
          <div key={shuffleKey} className="w-full max-w-sm mx-auto poster-shuffle">
            <ScaledPoster ref={posterRef} style={style} copy={copy} imgUrl={imgUrl} product={product} seed={seed} />
          </div>
          <div className="text-center text-[11px] text-muted-foreground -mt-1">
            ✦ {posterStyleLabel(style, t)} · Layout {(Math.abs(seed) % 5) + 1} · Font {(Math.abs(Math.floor(seed / 7)) % 6) + 1} · Accent {(Math.abs(Math.floor(seed / 17)) % 8) + 1}
          </div>
          <Button
            onClick={downloadAsImage}
            disabled={downloading}
            className="w-full max-w-sm mx-auto flex bg-[#059669] hover:bg-[#047857] text-white h-12 font-semibold rounded-xl text-[15px]"
            style={{ borderRadius: 12 }}
          >
            {downloading ? (
              <>⏳ {t("p.downloading")}</>
            ) : downloaded ? (
              <>Downloaded! ✅</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> ⬇️ {t("p.download")}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={generate} disabled={loading} className="w-full max-w-sm mx-auto flex h-11">
            <RefreshCw className="h-4 w-4 mr-2" /> 🔄 {t("btn.regen")}
          </Button>
          <div className="pt-2">
            <div className="text-xs text-center text-muted-foreground mb-2">{t("p.tryStyle")}</div>
            <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
              {POSTER_STYLES.map((s) => (
                <button key={s} type="button" onClick={() => switchStyle(s)}
                  className={`px-2 py-2 text-[11px] leading-tight rounded-lg border transition-all ${style === s ? "bg-brand text-brand-foreground border-brand shadow-soft" : "bg-card border-border hover:bg-muted"}`}>
                  {posterStyleLabel(s, t)}
                </button>
              ))}
            </div>
          </div>
          <style>{`.poster-shuffle{animation:posterShuffle 280ms ease}@keyframes posterShuffle{0%{transform:scale(.95);opacity:.6}100%{transform:scale(1);opacity:1}}`}</style>
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

/**
 * ScaledPoster renders the actual poster at 1080x1080 (so html2canvas captures
 * full resolution) inside a wrapper that scales it down to fit the preview.
 */
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
        <div id="poster-canvas" ref={ref} style={{ width: 1080, height: 1080 }}>
          <PosterPreview style={style} copy={copy} imgUrl={imgUrl} product={product} seed={seed} />
        </div>
      </div>
    </div>
  );
};

/** Independent axis selection from a single seed using prime offsets so
 *  every click visibly changes layout, fonts, accent, intensity, badge, etc. */
function getRandomConfig(seed: number) {
  const pick = <T,>(arr: readonly T[], offset: number) => arr[Math.abs(Math.floor(seed / offset)) % arr.length];
  const LAYOUTS = ["BOTTOM_LEFT", "BOTTOM_CENTER", "TOP_OVERLAY", "CENTER_DRAMA", "SPLIT"] as const;
  const FONTS = [
    { h: "'Anton', sans-serif", b: "'Plus Jakarta Sans', sans-serif", w: 800 },
    { h: "'Bebas Neue', sans-serif", b: "'DM Sans', sans-serif", w: 700 },
    { h: "'Black Han Sans', sans-serif", b: "'Inter', sans-serif", w: 800 },
    { h: "'Oswald', sans-serif", b: "'Plus Jakarta Sans', sans-serif", w: 700 },
    { h: "'Barlow Condensed', sans-serif", b: "'DM Sans', sans-serif", w: 800 },
    { h: "'Righteous', sans-serif", b: "'Inter', sans-serif", w: 700 },
  ];
  const HEADING_SIZES = [
    { size: 130, ls: "-0.03em", tt: "none" as const },
    { size: 108, ls: "-0.02em", tt: "none" as const },
    { size: 84,  ls: "0.04em",  tt: "none" as const },
    { size: 70,  ls: "0.18em",  tt: "uppercase" as const },
  ];
  const ACCENTS = ["#FFD700", "#FF6B6B", "#6EE7B7", "#BAE6FD", "#FDA4AF", "#BEF264", "#FCD34D", "#FFFFFF"];
  const BADGES = ["pill", "sharp", "rotated", "circle", "underline"] as const;
  const TAGLINE_POS = ["above", "below", "footer"] as const;
  const VIGNETTES = ["edge", "bottom", "dual"] as const;
  const INTENSITIES = [0.35, 0.52, 0.68, 0.78];
  const GRADIENT_DIRS = [
    "linear-gradient(to top, {c} 0%, transparent 70%)",
    "linear-gradient(to bottom, {c} 0%, transparent 70%)",
    "linear-gradient(to left, {c} 0%, transparent 70%)",
    "linear-gradient(135deg, {c} 0%, transparent 70%)",
    "radial-gradient(ellipse at bottom, {c} 0%, transparent 70%)",
    "radial-gradient(ellipse at center, transparent 0%, {c} 80%)",
  ];
  return {
    layout: pick(LAYOUTS, 1),
    font: pick(FONTS, 7),
    heading: pick(HEADING_SIZES, 13),
    accent: pick(ACCENTS, 17),
    badge: pick(BADGES, 23),
    taglinePos: pick(TAGLINE_POS, 29),
    vignette: pick(VIGNETTES, 31),
    intensity: pick(INTENSITIES, 37),
    gradient: pick(GRADIENT_DIRS, 41),
    layoutIdx: Math.abs(seed) % 5,
  };
}

function PosterPreview({ style, copy, imgUrl, product, seed }: {
  style: PosterStyle; copy: PosterCopy; imgUrl: string | null; product: string; seed: number;
}) {
  const photo = imgUrl || "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200&q=80";
  const overlay = pickOverlayColor(product || copy.headline);
  const cfg = getRandomConfig(seed);
  const accent = cfg.accent;
  const fonts = { h: cfg.font.h, b: cfg.font.b };
  const dim = cfg.intensity;
  const layoutIdx = cfg.layoutIdx;
  const intensityIdx = [0.35, 0.52, 0.68, 0.78].indexOf(dim);
  const tintRgba = (a: number) => `rgba(${overlay.rgb},${a})`;
  const vignetteStyle =
    cfg.vignette === "edge"
      ? { boxShadow: "inset 0 0 120px rgba(0,0,0,0.6)" }
      : cfg.vignette === "bottom"
      ? { boxShadow: "inset 0 -200px 100px -40px rgba(0,0,0,0.7)" }
      : { boxShadow: "inset 0 -180px 80px -40px rgba(0,0,0,0.65), inset 0 120px 80px -40px rgba(0,0,0,0.5)" };

  // Common wrappers
  const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="relative overflow-hidden"
      style={{
        width: 1080,
        height: 1080,
        borderRadius: 28,
        ...vignetteStyle,
      }}
    >
      {children}
      {/* Noise grain overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: NOISE_SVG, opacity: 0.06, mixBlendMode: "overlay" }}
      />
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

  if (style === "Minimal Clean") {
    // Use the layout axis from cfg (5 distinct positions)
    const isTop = cfg.layout === "TOP_OVERLAY";
    const isCenter = cfg.layout === "CENTER_DRAMA";
    const isSplit = cfg.layout === "SPLIT";
    const align: "left" | "center" =
      cfg.layout === "BOTTOM_CENTER" || cfg.layout === "CENTER_DRAMA" ? "center" : "left";
    // Use color-intelligence tint applied with the chosen gradient direction
    const gradient = cfg.gradient.replaceAll("{c}", tintRgba(0.4 + dim));
    return (
      <Frame>
        {BgPhoto}
        {isSplit && (
          <div
            className="absolute"
            style={{ top: 0, bottom: 0, left: 0, width: "55%", background: tintRgba(0.55 + dim * 0.4) }}
          />
        )}
        <div className="absolute inset-0" style={{ background: gradient }} />
        <div className="absolute" style={{
          left: 56,
          right: isSplit ? "50%" : 56,
          ...(isTop ? { top: 80 } : isCenter ? { top: "50%", transform: "translateY(-50%)" } : { bottom: 80 }),
          color: "white", textAlign: align as "left" | "center",
        }}>
          {copy.tagline && (
            <div
              style={{
                fontFamily: fonts.b,
                fontStyle: "italic",
                fontSize: 22,
                order: cfg.taglinePos === "below" ? 2 : 0,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 18,
                textShadow: "0 2px 18px rgba(0,0,0,0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
              }}
            >
              {copy.tagline}
            </div>
          )}
          <div className={`flex items-end gap-6 ${align === "center" ? "justify-center flex-col" : "justify-between"}`}>
            <div
              style={{
                fontFamily: fonts.h,
                fontWeight: cfg.font.w,
                fontSize: cfg.heading.size,
                letterSpacing: cfg.heading.ls,
                textTransform: cfg.heading.tt,
                lineHeight: 0.95,
                textShadow: "0 4px 24px rgba(0,0,0,0.8)",
                maxWidth: align === "center" ? "100%" : "70%",
                color: cfg.taglinePos === "footer" ? accent : "white",
              }}
            >
              {copy.headline}
            </div>
            {copy.price && (
              <div
                style={{
                  background: cfg.badge === "underline" ? "transparent"
                    : cfg.badge === "circle" ? accent
                    : "rgba(255,255,255,0.18)",
                  backdropFilter: cfg.badge === "circle" || cfg.badge === "underline" ? undefined : "blur(20px)",
                  WebkitBackdropFilter: cfg.badge === "circle" || cfg.badge === "underline" ? undefined : "blur(20px)",
                  border: cfg.badge === "underline" ? "none" : "1px solid rgba(255,255,255,0.3)",
                  borderBottom: cfg.badge === "underline" ? `4px solid ${accent}` : undefined,
                  borderRadius:
                    cfg.badge === "pill" ? 999
                    : cfg.badge === "sharp" ? 6
                    : cfg.badge === "rotated" ? 8
                    : cfg.badge === "circle" ? "50%"
                    : 0,
                  transform: cfg.badge === "rotated" ? "rotate(-3deg)" : undefined,
                  width: cfg.badge === "circle" ? 130 : undefined,
                  height: cfg.badge === "circle" ? 130 : undefined,
                  display: cfg.badge === "circle" ? "flex" : undefined,
                  alignItems: cfg.badge === "circle" ? "center" : undefined,
                  justifyContent: cfg.badge === "circle" ? "center" : undefined,
                  padding: cfg.badge === "circle" ? 0 : cfg.badge === "underline" ? "4px 2px" : "16px 28px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: cfg.badge === "circle" ? 28 : 30,
                  color: cfg.badge === "circle" ? "#0a0a0a" : "white",
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                {copy.price}
              </div>
            )}
          </div>
          {cfg.taglinePos === "footer" && copy.tagline && (
            <div style={{
              marginTop: 28,
              fontFamily: fonts.b,
              fontStyle: "italic",
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            }}>
              — {copy.tagline}
            </div>
          )}
        </div>
      </Frame>
    );
  }

  if (style === "Bold & Bright") {
    const ribbonAlign = layoutIdx % 2 === 0 ? "left" : "center";
    return (
      <Frame>
        {BgPhoto}
        <div className="absolute inset-0" style={{
          background: layoutIdx === 2
            ? "radial-gradient(ellipse at bottom left, rgba(0,0,0,0) 25%, rgba(0,0,0,0.7) 100%)"
            : "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)",
        }} />
        {/* NEW DROP badge */}
        <div
          className="absolute"
          style={{
            top: 48,
            right: 48,
            background: accent === "#FFFFFF" ? "#FF3B30" : accent,
            color: accent === "#FFFFFF" ? "white" : "#0a0a0a",
            padding: "14px 28px",
            borderRadius: layoutIdx === 0 ? 999 : layoutIdx === 1 ? 4 : layoutIdx === 2 ? 50 : 999,
            transform: layoutIdx === 3 ? "rotate(-3deg)" : "none",
            fontFamily: fonts.h,
            fontSize: 28,
            letterSpacing: "0.25em",
            boxShadow: "0 8px 24px rgba(230,57,70,0.5)",
          }}
        >
          NEW DROP
        </div>
        {/* Diagonal color stripe at bottom */}
        <div
          className="absolute"
          style={{
            left: -40,
            right: -40,
            bottom: 130,
            height: 280,
            background: overlay.hex,
            transform: "skewY(-6deg)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
          }}
        />
        <div
          className="absolute"
          style={{ left: 56, right: 56, bottom: 130, color: "white", textAlign: ribbonAlign as "left" | "center" }}
        >
          <div
            style={{
              fontFamily: fonts.h,
              fontWeight: 900,
              fontSize: [110, 130, 150, 130][intensityIdx] ?? 130,
              lineHeight: 0.88,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              textShadow: "0 6px 24px rgba(0,0,0,0.6)",
            }}
          >
            {copy.headline}
          </div>
          {copy.tagline && (
            <div
              style={{
                fontFamily: fonts.b,
                fontWeight: 500,
                fontSize: 24,
                color: "rgba(255,255,255,0.85)",
                marginTop: 12,
                maxWidth: "85%",
                textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              }}
            >
              {copy.tagline}
            </div>
          )}
          <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
            {copy.price && (
              <div
                style={{
                  fontFamily: fonts.h,
                  fontSize: 84,
                  color: accent,
                  letterSpacing: "-0.01em",
                  textShadow: "0 4px 16px rgba(0,0,0,0.6)",
                }}
              >
                {copy.price}
              </div>
            )}
            <div
              style={{
                background: accent,
                color: accent === "#FFFFFF" ? "#0a0a0a" : "#0a0a0a",
                padding: "20px 36px",
                borderRadius: 12,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 36,
                letterSpacing: "0.15em",
                fontWeight: 700,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {copy.cta} →
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  if (style === "Rustic Handmade") {
    return (
      <Frame>
        {BgPhoto}
        {/* Sepia warm overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(101,67,33,0.25) 0%, rgba(101,67,33,0.45) 60%, rgba(60,40,20,0.7) 100%)",
          }}
        />
        {/* Top label */}
        <div
          className="absolute"
          style={{
            top: 56,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(255,245,225,0.95)",
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 28,
            letterSpacing: "0.15em",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          ~ handmade with love ~
        </div>
        {/* Torn paper band */}
        <div
          className="absolute"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: 420,
            background: "#F8F0DC",
            clipPath:
              "polygon(0 8%, 4% 4%, 9% 9%, 14% 3%, 20% 7%, 26% 2%, 32% 8%, 38% 4%, 44% 9%, 50% 3%, 56% 8%, 62% 4%, 68% 9%, 74% 3%, 80% 7%, 86% 4%, 92% 9%, 96% 5%, 100% 8%, 100% 100%, 0 100%)",
            boxShadow: "0 -10px 30px rgba(0,0,0,0.25)",
          }}
        />
        {/* Stamped circle */}
        {copy.price && (
          <div
            className="absolute"
            style={{
              right: 70,
              bottom: 290,
              width: 170,
              height: 170,
              borderRadius: "50%",
              border: "4px double #5C3A1E",
              color: "#5C3A1E",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Playfair Display', serif",
              transform: "rotate(-8deg)",
              background: "rgba(248,240,220,0.85)",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: "0.3em", marginBottom: 4 }}>ONLY</div>
            <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{copy.price}</div>
          </div>
        )}
        {/* Headline on band */}
        <div
          className="absolute"
          style={{
            left: 70,
            right: 70,
            bottom: 180,
            color: "#3D2410",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            {copy.headline}
          </div>
          {copy.tagline && (
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 28,
                color: "#6B4A2B",
                marginTop: 16,
              }}
            >
              {copy.tagline}
            </div>
          )}
          <div
            style={{
              marginTop: 24,
              display: "inline-block",
              border: "2px solid #5C3A1E",
              padding: "12px 32px",
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#5C3A1E",
            }}
          >
            {copy.cta}
          </div>
        </div>
      </Frame>
    );
  }

  // Flash Sale
  return (
    <Frame>
      {BgPhoto}
      {/* Aggressive dark overlay */}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${0.5 + dim * 0.3})` }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Diagonal SALE banner */}
      <div
        className="absolute"
        style={{
          top: 90,
          left: -120,
          width: 600,
          padding: "22px 0",
          background: "#FFE000",
          color: "#0a0a0a",
          textAlign: "center",
          fontFamily: "'Anton', sans-serif",
          fontSize: 64,
          letterSpacing: "0.1em",
          transform: "rotate(-25deg)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        ⚡ FLASH DEAL
      </div>
      {/* Bottom content */}
      <div className="absolute" style={{ left: 56, right: 56, bottom: 120, color: "white" }}>
        <div
          style={{
            fontFamily: "'Anton', sans-serif",
            fontWeight: 900,
            fontSize: 130,
            lineHeight: 0.9,
            textTransform: "uppercase",
            textShadow: "0 4px 20px rgba(0,0,0,0.8)",
            letterSpacing: "-0.01em",
          }}
        >
          {copy.headline}
        </div>
        {copy.price && (
          <div className="flex items-baseline gap-6" style={{ marginTop: 24 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 36,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "line-through",
              }}
            >
              was {fakeOriginal(copy.price)}
            </div>
            <div
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 160,
                color: "#FFE000",
                lineHeight: 0.9,
                textShadow: "0 0 30px rgba(255,224,0,0.6), 0 4px 20px rgba(0,0,0,0.8)",
                animation: "pulseGlow 1.6s ease-in-out infinite",
              }}
            >
              {copy.price}
            </div>
            <style>{`@keyframes pulseGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}`}</style>
          </div>
        )}
        <div
          className="text-center"
          style={{
            marginTop: 28,
            background: "#FF0000",
            color: "white",
            padding: "22px 0",
            borderRadius: 12,
            fontFamily: "'Anton', sans-serif",
            fontSize: 48,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            boxShadow: "0 10px 30px rgba(255,0,0,0.5)",
          }}
        >
          Order Now ⚡
        </div>
      </div>
    </Frame>
  );
}

function fakeOriginal(price: string): string {
  const m = price.match(/(\D*)([\d.,]+)(.*)/);
  if (!m) return price;
  const num = parseFloat(m[2].replace(/,/g, ""));
  if (!isFinite(num) || num <= 0) return price;
  const inflated = (num * 1.3).toFixed(num >= 10 ? 0 : 2);
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