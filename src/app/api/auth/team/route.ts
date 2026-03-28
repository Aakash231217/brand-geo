import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashPassword } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

// GET — list team members
export async function GET() {
  try {
    const { error, status, user } = await requireAuth("team:read");
    if (error) return NextResponse.json({ error }, { status });

    const members = await prisma.user.findMany({
      where: user!.brandId ? { brandId: user!.brandId } : {},
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error("Team list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — invite a new team member
export async function POST(req: Request) {
  try {
    const { error, status } = await requireAuth("team:invite");
    if (error) return NextResponse.json({ error }, { status });

    const { email, name, role, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const validRoles: Role[] = ["VIEWER", "EDITOR", "ADMIN"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role. Cannot assign OWNER role." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const member = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        role: role || "VIEWER",
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ member });
  } catch (err) {
    console.error("Team invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — change a team member's role
export async function PATCH(req: Request) {
  try {
    const { error, status, user } = await requireAuth("team:changeRole");
    if (error) return NextResponse.json({ error }, { status });

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (userId === user!.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const validRoles: Role[] = ["VIEWER", "EDITOR", "ADMIN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    console.error("Role change error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a team member
export async function DELETE(req: Request) {
  try {
    const { error, status, user } = await requireAuth("team:remove");
    if (error) return NextResponse.json({ error }, { status });

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userId === user!.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Team remove error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
