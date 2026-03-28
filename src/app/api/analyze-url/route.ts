import { NextRequest, NextResponse } from "next/server";
import { analyzeUrlForSEO } from "@/lib/openrouter";
import { getOrCreateBrand, saveSEOAudit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("analysis:run");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { url, brandName } = body;

    if (!url || !brandName) {
      return NextResponse.json({ error: "url and brandName are required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const analysis = await analyzeUrlForSEO(url, brandName);

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(analysis);
      // Persist
      try {
        const brand = await getOrCreateBrand({ name: brandName });
        await saveSEOAudit(brand.id, {
          url,
          overallScore: parsed.overallScore ?? 0,
          categories: parsed.categories ?? [],
          recommendations: parsed.recommendations ?? [],
        });
      } catch (dbErr) {
        console.error("DB save error (non-blocking):", dbErr);
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ rawAnalysis: analysis });
    }
  } catch (error) {
    console.error("URL analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
