import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ms" | "zh";

export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ms", flag: "🇲🇾", label: "Bahasa Malaysia" },
  { code: "zh", flag: "🇨🇳", label: "简体中文" },
];

type Dict = Record<string, { en: string; ms: string; zh: string }>;

const D: Dict = {
  // Nav
  "nav.home": { en: "Home", ms: "Utama", zh: "主页" },
  "nav.studio": { en: "Studio", ms: "Studio", zh: "创作室" },
  "nav.profit": { en: "Profit", ms: "Keuntungan", zh: "利润" },
  "nav.stock": { en: "Stock", ms: "Stok", zh: "库存" },
  "nav.settings": { en: "Settings", ms: "Tetapan", zh: "设置" },
  "nav.tagline": { en: "Built for Malaysian micro-entrepreneurs ❤️", ms: "Dibina untuk usahawan mikro Malaysia ❤️", zh: "为马来西亚微型创业者而建 ❤️" },

  // Greetings
  "g.morning": { en: "Good morning", ms: "Selamat pagi", zh: "早上好" },
  "g.afternoon": { en: "Good afternoon", ms: "Selamat tengah hari", zh: "下午好" },
  "g.evening": { en: "Good evening", ms: "Selamat petang", zh: "晚上好" },
  "home.subtitle": { en: "What do you want to do today? Let's grow your business.", ms: "Apa nak buat hari ini? Mari kembangkan perniagaan anda.", zh: "今天想做什么？让我们一起发展业务。" },
  "home.quickActions": { en: "Quick actions", ms: "Tindakan pantas", zh: "快速操作" },
  "home.gen.caption": { en: "Generate Caption", ms: "Jana Kapsyen", zh: "生成文案" },
  "home.gen.caption.sub": { en: "Write a post", ms: "Tulis caption", zh: "撰写帖子" },
  "home.gen.poster": { en: "Create Poster", ms: "Cipta Poster", zh: "创建海报" },
  "home.gen.poster.sub": { en: "Design product art", ms: "Buat poster", zh: "设计产品图" },
  "home.gen.profit": { en: "Calculate Profit", ms: "Kira Keuntungan", zh: "计算利润" },
  "home.gen.profit.sub": { en: "Price with confidence", ms: "Kira untung", zh: "自信定价" },
  "home.gen.stock": { en: "Update Stock", ms: "Kemaskini Stok", zh: "更新库存" },
  "home.gen.stock.sub": { en: "Track inventory", ms: "Update stok", zh: "追踪库存" },
  "home.thisMonth": { en: "This month", ms: "Bulan ini", zh: "本月" },
  "home.firstPost": { en: "Let's create your first post! 🚀", ms: "Mari cipta post pertama anda! 🚀", zh: "让我们创建您的第一个帖子！🚀" },
  "home.postsCreated": { en: "{n} posts created 🎉", ms: "{n} post telah dicipta 🎉", zh: "已创建 {n} 个帖子 🎉" },
  "home.recent": { en: "Recent activity", ms: "Aktiviti terkini", zh: "最近活动" },
  "home.empty": { en: "Nothing yet — your generated captions and posters will appear here.", ms: "Belum ada — kapsyen dan poster anda akan muncul di sini.", zh: "暂无 — 您生成的文案和海报将显示在这里。" },

  // Studio
  "studio.title": { en: "Content Studio", ms: "Studio Kandungan", zh: "内容创作室" },
  "studio.sub": { en: "AI-powered content for your store", ms: "Kandungan berkuasa AI untuk kedai anda", zh: "AI 驱动的店铺内容生成" },
  "studio.tab.caption": { en: "Caption", ms: "Kapsyen", zh: "文案" },
  "studio.tab.poster": { en: "Poster", ms: "Poster", zh: "海报" },
  "studio.tab.blast": { en: "Blast", ms: "Blast", zh: "群发" },

  "f.product": { en: "Product name", ms: "Nama produk", zh: "产品名称" },
  "f.shortDesc": { en: "Short description", ms: "Penerangan ringkas", zh: "简短描述" },
  "f.optional": { en: "(optional)", ms: "(pilihan)", zh: "（可选）" },
  "f.platform": { en: "Platform", ms: "Platform", zh: "平台" },
  "f.tone": { en: "Tone", ms: "Nada", zh: "语气" },
  "tone.friendly": { en: "Friendly & Casual", ms: "Mesra & Santai", zh: "友好随意" },
  "tone.pro": { en: "Professional", ms: "Profesional", zh: "专业" },
  "tone.cute": { en: "Cute & Playful", ms: "Comel & Ceria", zh: "可爱活泼" },
  "tone.urgent": { en: "Urgent (Flash Sale)", ms: "Segera (Flash Sale)", zh: "紧迫（闪购）" },
  "f.lang": { en: "Language", ms: "Bahasa", zh: "语言" },
  "lang.en": { en: "English", ms: "Inggeris", zh: "英文" },
  "lang.ms": { en: "Bahasa", ms: "Bahasa", zh: "马来文" },
  "lang.both": { en: "Bilingual", ms: "Dwibahasa", zh: "双语" },
  "btn.genCaption": { en: "Generate Caption", ms: "Jana Kapsyen", zh: "生成文案" },
  "btn.copy": { en: "Copy", ms: "Salin", zh: "复制" },
  "btn.regen": { en: "Regenerate", ms: "Jana Semula", zh: "重新生成" },
  "btn.save": { en: "Save", ms: "Simpan", zh: "保存" },
  "btn.genHashtags": { en: "Generate Hashtags", ms: "Jana Hashtag", zh: "生成标签" },
  "label.variation": { en: "Variation", ms: "Variasi", zh: "版本" },
  "label.hashtags": { en: "Hashtags", ms: "Hashtag", zh: "标签" },
  "btn.copyAll": { en: "Copy all", ms: "Salin semua", zh: "全部复制" },

  // Poster
  "p.photo": { en: "Product photo", ms: "Foto produk", zh: "产品照片" },
  "p.upload": { en: "Tap to upload or drag photo here", ms: "Ketik untuk muat naik atau seret foto ke sini", zh: "点击上传或拖放照片到此处" },
  "p.uploadSub": { en: "JPG, PNG up to ~5MB", ms: "JPG, PNG sehingga ~5MB", zh: "JPG、PNG 最大约 5MB" },
  "p.price": { en: "Price", ms: "Harga", zh: "价格" },
  "p.tagline": { en: "Tagline hint", ms: "Petunjuk tagline", zh: "标语提示" },
  "p.taglineSub": { en: "(optional, AI will polish)", ms: "(pilihan, AI akan perhalusi)", zh: "（可选，AI 将优化）" },
  "p.style": { en: "Poster style", ms: "Gaya poster", zh: "海报风格" },
  "p.style.minimal": { en: "Minimal Clean", ms: "Minimalis Bersih", zh: "简约干净" },
  "p.style.bold": { en: "Bold & Bright", ms: "Tebal & Cerah", zh: "大胆明亮" },
  "p.style.rustic": { en: "Rustic Handmade", ms: "Buatan Tangan Rustik", zh: "复古手工" },
  "p.style.flash": { en: "Flash Sale", ms: "Flash Sale", zh: "闪购促销" },
  "p.gen": { en: "Generate Poster", ms: "Jana Poster", zh: "生成海报" },
  "p.designing": { en: "Designing your poster...", ms: "Mereka bentuk poster anda...", zh: "正在设计您的海报..." },
  "p.download": { en: "Download Poster", ms: "Muat Turun Poster", zh: "下载海报" },
  "p.downloading": { en: "Downloading...", ms: "Memuat turun...", zh: "下载中..." },
  "p.tryStyle": { en: "Try another style", ms: "Cuba gaya lain", zh: "尝试其他风格" },

  // Blast
  "b.avail": { en: "Availability", ms: "Ketersediaan", zh: "库存状态" },
  "b.instock": { en: "In stock", ms: "Ada stok", zh: "有货" },
  "b.limited": { en: "Limited", ms: "Terhad", zh: "有限" },
  "b.lastfew": { en: "Last few", ms: "Tinggal sedikit", zh: "剩余不多" },
  "b.gen": { en: "Generate Blast Message", ms: "Jana Mesej Blast", zh: "生成群发消息" },
  "b.writing": { en: "Writing your blast...", ms: "Menulis mesej anda...", zh: "正在撰写消息..." },

  // Calculator
  "calc.title": { en: "Business Calculator", ms: "Kalkulator Perniagaan", zh: "商业计算器" },
  "calc.sub": { en: "Know your numbers, price with confidence.", ms: "Kenali nombor anda, harga dengan yakin.", zh: "了解你的数据，自信定价。" },
  "calc.tab.profit": { en: "Profit Calculator", ms: "Kalkulator Untung", zh: "利润计算器" },
  "calc.tab.saved": { en: "Saved Products", ms: "Produk Disimpan", zh: "已保存产品" },
  "calc.s1": { en: "What are you selling?", ms: "Apa yang anda jual?", zh: "你在卖什么？" },
  "calc.s2": { en: "Add your ingredients & materials", ms: "Tambah bahan & material anda", zh: "添加食材和材料" },
  "calc.addItem": { en: "Add item", ms: "Tambah item", zh: "添加项目" },
  "calc.s3": { en: "How many units does this batch make?", ms: "Berapa unit yang dihasilkan dalam satu batch?", zh: "这批能做多少单位？" },
  "calc.s4": { en: "Any other costs?", ms: "Ada kos lain?", zh: "还有其他费用吗？" },
  "calc.s4.sub": { en: "delivery, sticker labels, marketing — optional", ms: "penghantaran, label, pemasaran — pilihan", zh: "运费、标签、营销 — 可选" },
  "calc.perUnit": { en: "Cost per unit", ms: "Kos per unit", zh: "每单位成本" },
  "calc.batchTotal": { en: "Batch total", ms: "Jumlah batch", zh: "批次总计" },
  "calc.suggestPrice": { en: "Suggested selling price", ms: "Harga jualan yang dicadangkan", zh: "建议售价" },
  "calc.breakdown": { en: "Cost breakdown", ms: "Pecahan Kos", zh: "成本明细" },
  "calc.aiTip": { en: "Get AI tip", ms: "Dapatkan tip AI", zh: "获取 AI 建议" },
  "calc.thinking": { en: "Thinking...", ms: "Berfikir...", zh: "思考中..." },
  "calc.saveProduct": { en: "Save this product", ms: "Simpan produk ini", zh: "保存此产品" },
  "calc.margin": { en: "margin", ms: "margin", zh: "利润率" },
  "calc.noSaved": { en: "No saved products yet. Calculate one and hit Save!", ms: "Tiada produk disimpan lagi. Kira satu dan tekan Simpan!", zh: "还没有保存的产品。计算一个并保存！" },

  // Inventory
  "inv.title": { en: "Inventory", ms: "Inventori", zh: "库存" },
  "inv.sub": { en: "Simple stock tracking — no spreadsheets needed", ms: "Penjejakan stok mudah — tiada spreadsheet diperlukan", zh: "简单库存追踪 — 无需电子表格" },
  "inv.products": { en: "Products", ms: "Produk", zh: "产品" },
  "inv.soldToday": { en: "Sold today", ms: "Dijual hari ini", zh: "今日销售" },
  "inv.lowStock": { en: "Low stock", ms: "Stok Rendah", zh: "库存不足" },
  "inv.add": { en: "Add stock entry", ms: "Tambah entri stok", zh: "添加库存记录" },
  "inv.product": { en: "Product", ms: "Produk", zh: "产品" },
  "inv.pickSaved": { en: "Pick saved or type custom", ms: "Pilih yang disimpan atau taip sendiri", zh: "选择已保存或自定义输入" },
  "inv.orType": { en: "Or type a product name", ms: "Atau taip nama produk", zh: "或输入产品名称" },
  "inv.stockAdded": { en: "Stock added", ms: "Stok ditambah", zh: "新增库存" },
  "inv.notes": { en: "Notes", ms: "Nota", zh: "备注" },
  "inv.saveEntry": { en: "Save entry", ms: "Simpan entri", zh: "保存记录" },
  "inv.thisWeek": { en: "This week", ms: "Minggu ini", zh: "本周" },
  "inv.recent": { en: "Recent entries", ms: "Entri Terkini", zh: "最近记录" },
  "inv.empty": { en: "No products yet! Add your first item 📦", ms: "Tiada produk lagi! Tambah item pertama anda 📦", zh: "还没有产品！添加您的第一个项目 📦" },

  // Settings
  "set.title": { en: "Settings", ms: "Tetapan", zh: "设置" },
  "set.sub": { en: "Personalise your SellerAI experience.", ms: "Peribadikan pengalaman SellerAI anda.", zh: "个性化您的 SellerAI 体验。" },
  "set.darkMode": { en: "Dark mode", ms: "Mod gelap", zh: "深色模式" },
  "set.dark": { en: "Currently dark 🌙", ms: "Gelap sekarang 🌙", zh: "当前深色 🌙" },
  "set.light": { en: "Currently light ☀️", ms: "Terang sekarang ☀️", zh: "当前浅色 ☀️" },
  "set.appLang": { en: "App Language", ms: "Bahasa Aplikasi", zh: "应用语言" },
  "set.appLangSub": { en: "Choose your preferred language for the app interface", ms: "Pilih bahasa pilihan anda untuk antara muka aplikasi", zh: "选择您偏好的应用界面语言" },
  "set.profile": { en: "Business profile", ms: "Profil perniagaan", zh: "商业资料" },
  "set.profileSub": { en: "We use this to personalise AI outputs.", ms: "Kami gunakan ini untuk peribadikan output AI.", zh: "我们用此个性化 AI 输出内容。" },
  "set.bizName": { en: "Business name", ms: "Nama perniagaan", zh: "商业名称" },
  "set.whatSell": { en: "What do you sell?", ms: "Apa yang anda jual?", zh: "您卖什么？" },
  "cat.baked": { en: "Baked Goods", ms: "Barangan Bakeri", zh: "烘焙食品" },
  "cat.handcraft": { en: "Handcraft", ms: "Kraftangan", zh: "手工艺品" },
  "cat.fresh": { en: "Fresh Produce", ms: "Hasil Segar", zh: "新鲜农产品" },
  "cat.clothing": { en: "Clothing", ms: "Pakaian", zh: "服装" },
  "cat.other": { en: "Other", ms: "Lain-lain", zh: "其他" },
  "set.platform": { en: "Primary platform", ms: "Platform utama", zh: "主要平台" },
  "set.saveProfile": { en: "Save profile", ms: "Simpan profil", zh: "保存资料" },
  "set.profileSaved": { en: "Profile saved! 🎉", ms: "Profil disimpan! 🎉", zh: "资料已保存！🎉" },
  "set.clear": { en: "Clear all saved data", ms: "Padam semua data", zh: "清除所有保存的数据" },
  "set.clearConfirm": { en: "Delete all saved data? This can't be undone.", ms: "Padam semua data? Tidak boleh dibatalkan.", zh: "删除所有保存的数据？无法撤销。" },
  "set.cleared": { en: "All data cleared", ms: "Semua data dipadam", zh: "所有数据已清除" },
  "set.about": { en: "About", ms: "Tentang", zh: "关于" },

  // Toasts / errors
  "t.captionCopied": { en: "Caption copied! ✅", ms: "Kapsyen disalin! ✅", zh: "文案已复制！✅" },
  "t.posterSaved": { en: "Poster saved! 🎉", ms: "Poster disimpan! 🎉", zh: "海报已保存！🎉" },
  "t.posterDownloaded": { en: "Poster downloaded! 🎉", ms: "Poster dimuat turun! 🎉", zh: "海报已下载！🎉" },
  "t.captionSaved": { en: "Caption saved! 🎉", ms: "Kapsyen disimpan! 🎉", zh: "文案已保存！🎉" },
  "t.msgCopied": { en: "Message copied! ✅", ms: "Mesej disalin! ✅", zh: "消息已复制！✅" },
  "t.hashCopied": { en: "Hashtags copied! ✅", ms: "Hashtag disalin! ✅", zh: "标签已复制！✅" },
  "t.tryAgain": { en: "Oops, let's try that again! 🔄", ms: "Alamak, cuba lagi! 🔄", zh: "哎呀，让我们再试一次！🔄" },
  "t.needProduct": { en: "Tell us your product name first 🙏", ms: "Beritahu nama produk dahulu 🙏", zh: "请先告诉我们产品名称 🙏" },
  "t.deleted": { en: "Deleted", ms: "Dipadam", zh: "已删除" },
  "t.stockUpdated": { en: "Stock updated! 📦", ms: "Stok dikemaskini! 📦", zh: "库存已更新！📦" },
  "t.pickProduct": { en: "Pick or type a product", ms: "Pilih atau taip produk", zh: "选择或输入产品" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sellerai_language") as Lang | null;
      if (stored === "en" || stored === "ms" || stored === "zh") setLangState(stored);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("sellerai_language", l); } catch {}
  };
  const t = (key: string, vars?: Record<string, string | number>) => {
    const entry = D[key];
    let s = entry ? entry[lang] : key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, String(vars[k]));
    return s;
  };
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be inside I18nProvider");
  return ctx;
}