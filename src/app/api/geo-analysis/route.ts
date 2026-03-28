import { NextRequest, NextResponse } from "next/server";
import { generateGEOAnalysis, queryAllPlatforms } from "@/lib/openrouter";
import { getOrCreateBrand, saveGEOAnalysis } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function persistGEO(brandName: string, url: string, parsed: { strategies?: unknown[]; contentOptimizations?: unknown[]; aiPresence?: unknown[] }) {
  try {
    const brand = await getOrCreateBrand({ name: brandName });
    await saveGEOAnalysis(brand.id, {
      url,
      strategies: parsed.strategies ?? [],
      contentOptimizations: parsed.contentOptimizations ?? [],
    });
  } catch (dbErr) {
    console.error("DB save error (non-blocking):", dbErr);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("analysis:run");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { brandName, url, keywords } = body;

    if (!brandName) {
      return NextResponse.json({ error: "brandName is required" }, { status: 400 });
    }

    // Step 1: Query AI platforms to see what they actually say about the brand
    const sampleQuery = keywords?.[0]
      ? `What is ${brandName} and how does it compare for ${keywords[0]}?`
      : `Tell me about ${brandName}`;
    const aiResponses = await queryAllPlatforms(sampleQuery, brandName);

    // Step 2: Pass real AI responses to GEO analysis
    const aiPlatformData = aiResponses.map((r) => ({
      platform: r.platform,
      mentionsBrand: r.mentionsBrand,
      sentiment: r.sentiment,
      sources: r.sources,
      responsePreview: r.response,
    }));

    const analysis = await generateGEOAnalysis(brandName, url || "", aiPlatformData);

    try {
      const parsed = JSON.parse(analysis);
      // Include real AI platform responses in the result
      parsed.aiResponses = aiResponses.map((r) => ({
        platform: r.platform,
        model: r.model,
        mentionsBrand: r.mentionsBrand,
        sentiment: r.sentiment,
        sources: r.sources,
        response: r.response.slice(0, 500),
      }));
      await persistGEO(brandName, url || "", parsed);
      return NextResponse.json(parsed);
    } catch {
      const match = analysis.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          parsed.aiResponses = aiResponses.map((r) => ({
            platform: r.platform,
            model: r.model,
            mentionsBrand: r.mentionsBrand,
            sentiment: r.sentiment,
            sources: r.sources,
            response: r.response.slice(0, 500),
          }));
          await persistGEO(brandName, url || "", parsed);
          return NextResponse.json(parsed);
        } catch {
          // fall through
        }
      }
      return NextResponse.json({ rawAnalysis: analysis });
    }
  } catch (error) {
    console.error("GEO analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
