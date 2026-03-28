import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! } as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- Brand helpers ---

export async function getOrCreateBrand(config: {
  name: string;
  url?: string;
  description?: string;
  industry?: string;
  keywords?: string[];
  competitors?: string[];
  platforms?: string[];
}) {
  let brand = await prisma.brand.findFirst({
    where: { name: config.name },
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: config.name,
        url: config.url ?? "",
        description: config.description ?? "",
        industry: config.industry ?? "SaaS / Software",
        keywords: config.keywords ?? [],
        competitors: config.competitors ?? [],
        platforms: config.platforms ?? ["chatgpt", "gemini", "perplexity", "claude", "copilot", "llama"],
      },
    });
  }

  return brand;
}

export async function updateBrand(id: string, data: {
  name?: string;
  url?: string;
  description?: string;
  industry?: string;
  keywords?: string[];
  competitors?: string[];
  platforms?: string[];
}) {
  return prisma.brand.update({ where: { id }, data });
}

// --- AI Query helpers ---

export async function saveAIQueries(brandId: string, queries: {
  query: string;
  platform: string;
  model: string;
  response: string;
  mentionsBrand: boolean;
  sentiment: string;
  citesSource: boolean;
}[]) {
  return prisma.aIQuery.createMany({
    data: queries.map((q) => ({ brandId, ...q })),
  });
}

export async function getRecentAIQueries(brandId: string, limit = 50) {
  return prisma.aIQuery.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Visibility Snapshot helpers ---

export async function saveVisibilitySnapshot(brandId: string, data: {
  overallScore: number;
  platformScores: Record<string, unknown>;
  keywordResults: unknown[];
}) {
  return prisma.visibilitySnapshot.create({
    data: {
      brandId,
      overallScore: data.overallScore,
      platformScores: data.platformScores as Prisma.InputJsonValue,
      keywordResults: data.keywordResults as Prisma.InputJsonValue,
    },
  });
}

export async function getVisibilityHistory(brandId: string, limit = 30) {
  return prisma.visibilitySnapshot.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- SEO Audit helpers ---

export async function saveSEOAudit(brandId: string, data: {
  url: string;
  overallScore: number;
  categories: unknown[];
  recommendations: unknown[];
}) {
  return prisma.sEOAudit.create({
    data: {
      brandId,
      url: data.url,
      overallScore: data.overallScore,
      categories: data.categories as Prisma.InputJsonValue,
      recommendations: data.recommendations as Prisma.InputJsonValue,
    },
  });
}

export async function getSEOAudits(brandId: string, limit = 20) {
  return prisma.sEOAudit.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Competitor Analysis helpers ---

export async function saveCompetitorAnalysis(brandId: string, data: {
  competitors: unknown[];
  keywordBattles: unknown[];
}) {
  return prisma.competitorAnalysis.create({
    data: {
      brandId,
      competitors: data.competitors as Prisma.InputJsonValue,
      keywordBattles: data.keywordBattles as Prisma.InputJsonValue,
    },
  });
}

export async function getCompetitorAnalyses(brandId: string, limit = 10) {
  return prisma.competitorAnalysis.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Content Idea helpers ---

export async function saveContentIdeas(brandId: string, ideas: {
  title: string;
  type: string;
  targetKeywords: string[];
  estimatedImpact: string;
  reason: string;
}[]) {
  return prisma.contentIdea.createMany({
    data: ideas.map((idea) => ({ brandId, ...idea })),
  });
}

export async function getContentIdeas(brandId: string, limit = 50) {
  return prisma.contentIdea.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- GEO Analysis helpers ---

export async function saveGEOAnalysis(brandId: string, data: {
  url?: string;
  strategies: unknown[];
  contentOptimizations: unknown[];
}) {
  return prisma.gEOAnalysis.create({
    data: {
      brandId,
      url: data.url ?? "",
      strategies: data.strategies as Prisma.InputJsonValue,
      contentOptimizations: data.contentOptimizations as Prisma.InputJsonValue,
    },
  });
}

export async function getGEOAnalyses(brandId: string, limit = 10) {
  return prisma.gEOAnalysis.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Web Mention helpers ---

export async function saveWebMentions(brandId: string, mentions: {
  query: string;
  url: string;
  title: string;
  snippet: string;
  platform: string;
  date: string;
}[]) {
  // Upsert to avoid duplicates
  const results = [];
  for (const m of mentions) {
    const result = await prisma.webMention.upsert({
      where: {
        brandId_url_query: { brandId, url: m.url, query: m.query },
      },
      update: { title: m.title, snippet: m.snippet, platform: m.platform, date: m.date },
      create: { brandId, ...m },
    });
    results.push(result);
  }
  return results;
}

export async function getWebMentions(brandId: string, limit = 100) {
  return prisma.webMention.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Dashboard summary ---

export async function getBrandDashboard(brandId: string) {
  const [latestVisibility, totalQueries, totalMentions, recentAudits] = await Promise.all([
    prisma.visibilitySnapshot.findFirst({ where: { brandId }, orderBy: { createdAt: "desc" } }),
    prisma.aIQuery.count({ where: { brandId } }),
    prisma.webMention.count({ where: { brandId } }),
    prisma.sEOAudit.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return { latestVisibility, totalQueries, totalMentions, recentAudits };
}
