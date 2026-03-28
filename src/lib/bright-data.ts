const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN!;
const BRIGHT_DATA_BASE = "https://api.brightdata.com";

export interface ScrapedMention {
  url: string;
  title: string;
  snippet: string;
  platform: string;
  date: string;
}

export interface BrandSearchResult {
  query: string;
  results: ScrapedMention[];
  totalResults: number;
}

async function brightDataRequest(endpoint: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BRIGHT_DATA_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bright Data error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function searchBrandMentions(
  brandName: string,
  keywords: string[]
): Promise<BrandSearchResult[]> {
  const results: BrandSearchResult[] = [];

  for (const keyword of keywords.slice(0, 5)) {
    const query = `${brandName} ${keyword}`;

    try {
      const data = (await brightDataRequest("/datasets/v3/trigger", {
        dataset_id: "gd_l1viktl72bvl7bjuj0",
        data: [{ keyword: query, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }],
        format: "json",
        include_errors: false,
      })) as { snapshot_id?: string };

      if (data.snapshot_id) {
        // Poll for results
        const snapshotData = await pollSnapshot(data.snapshot_id);
        const searchResults = Array.isArray(snapshotData) ? snapshotData : [];

        results.push({
          query,
          totalResults: searchResults.length,
          results: searchResults.slice(0, 10).map((r: Record<string, string>) => ({
            url: r.url || r.link || "",
            title: r.title || "",
            snippet: r.description || r.snippet || "",
            platform: detectPlatform(r.url || r.link || ""),
            date: r.date || new Date().toISOString(),
          })),
        });
      }
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      results.push({ query, totalResults: 0, results: [] });
    }
  }

  return results;
}

async function pollSnapshot(snapshotId: string, maxAttempts = 10): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const res = await fetch(
      `${BRIGHT_DATA_BASE}/datasets/v3/snapshot/${snapshotId}?format=json`,
      {
        headers: {
          Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        },
      }
    );

    if (res.status === 200) {
      return res.json();
    }
    // 202 means still processing
    if (res.status !== 202) {
      throw new Error(`Snapshot poll failed with status ${res.status}`);
    }
  }

  return [];
}

function detectPlatform(url: string): string {
  if (url.includes("chat.openai.com") || url.includes("chatgpt")) return "ChatGPT";
  if (url.includes("gemini.google") || url.includes("bard.google")) return "Google Gemini";
  if (url.includes("perplexity.ai")) return "Perplexity";
  if (url.includes("claude.ai") || url.includes("anthropic")) return "Claude";
  if (url.includes("copilot.microsoft") || url.includes("bing.com/chat")) return "Microsoft Copilot";
  if (url.includes("meta.ai")) return "Meta AI";
  if (url.includes("reddit.com")) return "Reddit";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X/Twitter";
  return "Web";
}

export async function scrapeUrl(url: string): Promise<{
  title: string;
  description: string;
  headings: string[];
  content: string;
  structuredData: boolean;
  faqSchema: boolean;
  metaTags: Record<string, string>;
}> {
  try {
    const data = (await brightDataRequest("/datasets/v3/trigger", {
      dataset_id: "gd_l1viktl72bvl7bjuj0",
      data: [{ url }],
      format: "json",
      include_errors: false,
    })) as { snapshot_id?: string };

    if (data.snapshot_id) {
      const result = await pollSnapshot(data.snapshot_id);
      const page = (Array.isArray(result) ? result[0] : result) as Record<string, unknown> | undefined;

      if (page) {
        const html = (page.html as string) || (page.text as string) || "";

        // Extract headings (h1-h6) from HTML
        const headingMatches = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [];
        const headings = headingMatches.map((h) =>
          h.replace(/<[^>]+>/g, "").trim()
        ).filter(Boolean);

        // Extract meta tags
        const metaTags: Record<string, string> = {};
        const metaMatches = html.matchAll(/<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*?)["'][^>]*>/gi);
        for (const m of metaMatches) {
          metaTags[m[1]] = m[2];
        }

        // Detect structured data (JSON-LD)
        const hasJsonLd = /<script\s+type=["']application\/ld\+json["']>/i.test(html);

        // Detect FAQ schema
        const hasFaq = /FAQPage/i.test(html);

        return {
          title: (page.title as string) || metaTags["og:title"] || "",
          description: (page.description as string) || metaTags["description"] || metaTags["og:description"] || "",
          headings,
          content: (page.text as string) || "",
          structuredData: hasJsonLd,
          faqSchema: hasFaq,
          metaTags,
        };
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }

  return {
    title: "",
    description: "",
    headings: [],
    content: "",
    structuredData: false,
    faqSchema: false,
    metaTags: {},
  };
}

export async function searchWebForBrand(
  brandName: string,
  query: string
): Promise<ScrapedMention[]> {
  try {
    const data = (await brightDataRequest("/datasets/v3/trigger", {
      dataset_id: "gd_l1viktl72bvl7bjuj0",
      data: [
        {
          keyword: `"${brandName}" ${query}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(`"${brandName}" ${query}`)}`,
        },
      ],
      format: "json",
      include_errors: false,
    })) as { snapshot_id?: string };

    if (data.snapshot_id) {
      const result = await pollSnapshot(data.snapshot_id);
      const items = Array.isArray(result) ? result : [];

      return items.slice(0, 10).map((r: Record<string, string>) => ({
        url: r.url || r.link || "",
        title: r.title || "",
        snippet: r.description || r.snippet || "",
        platform: detectPlatform(r.url || r.link || ""),
        date: r.date || new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.error("searchWebForBrand error:", error);
  }

  return [];
}
