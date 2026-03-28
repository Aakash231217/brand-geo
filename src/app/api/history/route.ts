import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("analysis:read");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const brandName = req.nextUrl.searchParams.get("brand");
  const type = req.nextUrl.searchParams.get("type");
  const limitStr = req.nextUrl.searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 20;

  if (!brandName || !type) {
    return NextResponse.json({ error: "brand and type are required" }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({
    where: { name: brandName, users: { some: { id: auth.user!.id } } },
  });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const brandId = brand.id;

  switch (type) {
    case "visibility": {
      const data = await prisma.visibilitySnapshot.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "seo": {
      const data = await prisma.sEOAudit.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "competitors": {
      const data = await prisma.competitorAnalysis.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "content": {
      const data = await prisma.contentIdea.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "geo": {
      const data = await prisma.gEOAnalysis.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "mentions": {
      const data = await prisma.webMention.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "queries": {
      const data = await prisma.aIQuery.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }
    case "dashboard": {
      const [latestVisibility, totalQueries, totalMentions, recentAudits, visibilityHistory] =
        await Promise.all([
          prisma.visibilitySnapshot.findFirst({ where: { brandId }, orderBy: { createdAt: "desc" } }),
          prisma.aIQuery.count({ where: { brandId } }),
          prisma.webMention.count({ where: { brandId } }),
          prisma.sEOAudit.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 5 }),
          prisma.visibilitySnapshot.findMany({
            where: { brandId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { overallScore: true, createdAt: true },
          }),
        ]);
      return NextResponse.json({ latestVisibility, totalQueries, totalMentions, recentAudits, visibilityHistory });
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
