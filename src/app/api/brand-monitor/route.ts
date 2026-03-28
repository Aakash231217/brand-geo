import { NextRequest, NextResponse } from "next/server";
import { analyzeBrandVisibility } from "@/lib/openrouter";
import { searchBrandSERP } from "@/lib/bright-data";
import { getOrCreateBrand, saveVisibilitySnapshot, saveAIQueries } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("analysis:run");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { brandName, keywords } = body;

    if (!brandName || !keywords?.length) {
      return NextResponse.json(
        { error: "brandName and keywords are required" },
        { status: 400 }
      );
    }

    // Step 1: Get real SERP data
    const serpData = await searchBrandSERP(brandName, keywords);

    // Step 2: Query AI platforms for brand visibility
    const results = await analyzeBrandVisibility(brandName, keywords);

    // Merge SERP data into results
    const enrichedResults = {
      ...results,
      serpData: serpData.map((s) => ({
        keyword: s.keyword,
        brandRank: s.brandRank,
        totalResults: s.totalResults,
        topResults: s.results.slice(0, 5),
        relatedQueries: s.relatedQueries,
        peopleAlsoAsk: s.peopleAlsoAsk,
        featuredSnippet: s.featuredSnippet,
        aiOverview: s.aiOverview,
      })),
    };

    // Persist to DB
    try {
      const brand = await getOrCreateBrand({ name: brandName, keywords });
      await saveVisibilitySnapshot(brand.id, {
        overallScore: results.overallScore,
        platformScores: results.platformScores,
        keywordResults: results.keywordResults,
      });
      const allQueries = results.keywordResults.flatMap((kr) =>
        kr.platforms.map((p) => ({
          query: kr.keyword,
          platform: p.platform,
          model: p.model,
          response: p.response,
          mentionsBrand: p.mentionsBrand,
          sentiment: p.sentiment,
          citesSource: p.citesSource,
        }))
      );
      if (allQueries.length > 0) await saveAIQueries(brand.id, allQueries);
    } catch (dbErr) {
      console.error("DB save error (non-blocking):", dbErr);
    }

    return NextResponse.json(enrichedResults);
  } catch (error) {
    console.error("Brand monitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
