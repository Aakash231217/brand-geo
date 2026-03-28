const OPENROUTER_API_KEY: string = (() => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required");
  return key;
})();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- Types ---

export interface AIQueryResult {
  platform: string;
  model: string;
  query: string;
  response: string;
  mentionsBrand: boolean;
  sentiment: "positive" | "neutral" | "negative";
  citesSource: boolean;
  sources: string[];
}

// --- Advanced AI Models ---

export const AI_MODELS: Record<string, { id: string; name: string }> = {
  chatgpt: { id: "openai/gpt-4.1", name: "GPT-4.1" },
  "gpt-4o": { id: "openai/gpt-4o", name: "GPT-4o" },
  gemini: { id: "google/gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro" },
  "gemini-flash": { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
  claude: { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
  perplexity: { id: "perplexity/sonar-pro", name: "Perplexity Sonar Pro" },
  llama: { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick" },
  copilot: { id: "microsoft/phi-4", name: "Phi-4" },
  deepseek: { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
};

// The 6 main AI platforms we test brand visibility against
const VISIBILITY_PLATFORMS = ["chatgpt", "gemini", "claude", "perplexity", "llama", "copilot"];

// --- Core model query ---

async function queryModel(
  modelId: string,
  messages: { role: string; content: string }[],
  maxTokens = 2048,
  temperature = 0.7
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://brandai.app",
      "X-Title": "BrandAI",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// --- Extract sources/URLs from AI response ---

function extractSources(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\])"',<>]+/g;
  const urls = text.match(urlRegex) || [];
  return [...new Set(urls)].slice(0, 10);
}

function detectSentiment(text: string, brandName: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();

  // Only analyze sentiment for sections mentioning the brand
  const sentences = text.split(/[.!?]\s+/);
  const brandSentences = sentences.filter((s) => s.toLowerCase().includes(brand));
  if (brandSentences.length === 0) return "neutral";

  const joined = brandSentences.join(" ").toLowerCase();
  const positiveWords = ["best", "leading", "excellent", "top", "recommend", "great", "innovative", "trusted", "popular", "reliable", "outstanding", "superior"];
  const negativeWords = ["worst", "avoid", "poor", "bad", "scam", "unreliable", "expensive", "overpriced", "issue", "problem", "complaint", "disappointing"];

  const posCount = positiveWords.filter((w) => joined.includes(w)).length;
  const negCount = negativeWords.filter((w) => joined.includes(w)).length;

  if (posCount > negCount + 1) return "positive";
  if (negCount > posCount + 1) return "negative";
  return "neutral";
}

// --- Public functions ---

/**
 * Query a single AI platform to see what it says about a brand/topic.
 */
export async function queryAIPlatform(
  platform: string,
  query: string,
  brandName: string
): Promise<AIQueryResult> {
  const modelInfo = AI_MODELS[platform.toLowerCase()] || AI_MODELS.chatgpt;

  const response = await queryModel(modelInfo.id, [
    {
      role: "system",
      content: "You are a helpful assistant. When answering, cite your sources with URLs when possible. Be specific and factual.",
    },
    { role: "user", content: query },
  ]);

  const lowerResponse = response.toLowerCase();
  const lowerBrand = brandName.toLowerCase();
  const mentionsBrand = lowerResponse.includes(lowerBrand);
  const sources = extractSources(response);
  const sentiment = detectSentiment(response, brandName);

  return {
    platform,
    model: modelInfo.id,
    query,
    response,
    mentionsBrand,
    sentiment,
    citesSource: sources.length > 0,
    sources,
  };
}

/**
 * Query all 6 visibility platforms in parallel.
 */
export async function queryAllPlatforms(
  query: string,
  brandName: string
): Promise<AIQueryResult[]> {
  const results = await Promise.allSettled(
    VISIBILITY_PLATFORMS.map((p) => queryAIPlatform(p, query, brandName))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AIQueryResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Full brand visibility analysis across all AI platforms for each keyword.
 */
export async function analyzeBrandVisibility(
  brandName: string,
  keywords: string[]
): Promise<{
  overallScore: number;
  platformScores: Record<string, { score: number; mentions: number; citations: number; sentiment: string }>;
  keywordResults: { keyword: string; platforms: AIQueryResult[] }[];
}> {
  const keywordResults: { keyword: string; platforms: AIQueryResult[] }[] = [];

  for (const keyword of keywords.slice(0, 5)) {
    const results = await queryAllPlatforms(keyword, brandName);
    keywordResults.push({ keyword, platforms: results });
  }

  // Aggregate platform stats
  const platformStats: Record<string, { mentions: number; citations: number; total: number; sentiments: string[] }> = {};
  for (const kr of keywordResults) {
    for (const r of kr.platforms) {
      const key = r.platform.toLowerCase();
      if (!platformStats[key]) platformStats[key] = { mentions: 0, citations: 0, total: 0, sentiments: [] };
      platformStats[key].total++;
      if (r.mentionsBrand) {
        platformStats[key].mentions++;
        platformStats[key].sentiments.push(r.sentiment);
      }
      if (r.citesSource) platformStats[key].citations++;
    }
  }

  const platformScores: Record<string, { score: number; mentions: number; citations: number; sentiment: string }> = {};
  let totalScore = 0;
  let platformCount = 0;

  for (const [platform, stats] of Object.entries(platformStats)) {
    const score = stats.total > 0 ? Math.round((stats.mentions / stats.total) * 100) : 0;
    const posCount = stats.sentiments.filter((s) => s === "positive").length;
    const mainSentiment =
      posCount > stats.sentiments.length / 2
        ? "positive"
        : stats.sentiments.filter((s) => s === "negative").length > stats.sentiments.length / 2
          ? "negative"
          : "neutral";

    platformScores[platform] = { score, mentions: stats.mentions, citations: stats.citations, sentiment: mainSentiment };
    totalScore += score;
    platformCount++;
  }

  return {
    overallScore: platformCount > 0 ? Math.round(totalScore / platformCount) : 0,
    platformScores,
    keywordResults,
  };
}

/**
 * SEO analysis grounded with real page data from SERP scraping.
 */
export async function analyzeUrlForSEO(
  url: string,
  brandName: string,
  realPageData?: { title: string; description: string; headings: string[]; content: string; structuredData: boolean; faqSchema: boolean; metaTags: Record<string, string> }
): Promise<string> {
  const pageContext = realPageData
    ? `
REAL PAGE DATA FROM SCRAPING:
- Title: ${realPageData.title || "Not found"}
- Meta Description: ${realPageData.description || "Not found"}
- Headings: ${realPageData.headings.length > 0 ? realPageData.headings.join(", ") : "None extracted"}
- Content Preview: ${realPageData.content?.slice(0, 500) || "No content"}
- Has JSON-LD Structured Data: ${realPageData.structuredData}
- Has FAQ Schema: ${realPageData.faqSchema}
- Meta Tags: ${JSON.stringify(realPageData.metaTags)}
`
    : `Note: Could not scrape this page directly. Analyze based on the URL and known best practices.`;

  return queryModel(AI_MODELS.chatgpt.id, [
    {
      role: "system",
      content: `You are an AI SEO auditor specializing in Generative Engine Optimization (GEO). You audit URLs for AI-friendliness and search engine optimization. Use the REAL page data provided to give accurate scores. Do NOT fabricate data — if something wasn't found in the scrape, mark it accordingly. Respond in JSON with fields: overallScore (0-100), categories (array of {name, score: 0-100, status: "pass"|"fail"|"warning", items: [{name, status: "pass"|"fail"|"warning", impact: "high"|"medium"|"low", detail: string}]}), recommendations (array of {priority: "high"|"medium"|"low", title, description, impact, effort: "low"|"medium"|"high", category}).`,
    },
    {
      role: "user",
      content: `Analyze this URL for AI SEO optimization: ${url}\nBrand: ${brandName}\n\n${pageContext}\n\nProvide a comprehensive GEO audit. Be honest — if the page data shows missing meta tags or no structured data, score accordingly.`,
    },
  ], 3000, 0.3);
}

/**
 * Competitor analysis grounded with real SERP rankings.
 */
export async function analyzeCompetitors(
  brandName: string,
  competitors: string[],
  keywords: string[],
  realRankings?: { keyword: string; rankings: { name: string; rank: number | null; url: string; snippet: string }[] }[]
): Promise<string> {
  const rankingContext = realRankings?.length
    ? `
REAL SERP RANKING DATA:
${realRankings
  .map(
    (kr) =>
      `Keyword "${kr.keyword}":\n${kr.rankings
        .map((r) => `  - ${r.name}: ${r.rank ? `Rank #${r.rank}` : "Not found in top results"} ${r.url ? `(${r.url})` : ""}`)
        .join("\n")}`
  )
  .join("\n\n")}
`
    : "";

  return queryModel(AI_MODELS.chatgpt.id, [
    {
      role: "system",
      content: `You are an AI competitive intelligence analyst. Compare brand visibility across AI platforms and search engines. Use any REAL ranking data provided to ground your analysis — do not make up rankings. Respond in JSON with: competitors (array of {name, overallScore: 0-100, scores: {chatgpt: 0-100, gemini: 0-100, perplexity: 0-100, claude: 0-100}, totalCitations: number, trend: "up"|"down"|"stable", strengths: string[], weaknesses: string[]}), keywordBattles (array of {keyword, positions: [{brand, position: number|null}]}).`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nCompetitors: ${competitors.join(", ")}\nKeywords: ${keywords.join(", ")}\n\n${rankingContext}\n\nAnalyze the competitive AI visibility landscape. Use the real ranking data to inform scores. If a brand doesn't appear in SERP results, their score should reflect that.`,
    },
  ], 3000, 0.3);
}

/**
 * GEO analysis grounded with real AI platform responses.
 */
export async function generateGEOAnalysis(
  brandName: string,
  url: string,
  aiPlatformData?: { platform: string; mentionsBrand: boolean; sentiment: string; sources: string[]; responsePreview: string }[]
): Promise<string> {
  const aiContext = aiPlatformData?.length
    ? `
REAL AI PLATFORM DATA (what AI models actually say about "${brandName}"):
${aiPlatformData
  .map(
    (d) =>
      `- ${d.platform}: ${d.mentionsBrand ? "MENTIONS brand" : "Does NOT mention brand"} | Sentiment: ${d.sentiment} | Sources cited: ${d.sources.length > 0 ? d.sources.join(", ") : "None"}\n  Response preview: "${d.responsePreview.slice(0, 200)}..."`
  )
  .join("\n")}
`
    : "";

  return queryModel(AI_MODELS.chatgpt.id, [
    {
      role: "system",
      content: `You are a GEO (Generative Engine Optimization) expert. Analyze how well a brand is optimized for AI engines. Use REAL data from AI platform responses when provided — base your scores on actual AI behavior, not assumptions. Respond in JSON with: strategies (array of {name, score: 0-100, status: "strong"|"good"|"needs-work"|"weak", description, tips: string[]}), contentOptimizations (array of {page, title, currentScore: 0-100, potentialScore: 0-100, issues: [{type: "missing"|"improve", text}]}), aiPresence (array of {platform, mentioned: boolean, sentiment, recommendation}).`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nWebsite: ${url}\n\n${aiContext}\n\nAnalyze GEO optimization opportunities. Be honest about scores — if AI models don't mention the brand, the scores should reflect that reality.`,
    },
  ], 3000, 0.3);
}

/**
 * Content ideas generation.
 */
export async function generateContentIdeas(
  brandName: string,
  industry: string,
  keywords: string[],
  trendingQueries?: string[],
  peopleAlsoAsk?: string[]
): Promise<string> {
  const trendingContext = trendingQueries?.length || peopleAlsoAsk?.length
    ? `
REAL SEARCH TRENDS:
${trendingQueries?.length ? `Related queries people search: ${trendingQueries.join(", ")}` : ""}
${peopleAlsoAsk?.length ? `People Also Ask: ${peopleAlsoAsk.join("; ")}` : ""}
`
    : "";

  return queryModel(AI_MODELS.chatgpt.id, [
    {
      role: "system",
      content: `You are an AI SEO content strategist. Generate content ideas optimized for AI visibility (GEO). Use any real search trend data provided. Respond in JSON as array of objects: [{title, type: "Guide"|"Listicle"|"Tutorial"|"Research"|"Comparison", targetKeywords: string[], estimatedImpact: "high"|"medium"|"low", reason: string, searchIntent: string}].`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nIndustry: ${industry}\nCurrent keywords: ${keywords.join(", ")}\n\n${trendingContext}\n\nGenerate 5-8 content ideas that would maximize AI citations and brand visibility. Prioritize ideas matching real search queries.`,
    },
  ], 2048, 0.7);
}
