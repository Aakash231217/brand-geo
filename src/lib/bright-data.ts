const BRIGHT_DATA_API_TOKEN: string = (() => {
  const token = process.env.BRIGHT_DATA_API_TOKEN;
  if (!token) throw new Error("BRIGHT_DATA_API_TOKEN environment variable is required");
  return token;
})();

const SERP_DATASET_ID = "gd_mfz5x93lmsjjjylob";
const SCRAPE_URL = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${SERP_DATASET_ID}&notify=false&include_errors=true`;

// --- Types ---

export interface SERPResult {
  title: string;
  url: string;
  description: string;
  rank: number;
  global_rank?: number;
}

export interface SERPResponse {
  url: string;
  keyword: string;
  search_results?: SERPResult[];
  organic?: SERPResult[];
  knowledge_graph?: Record<string, unknown>;
  related_queries?: string[] | { query?: string }[];
  people_also_ask?: { question: string; answer?: string }[];
  featured_snippet?: { title?: string; description?: string; url?: string };
  input?: Record<string, string>;
  ai_overview?: string;
}

export interface BrandSERPData {
  keyword: string;
  results: SERPResult[];
  totalResults: number;
  brandRank: number | null;
  relatedQueries: string[];
  peopleAlsoAsk: string[];
  featuredSnippet: { title: string; description: string; url: string } | null;
  aiOverview: string | null;
}

export interface ScrapedMention {
  url: string;
  title: string;
  snippet: string;
  platform: string;
  date: string;
  rank: number;
}

// --- Core SERP API ---

async function serpScrape(input: Record<string, string>[]): Promise<SERPResponse[]> {
  const res = await fetch(SCRAPE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bright Data SERP error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("chat.openai.com") || u.includes("chatgpt")) return "ChatGPT";
  if (u.includes("gemini.google") || u.includes("bard.google")) return "Google Gemini";
  if (u.includes("perplexity.ai")) return "Perplexity";
  if (u.includes("claude.ai") || u.includes("anthropic")) return "Claude";
  if (u.includes("copilot.microsoft") || u.includes("bing.com/chat")) return "Microsoft Copilot";
  if (u.includes("meta.ai")) return "Meta AI";
  if (u.includes("reddit.com")) return "Reddit";
  if (u.includes("twitter.com") || u.includes("x.com")) return "X/Twitter";
  if (u.includes("youtube.com")) return "YouTube";
  if (u.includes("linkedin.com")) return "LinkedIn";
  if (u.includes("wikipedia.org")) return "Wikipedia";
  if (u.includes("medium.com")) return "Medium";
  if (u.includes("quora.com")) return "Quora";
  return "Web";
}

function extractResults(resp: SERPResponse): SERPResult[] {
  return resp.search_results || resp.organic || [];
}

function normalizeRelatedQueries(rq: unknown): string[] {
  if (!Array.isArray(rq)) return [];
  return rq
    .map((q) => (typeof q === "string" ? q : (q as { query?: string })?.query || ""))
    .filter(Boolean);
}

/**
 * Search Google SERP for brand + keywords. Returns real ranking data.
 */
export async function searchBrandSERP(
  brandName: string,
  keywords: string[]
): Promise<BrandSERPData[]> {
  const results: BrandSERPData[] = [];
  const trimmedKeywords = keywords.slice(0, 10);

  const input = trimmedKeywords.map((keyword) => ({
    url: "https://www.google.com/",
    keyword: `${brandName} ${keyword}`,
    language: "",
    uule: "",
    brd_mobile: "",
    tbs: "",
    tbm: "",
    nfpr: "",
    index: "",
  }));

  try {
    const serpResponses = await serpScrape(input);
    const brandLower = brandName.toLowerCase();

    for (let i = 0; i < serpResponses.length; i++) {
      const resp = serpResponses[i];
      const searchResults = extractResults(resp);

      let brandRank: number | null = null;
      for (let j = 0; j < searchResults.length; j++) {
        const r = searchResults[j];
        if (
          r.title?.toLowerCase().includes(brandLower) ||
          r.url?.toLowerCase().includes(brandLower) ||
          r.description?.toLowerCase().includes(brandLower)
        ) {
          brandRank = j + 1;
          break;
        }
      }

      const fs = resp.featured_snippet;

      results.push({
        keyword: trimmedKeywords[i] || "",
        results: searchResults.slice(0, 20).map((r, idx) => ({
          title: r.title || "",
          url: r.url || "",
          description: r.description || "",
          rank: r.rank || idx + 1,
          global_rank: r.global_rank,
        })),
        totalResults: searchResults.length,
        brandRank,
        relatedQueries: normalizeRelatedQueries(resp.related_queries),
        peopleAlsoAsk: (resp.people_also_ask || []).map((p) => p.question).filter(Boolean),
        featuredSnippet: fs
          ? { title: fs.title || "", description: fs.description || "", url: fs.url || "" }
          : null,
        aiOverview: resp.ai_overview || null,
      });
    }
  } catch (error) {
    console.error("SERP search error:", error);
    for (const keyword of trimmedKeywords) {
      results.push({
        keyword,
        results: [],
        totalResults: 0,
        brandRank: null,
        relatedQueries: [],
        peopleAlsoAsk: [],
        featuredSnippet: null,
        aiOverview: null,
      });
    }
  }

  return results;
}

/**
 * Search Google for a brand to find real web mentions.
 */
export async function searchWebForBrand(
  brandName: string,
  query: string
): Promise<ScrapedMention[]> {
  try {
    const responses = await serpScrape([
      {
        url: "https://www.google.com/",
        keyword: `"${brandName}" ${query}`,
        language: "",
        uule: "",
        brd_mobile: "",
        tbs: "",
        tbm: "",
        nfpr: "",
        index: "",
      },
    ]);

    const resp = responses[0];
    if (!resp) return [];

    return extractResults(resp).slice(0, 15).map((r, idx) => ({
      url: r.url || "",
      title: r.title || "",
      snippet: r.description || "",
      platform: detectPlatform(r.url || ""),
      date: new Date().toISOString(),
      rank: r.rank || idx + 1,
    }));
  } catch (error) {
    console.error("searchWebForBrand error:", error);
    return [];
  }
}

/**
 * Search Google News for brand mentions.
 */
export async function searchBrandNews(
  brandName: string,
  keywords: string[]
): Promise<ScrapedMention[]> {
  try {
    const responses = await serpScrape(
      keywords.slice(0, 5).map((kw) => ({
        url: "https://www.google.com/",
        keyword: `${brandName} ${kw}`,
        tbm: "nws",
        language: "",
        uule: "",
        brd_mobile: "",
        tbs: "",
        nfpr: "",
        index: "",
      }))
    );

    return responses.flatMap((resp) =>
      extractResults(resp).slice(0, 5).map((r, idx) => ({
        url: r.url || "",
        title: r.title || "",
        snippet: r.description || "",
        platform: detectPlatform(r.url || ""),
        date: new Date().toISOString(),
        rank: r.rank || idx + 1,
      }))
    );
  } catch (error) {
    console.error("searchBrandNews error:", error);
    return [];
  }
}

/**
 * Get trending/related search queries for a topic.
 */
export async function getTrendingQueries(
  brandName: string,
  industry: string
): Promise<{ relatedQueries: string[]; peopleAlsoAsk: string[] }> {
  try {
    const responses = await serpScrape([
      {
        url: "https://www.google.com/",
        keyword: `best ${industry} ${brandName}`,
        language: "",
        uule: "",
        brd_mobile: "",
        tbs: "",
        tbm: "",
        nfpr: "",
        index: "",
      },
      {
        url: "https://www.google.com/",
        keyword: `${brandName} vs`,
        language: "",
        uule: "",
        brd_mobile: "",
        tbs: "",
        tbm: "",
        nfpr: "",
        index: "",
      },
    ]);

    const relatedQueries: string[] = [];
    const peopleAlsoAsk: string[] = [];

    for (const resp of responses) {
      for (const q of normalizeRelatedQueries(resp.related_queries)) {
        if (!relatedQueries.includes(q)) relatedQueries.push(q);
      }
      for (const p of resp.people_also_ask || []) {
        if (p.question && !peopleAlsoAsk.includes(p.question)) {
          peopleAlsoAsk.push(p.question);
        }
      }
    }

    return { relatedQueries, peopleAlsoAsk };
  } catch (error) {
    console.error("getTrendingQueries error:", error);
    return { relatedQueries: [], peopleAlsoAsk: [] };
  }
}

/**
 * Scrape a URL via SERP to get basic page info for SEO audit.
 */
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
    const hostname = new URL(url).hostname;
    const pathname = new URL(url).pathname;
    const responses = await serpScrape([
      {
        url: "https://www.google.com/",
        keyword: `site:${hostname} ${pathname !== "/" ? pathname : ""}`.trim(),
        language: "",
        uule: "",
        brd_mobile: "",
        tbs: "",
        tbm: "",
        nfpr: "",
        index: "",
      },
    ]);

    const resp = responses[0];
    const results = extractResults(resp);
    const match = results.find((r) => r.url?.includes(pathname)) || results[0];

    return {
      title: match?.title || "",
      description: match?.description || "",
      headings: [],
      content: match?.description || "",
      structuredData: false,
      faqSchema: false,
      metaTags: { description: match?.description || "" },
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
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
}

/**
 * Get real competitor SERP rankings for keywords.
 * Does TWO types of searches:
 * 1. Bare keyword search — who ranks for the keyword itself
 * 2. "keyword + brand" search — who ranks when searched with brand name
 * This gives a much more accurate competitive picture.
 */
export async function getCompetitorRankings(
  brandName: string,
  competitors: string[],
  keywords: string[]
): Promise<{
  keyword: string;
  rankings: { name: string; rank: number | null; url: string; snippet: string; topResult?: string }[];
  topResults: SERPResult[];
  relatedQueries: string[];
  peopleAlsoAsk: string[];
}[]> {
  const allBrands = [brandName, ...competitors];
  const trimmedKeywords = keywords.slice(0, 5);
  const results: {
    keyword: string;
    rankings: { name: string; rank: number | null; url: string; snippet: string; topResult?: string }[];
    topResults: SERPResult[];
    relatedQueries: string[];
    peopleAlsoAsk: string[];
  }[] = [];

  // Build SERP queries: each keyword + each brand-keyword combo
  const input: Record<string, string>[] = [];
  const queryMap: { type: "bare" | "branded"; keyword: string; brand?: string; index: number }[] = [];

  // Bare keyword searches (who ranks for the keyword itself)
  for (const kw of trimmedKeywords) {
    queryMap.push({ type: "bare", keyword: kw, index: input.length });
    input.push({
      url: "https://www.google.com/",
      keyword: kw,
      language: "", uule: "", brd_mobile: "", tbs: "", tbm: "", nfpr: "", index: "",
    });
  }

  // Brand-specific searches (what shows up when you search "brand + keyword")
  for (const brand of allBrands) {
    for (const kw of trimmedKeywords.slice(0, 3)) {
      queryMap.push({ type: "branded", keyword: kw, brand, index: input.length });
      input.push({
        url: "https://www.google.com/",
        keyword: `${brand} ${kw}`,
        language: "", uule: "", brd_mobile: "", tbs: "", tbm: "", nfpr: "", index: "",
      });
    }
  }

  // Also do "brand vs" searches for head-to-head comparison data
  for (const comp of competitors.slice(0, 3)) {
    queryMap.push({ type: "branded", keyword: "vs", brand: brandName, index: input.length });
    input.push({
      url: "https://www.google.com/",
      keyword: `${brandName} vs ${comp}`,
      language: "", uule: "", brd_mobile: "", tbs: "", tbm: "", nfpr: "", index: "",
    });
  }

  try {
    const serpResponses = await serpScrape(input);

    // Process bare keyword results
    for (const qm of queryMap.filter((q) => q.type === "bare")) {
      const resp = serpResponses[qm.index];
      if (!resp) continue;

      const searchResults = extractResults(resp);
      const rankings: { name: string; rank: number | null; url: string; snippet: string; topResult?: string }[] = [];

      for (const brand of allBrands) {
        const brandLower = brand.toLowerCase();
        let found = false;

        for (let j = 0; j < searchResults.length; j++) {
          const r = searchResults[j];
          if (
            r.title?.toLowerCase().includes(brandLower) ||
            r.url?.toLowerCase().includes(brandLower) ||
            r.description?.toLowerCase().includes(brandLower)
          ) {
            rankings.push({
              name: brand,
              rank: r.rank || j + 1,
              url: r.url || "",
              snippet: r.description || "",
              topResult: r.title || "",
            });
            found = true;
            break;
          }
        }

        if (!found) {
          // Check branded search results for this brand+keyword
          const brandedQuery = queryMap.find((q) => q.type === "branded" && q.brand === brand && q.keyword === qm.keyword);
          if (brandedQuery) {
            const brandedResp = serpResponses[brandedQuery.index];
            if (brandedResp) {
              const brandedResults = extractResults(brandedResp);
              const first = brandedResults[0];
              rankings.push({
                name: brand,
                rank: null,
                url: first?.url || "",
                snippet: first?.description || "",
                topResult: first?.title || "",
              });
              found = true;
            }
          }
          if (!found) {
            rankings.push({ name: brand, rank: null, url: "", snippet: "" });
          }
        }
      }

      results.push({
        keyword: qm.keyword,
        rankings,
        topResults: searchResults.slice(0, 10),
        relatedQueries: normalizeRelatedQueries(resp.related_queries),
        peopleAlsoAsk: (resp.people_also_ask || []).map((p) => p.question).filter(Boolean),
      });
    }
  } catch (error) {
    console.error("getCompetitorRankings error:", error);
    for (const kw of trimmedKeywords) {
      results.push({
        keyword: kw,
        rankings: allBrands.map((name) => ({ name, rank: null, url: "", snippet: "" })),
        topResults: [],
        relatedQueries: [],
        peopleAlsoAsk: [],
      });
    }
  }

  return results;
}
