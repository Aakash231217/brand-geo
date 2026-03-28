import { NextRequest, NextResponse } from "next/server";
import { generateGEOAnalysis } from "@/lib/openrouter";
import { getOrCreateBrand, saveGEOAnalysis } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function persistGEO(brandName: string, url: string, parsed: { strategies?: unknown[]; contentOptimizations?: unknown[] }) {
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
    const { brandName, url } = body;

    if (!brandName) {
      return NextResponse.json({ error: "brandName is required" }, { status: 400 });
    }

    const analysis = await generateGEOAnalysis(brandName, url || "");

    try {
      const parsed = JSON.parse(analysis);
      await persistGEO(brandName, url || "", parsed);
      return NextResponse.json(parsed);
    } catch {
      const match = analysis.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
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
