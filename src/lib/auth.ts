import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { Role } from "@/generated/prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const SESSION_COOKIE = "brandai_session";
const SESSION_EXPIRY_DAYS = 7;

// --- Password helpers ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT helpers ---

export function signToken(payload: { userId: string; email: string; role: Role }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` });
}

export function verifyToken(token: string): { userId: string; email: string; role: Role } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: Role };
  } catch {
    return null;
  }
}

// --- Session helpers ---

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Clean up old sessions for this user (keep max 5)
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (sessions.length >= 5) {
    const toDelete = sessions.slice(4).map((s) => s.id);
    await prisma.session.deleteMany({ where: { id: { in: toDelete } } });
  }

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true, role: true, avatar: true, brandId: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function setSessionCookie(token: string, expiresAt: Date) {
  // Returns cookie options — caller sets the cookie on response
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

// --- RBAC helpers ---

// Role hierarchy: OWNER > ADMIN > EDITOR > VIEWER
const ROLE_LEVEL: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

// Permission matrix
const PERMISSIONS = {
  // Brand management
  "brand:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as Role[],
  "brand:edit": ["EDITOR", "ADMIN", "OWNER"] as Role[],
  "brand:delete": ["OWNER"] as Role[],

  // Analysis (run scans, audits)
  "analysis:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as Role[],
  "analysis:run": ["EDITOR", "ADMIN", "OWNER"] as Role[],

  // Content strategy
  "content:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as Role[],
  "content:create": ["EDITOR", "ADMIN", "OWNER"] as Role[],
  "content:delete": ["ADMIN", "OWNER"] as Role[],

  // Team management
  "team:read": ["ADMIN", "OWNER"] as Role[],
  "team:invite": ["ADMIN", "OWNER"] as Role[],
  "team:remove": ["OWNER"] as Role[],
  "team:changeRole": ["OWNER"] as Role[],

  // Settings
  "settings:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as Role[],
  "settings:edit": ["ADMIN", "OWNER"] as Role[],
  "settings:api-keys": ["OWNER"] as Role[],

  // Integrations
  "integrations:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as Role[],
  "integrations:manage": ["ADMIN", "OWNER"] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

// Helper: require auth + optional permission check for API routes
export async function requireAuth(requiredPermission?: Permission) {
  const user = await getSession();
  if (!user) {
    return { error: "Unauthorized", status: 401, user: null };
  }
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return { error: "Forbidden — insufficient permissions", status: 403, user: null };
  }
  return { error: null, status: 200, user };
}
