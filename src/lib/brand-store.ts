// Simple client-side brand config store using localStorage

export interface BrandConfig {
  brandName: string;
  brandUrl: string;
  brandDescription: string;
  industry: string;
  keywords: string[];
  competitors: string[];
  platforms: string[];
}

const DEFAULT_CONFIG: BrandConfig = {
  brandName: "",
  brandUrl: "",
  brandDescription: "",
  industry: "SaaS / Software",
  keywords: [],
  competitors: [],
  platforms: ["chatgpt", "gemini", "perplexity", "claude", "copilot", "llama"],
};

const STORAGE_KEY = "brandai_config";

export function getBrandConfig(): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

export function saveBrandConfig(config: Partial<BrandConfig>): BrandConfig {
  const current = getBrandConfig();
  const updated = { ...current, ...config };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function isConfigured(): boolean {
  const config = getBrandConfig();
  return !!config.brandName && config.keywords.length > 0;
}
