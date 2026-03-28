import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitors } from "@/lib/openrouter";
import { getOrCreateBrand, saveCompetitorAnalysis } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function persistCompetitors(brandName: string, parsed: { competitors?: unknown[]; keywordBattles?: unknown[] }) {
  try {
    const brand = await getOrCreateBrand({ name: brandName });
    await saveCompetitorAnalysis(brand.id, {
      competitors: parsed.competitors ?? [],
      keywordBattles: parsed.keywordBattles ?? [],
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
    const { brandName, competitors, keywords } = body;

    if (!brandName || !competitors?.length || !keywords?.length) {
      return NextResponse.json(
        { error: "brandName, competitors, and keywords are required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeCompetitors(brandName, competitors, keywords);

    try {
      const parsed = JSON.parse(analysis);
      await persistCompetitors(brandName, parsed);
      return NextResponse.json(parsed);
    } catch {
      const match = analysis.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          await persistCompetitors(brandName, parsed);
          return NextResponse.json(parsed);
        } catch {
          // fall through
        }
      }
      return NextResponse.json({ rawAnalysis: analysis });
    }
  } catch (error) {
    console.error("Competitor analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
