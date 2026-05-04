import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, hydrated]);

  const reset = useCallback(() => setValue(initial), [initial]);
  return [value, setValue, reset, hydrated] as const;
}

export type BusinessProfile = {
  businessName: string;
  category: "Baked Goods" | "Handcraft" | "Fresh Produce" | "Clothing" | "Other";
  platform: "Instagram" | "Facebook" | "WhatsApp" | "TikTok";
  language: "en" | "ms";
};

export const defaultProfile: BusinessProfile = {
  businessName: "",
  category: "Baked Goods",
  platform: "Instagram",
  language: "en",
};

export type ActivityItem = {
  id: string;
  type: "caption" | "poster" | "blast" | "product" | "stock";
  title: string;
  preview?: string;
  createdAt: number;
};

export type SavedProduct = {
  id: string;
  name: string;
  ingredients: { name: string; cost: number }[];
  units: number;
  extraCosts: number;
  createdAt: number;
};

export type StockEntry = {
  id: string;
  product: string;
  stock: number;
  soldToday: number;
  notes?: string;
  updatedAt: number;
};