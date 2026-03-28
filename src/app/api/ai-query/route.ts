import { NextRequest, NextResponse } from "next/server";
import { queryAIPlatform, queryAllPlatforms } from "@/lib/openrouter";
import { getOrCreateBrand, saveAIQueries, prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("analysis:run");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { query, brandName, platform } = body;

    if (!query || !brandName) {
      return NextResponse.json({ error: "query and brandName are required" }, { status: 400 });
    }

    if (platform) {
      const result = await queryAIPlatform(platform, query, brandName);
      // Persist
      try {
        const brand = await getOrCreateBrand({ name: brandName });
        await saveAIQueries(brand.id, [{
          query: result.query,
          platform: result.platform,
          model: result.model,
          response: result.response,
          mentionsBrand: result.mentionsBrand,
          sentiment: result.sentiment,
          citesSource: result.citesSource,
        }]);
      } catch (dbErr) {
        console.error("DB save error (non-blocking):", dbErr);
      }
      return NextResponse.json(result);
    }

    const results = await queryAllPlatforms(query, brandName);
    // Persist
    try {
      const brand = await getOrCreateBrand({ name: brandName });
      await saveAIQueries(brand.id, results.map((r: { query: string; platform: string; model: string; response: string; mentionsBrand: boolean; sentiment: string; citesSource: boolean }) => ({
        query: r.query,
        platform: r.platform,
        model: r.model,
        response: r.response,
        mentionsBrand: r.mentionsBrand,
        sentiment: r.sentiment,
        citesSource: r.citesSource,
      })));
    } catch (dbErr) {
      console.error("DB save error (non-blocking):", dbErr);
    }
    return NextResponse.json(results);
  } catch (error) {
    console.error("AI Query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
