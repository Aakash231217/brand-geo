import { NextRequest, NextResponse } from "next/server";
import { generateContentIdeas } from "@/lib/openrouter";
import { getTrendingQueries } from "@/lib/bright-data";
import { getOrCreateBrand, saveContentIdeas } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function persistIdeas(brandName: string, ideas: { title: string; type: string; targetKeywords?: string[]; estimatedImpact?: string; reason?: string }[]) {
  try {
    const brand = await getOrCreateBrand({ name: brandName });
    await saveContentIdeas(brand.id, ideas.map((i) => ({
      title: i.title ?? "",
      type: i.type ?? "article",
      targetKeywords: i.targetKeywords ?? [],
      estimatedImpact: i.estimatedImpact ?? "medium",
      reason: i.reason ?? "",
    })));
  } catch (dbErr) {
    console.error("DB save error (non-blocking):", dbErr);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("content:create");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { brandName, industry, keywords } = body;

    if (!brandName || !industry || !keywords?.length) {
      return NextResponse.json(
        { error: "brandName, industry, and keywords are required" },
        { status: 400 }
      );
    }

    // Get real trending queries to inform content ideas
    const trending = await getTrendingQueries(brandName, industry);

    const ideas = await generateContentIdeas(brandName, industry, keywords, trending.relatedQueries, trending.peopleAlsoAsk);

    try {
      const parsed = JSON.parse(ideas);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      await persistIdeas(brandName, arr);
      return NextResponse.json(arr);
    } catch {
      const match = ideas.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const arr = JSON.parse(match[0]);
          await persistIdeas(brandName, arr);
          return NextResponse.json(arr);
        } catch {
          // fall through
        }
      }
      return NextResponse.json({ rawContent: ideas });
    }
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
