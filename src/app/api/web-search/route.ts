import { NextRequest, NextResponse } from "next/server";
import { searchBrandMentions, searchWebForBrand } from "@/lib/bright-data";
import { getOrCreateBrand, saveWebMentions } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("analysis:run");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { brandName, keywords, query } = body;

    if (!brandName) {
      return NextResponse.json({ error: "brandName is required" }, { status: 400 });
    }

    if (query) {
      const results = await searchWebForBrand(brandName, query);
      // Persist mentions
      try {
        const brand = await getOrCreateBrand({ name: brandName });
        if (results.length > 0) {
          await saveWebMentions(brand.id, results.map((r: { url: string; title: string; snippet: string; platform: string; date: string }) => ({
            query,
            url: r.url,
            title: r.title ?? "",
            snippet: r.snippet ?? "",
            platform: r.platform ?? "",
            date: r.date ?? "",
          })));
        }
      } catch (dbErr) {
        console.error("DB save error (non-blocking):", dbErr);
      }
      return NextResponse.json(results);
    }

    if (keywords?.length) {
      const results = await searchBrandMentions(brandName, keywords);
      // Persist mentions
      try {
        const brand = await getOrCreateBrand({ name: brandName });
        const allMentions = results.flatMap((r: { query: string; results: { url: string; title: string; snippet: string; platform: string; date: string }[] }) =>
          r.results.map((m: { url: string; title: string; snippet: string; platform: string; date: string }) => ({
            query: r.query,
            url: m.url,
            title: m.title ?? "",
            snippet: m.snippet ?? "",
            platform: m.platform ?? "",
            date: m.date ?? "",
          }))
        );
        if (allMentions.length > 0) await saveWebMentions(brand.id, allMentions);
      } catch (dbErr) {
        console.error("DB save error (non-blocking):", dbErr);
      }
      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: "Either keywords or query is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
