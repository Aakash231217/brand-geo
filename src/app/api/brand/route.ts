import { NextRequest, NextResponse } from "next/server";
import { getOrCreateBrand, updateBrand, prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - get brand for the current user
export async function GET() {
  const auth = await requireAuth("brand:read");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.user!.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: auth.user!.brandId } });
    if (brand) return NextResponse.json(brand);
  }

  // Fallback: return brands the user has access to
  const brands = await prisma.brand.findMany({
    where: { users: { some: { id: auth.user!.id } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(brands.length === 1 ? brands[0] : brands);
}

// POST - create or update brand config
export async function POST(req: NextRequest) {
  const auth = await requireAuth("brand:edit");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { brandName, brandUrl, brandDescription, industry, keywords, competitors, platforms } = body;

  if (!brandName) {
    return NextResponse.json({ error: "brandName is required" }, { status: 400 });
  }

  const brand = await getOrCreateBrand({
    name: brandName,
    url: brandUrl,
    description: brandDescription,
    industry,
    keywords,
    competitors,
    platforms,
  });

  // Update if it already existed
  const updated = await updateBrand(brand.id, {
    name: brandName,
    url: brandUrl ?? brand.url,
    description: brandDescription ?? brand.description,
    industry: industry ?? brand.industry,
    keywords: keywords ?? brand.keywords,
    competitors: competitors ?? brand.competitors,
    platforms: platforms ?? brand.platforms,
  });

  // Link brand to user if not already linked
  if (auth.user!.brandId !== brand.id) {
    await prisma.user.update({
      where: { id: auth.user!.id },
      data: { brandId: brand.id },
    });
  }

  return NextResponse.json(updated);
}
