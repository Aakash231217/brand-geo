import { NextRequest, NextResponse } from "next/server";
import { analyzeBrandVisibility } from "@/lib/openrouter";
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

    const results = await analyzeBrandVisibility(brandName, keywords);

    // Persist to DB
    try {
      const brand = await getOrCreateBrand({ name: brandName, keywords });
      await saveVisibilitySnapshot(brand.id, {
        overallScore: results.overallScore,
        platformScores: results.platformScores,
        keywordResults: results.keywordResults,
      });
      // Save individual AI queries
      const allQueries = results.keywordResults.flatMap((kr: { keyword: string; platforms: { platform: string; model: string; query: string; response: string; mentionsBrand: boolean; sentiment: string; citesSource: boolean }[] }) =>
        kr.platforms.map((p: { platform: string; model: string; query: string; response: string; mentionsBrand: boolean; sentiment: string; citesSource: boolean }) => ({
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

    return NextResponse.json(results);
  } catch (error) {
    console.error("Brand monitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
