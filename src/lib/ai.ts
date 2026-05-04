import { supabase } from "@/integrations/supabase/client";
import type { BusinessProfile } from "./storage";

export type AITask =
  | "captions"
  | "hashtags"
  | "blast"
  | "poster"
  | "tip";

export async function callAI(task: AITask, payload: Record<string, unknown>, profile: BusinessProfile) {
  const { data, error } = await supabase.functions.invoke("ai-generate", {
    body: { task, payload, profile },
  });
  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 429) throw new Error("Too many requests — give it a moment and try again 🙏");
    if (status === 402) throw new Error("AI credits ran out. Add credits in Settings → Workspace → Usage.");
    throw new Error(error.message || "AI failed");
  }
  return data as { result: unknown };
}