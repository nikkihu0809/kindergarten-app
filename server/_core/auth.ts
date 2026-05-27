import * as jose from "jose";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { getDb } from "../db";
import bcrypt from "bcryptjs";

const ALGORITHM = "HS256";

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signToken(userId: number): Promise<string> {
  const jwt = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
  return jwt;
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    const userId = payload.userId as number;
    if (!userId) return null;
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
