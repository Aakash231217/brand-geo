const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface AIQueryResult {
  platform: string;
  model: string;
  query: string;
  response: string;
  mentionsBrand: boolean;
  sentiment: "positive" | "neutral" | "negative";
  citesSource: boolean;
}

const AI_MODELS: Record<string, string> = {
  chatgpt: "openai/gpt-4o",
  gemini: "google/gemini-2.0-flash-001",
  claude: "anthropic/claude-sonnet-4",
  perplexity: "perplexity/sonar",
  llama: "meta-llama/llama-3.3-70b-instruct",
  copilot: "microsoft/phi-4",
};

async function queryModel(
  model: string,
  messages: { role: string; content: string }[]
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
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function queryAIPlatform(
  platform: string,
  query: string,
  brandName: string
): Promise<AIQueryResult> {
  const model = AI_MODELS[platform.toLowerCase()] || AI_MODELS.chatgpt;
  const response = await queryModel(model, [
    { role: "user", content: query },
  ]);

  const lowerResponse = response.toLowerCase();
  const lowerBrand = brandName.toLowerCase();
  const mentionsBrand = lowerResponse.includes(lowerBrand);

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (mentionsBrand) {
    const sentimentResult = await queryModel(AI_MODELS.chatgpt, [
      {
        role: "system",
        content:
          'Analyze the sentiment of the following text about the brand "' +
          brandName +
          '". Respond with ONLY one word: positive, neutral, or negative.',
      },
      { role: "user", content: response },
    ]);
    const s = sentimentResult.trim().toLowerCase();
    if (s.includes("positive")) sentiment = "positive";
    else if (s.includes("negative")) sentiment = "negative";
  }

  return {
    platform,
    model,
    query,
    response,
    mentionsBrand,
    sentiment,
    citesSource: lowerResponse.includes("http") || lowerResponse.includes("source"),
  };
}

export async function queryAllPlatforms(
  query: string,
  brandName: string
): Promise<AIQueryResult[]> {
  const platforms = Object.keys(AI_MODELS);
  const results = await Promise.allSettled(
    platforms.map((p) => queryAIPlatform(p, query, brandName))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AIQueryResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function analyzeBrandVisibility(
  brandName: string,
  keywords: string[]
): Promise<{
  overallScore: number;
  platformScores: Record<string, { score: number; mentions: number; sentiment: string }>;
  keywordResults: { keyword: string; platforms: AIQueryResult[] }[];
}> {
  const keywordResults: { keyword: string; platforms: AIQueryResult[] }[] = [];

  for (const keyword of keywords.slice(0, 5)) {
    const results = await queryAllPlatforms(keyword, brandName);
    keywordResults.push({ keyword, platforms: results });
  }

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
      if (r.citesSource) {
        platformStats[key].citations++;
      }
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

export async function generateContentIdeas(
  brandName: string,
  industry: string,
  keywords: string[]
): Promise<string> {
  return queryModel(AI_MODELS.chatgpt, [
    {
      role: "system",
      content: `You are an AI SEO content strategist. Generate content ideas optimized for AI visibility (GEO - Generative Engine Optimization). Respond in JSON format as an array of objects with fields: title, type (Guide/Listicle/Tutorial/Research/Comparison), targetKeywords (array), estimatedImpact (string), reason (string).`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nIndustry: ${industry}\nCurrent keywords: ${keywords.join(", ")}\n\nGenerate 5 content ideas that would maximize AI citations and brand visibility.`,
    },
  ]);
}

export async function analyzeUrlForSEO(
  url: string,
  brandName: string
): Promise<string> {
  return queryModel(AI_MODELS.chatgpt, [
    {
      role: "system",
      content: `You are an AI SEO auditor specializing in Generative Engine Optimization (GEO). Analyze URLs for AI-friendliness. Respond in JSON with fields: overallScore (0-100), categories (array of {name, score, status, items: [{name, status: pass|fail|warning, impact: high|medium|low}]}), recommendations (array of {priority: high|medium|low, title, description, impact, effort, category}).`,
    },
    {
      role: "user",
      content: `Analyze this URL for AI SEO optimization: ${url}\nBrand: ${brandName}\n\nProvide a comprehensive GEO audit.`,
    },
  ]);
}

export async function analyzeCompetitors(
  brandName: string,
  competitors: string[],
  keywords: string[]
): Promise<string> {
  return queryModel(AI_MODELS.chatgpt, [
    {
      role: "system",
      content: `You are an AI competitive intelligence analyst. Compare brand visibility across AI platforms. Respond in JSON with: competitors (array of {name, overallScore, scores: {chatgpt, gemini, perplexity, claude}, totalCitations, trend, strengths, weaknesses}), keywordBattles (array of {keyword, positions: [{brand, position}]}).`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nCompetitors: ${competitors.join(", ")}\nKeywords: ${keywords.join(", ")}\n\nAnalyze competitive AI visibility landscape.`,
    },
  ]);
}

export async function generateGEOAnalysis(
  brandName: string,
  url: string
): Promise<string> {
  return queryModel(AI_MODELS.chatgpt, [
    {
      role: "system",
      content: `You are a GEO (Generative Engine Optimization) expert. Analyze brand optimization for AI engines. Respond in JSON with: strategies (array of {name, score: 0-100, status: strong|good|needs-work|weak, description, tips: string[]}), contentOptimizations (array of {page, title, currentScore, potentialScore, issues: [{type: missing|improve, text}]}).`,
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nWebsite: ${url}\n\nAnalyze GEO optimization opportunities.`,
    },
  ]);
}
