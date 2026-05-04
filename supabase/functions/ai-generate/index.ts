// Lovable AI Gateway edge function — generates captions, hashtags, blast messages, poster copy, tips
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Profile = {
  businessName?: string;
  category?: string;
  platform?: string;
  language?: string;
};

function buildPrompt(task: string, payload: Record<string, unknown>, profile: Profile) {
  const businessLine = profile?.businessName
    ? `Business: ${profile.businessName} (${profile.category ?? "small business"}). Primary platform: ${profile.platform ?? "Instagram"}.`
    : `Small Malaysian micro-entrepreneur.`;

  switch (task) {
    case "captions": {
      const { product, description, platform, tone, language } = payload as Record<string, string>;
      const langInstr =
        language === "ms"
          ? "Write all 3 captions in natural conversational Bahasa Malaysia (not overly formal)."
          : language === "both"
          ? "Write 3 BILINGUAL captions: each one starts with English, then a line break, then the same message in conversational Bahasa Malaysia."
          : "Write all 3 captions in friendly English with a Malaysian flavour.";
      return `${businessLine}\n\nGenerate 3 distinct social media captions for ${platform}.\nProduct: ${product}\nDetails: ${description || "(none)"}\nTone: ${tone}\n${langInstr}\nUse appropriate emojis. Each caption must end with a clear call-to-action (DM, WhatsApp, etc.).\nReturn ONLY a JSON array of 3 strings, no extra commentary.`;
    }
    case "hashtags": {
      const { product, platform } = payload as Record<string, string>;
      return `${businessLine}\n\nGenerate 18 highly relevant hashtags for "${product}" on ${platform}. Mix Malaysian local hashtags (e.g. #malaysianseller, #kedaiviralmy, #shopmalaysia) with niche product-specific ones. Return ONLY a JSON array of 18 strings, each starting with #.`;
    }
    case "blast": {
      const { product, price, availability, language } = payload as Record<string, string>;
      const langInstr =
        language === "ms"
          ? "Write in conversational Bahasa Malaysia."
          : language === "both"
          ? "Write a bilingual message: English first, then Bahasa Malaysia version below."
          : "Write in friendly English with a Malaysian flavour.";
      return `${businessLine}\n\nWrite a WhatsApp/Telegram broadcast message to sell: ${product}.\nPrice: ${price || "(not stated)"}\nAvailability: ${availability}\n${langInstr}\nUse emojis, line breaks, urgency language, and end with a clear CTA like "DM me to order!". Return ONLY the message text, no explanations.`;
    }
    case "poster": {
      const { product, price, style, tagline } = payload as Record<string, string>;
      return `${businessLine}\n\nGenerate poster copy for "${product}" in a "${style}" style. ${tagline ? `User tagline hint: ${tagline}.` : ""} Return ONLY a JSON object with this shape:\n{ "headline": "max 4 words, punchy", "tagline": "max 10 words, descriptive", "cta": "max 3 words", "price": "${price || ""}" }`;
    }
    case "tip": {
      const { breakdown } = payload as { breakdown: { ingredients: { name: string; cost: number }[]; units: number; extra: number; totalCost: number } };
      return `${businessLine}\n\nGiven this cost breakdown for a batch:\n${JSON.stringify(breakdown)}\n\nGive ONE concise (1-2 sentence) practical tip for the seller to improve their margins. Be encouraging and specific (mention an ingredient or cost line). Return ONLY plain text.`;
    }
    default:
      throw new Error("Unknown task");
  }
}

function tryParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {}
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1]) as T;
    } catch {}
  }
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      return JSON.parse(arr[0]) as T;
    } catch {}
  }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      return JSON.parse(obj[0]) as T;
    } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task, payload, profile } = await req.json();
    const userPrompt = buildPrompt(task, payload || {}, profile || {});

    const systemPrompt =
      "You are a helpful marketing and business assistant for small Malaysian micro-entrepreneurs and home-based sellers. Keep language friendly, practical and encouraging. Default to Malaysian context — reference local platforms like WhatsApp, Shopee, and Facebook groups. If generating in Bahasa Malaysia, use natural conversational BM, not overly formal. Always follow the output format requested exactly.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway failure" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const text: string = aiJson?.choices?.[0]?.message?.content ?? "";

    let result: unknown = text;
    if (task === "captions" || task === "hashtags") {
      result = tryParseJSON<string[]>(text) ?? text.split("\n").filter((l) => l.trim()).slice(0, task === "hashtags" ? 18 : 3);
    } else if (task === "poster") {
      result = tryParseJSON<Record<string, string>>(text) ?? { headline: text.slice(0, 30), tagline: "", cta: "Order Now", price: "" };
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});