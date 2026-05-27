import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getDb } from "../db";
import { signToken, hashPassword, verifyPassword } from "./auth";
import { getSessionCookieOptions } from "./cookies";
import { getAllowedEmail } from "../db";

export function registerAuthRoutes(app: Express) {
  // Login with email + password
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = result[0];
      if (!user || !user.loginMethod) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      // loginMethod stores the hashed password
      const valid = await verifyPassword(password, user.loginMethod);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      // Update last signed in
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      const token = await signToken(user.id);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register with email + password (only allowed emails can register)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }
      // Check if email is in allowed list
      const allowed = await getAllowedEmail(email);
      if (!allowed) {
        res.status(403).json({ error: "This email is not authorized to register" });
        return;
      }
      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "User already exists. Please login instead." });
        return;
      }
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const displayName = name || allowed.name || email.split("@")[0];
      await db.insert(users).values({
        openId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: displayName,
        email,
        loginMethod: hashedPassword, // Store hashed password in loginMethod field
        role: "user",
        lastSignedIn: new Date(),
      });
      const newUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!newUser[0]) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }
      const token = await signToken(newUser[0].id);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: newUser[0].id, name: displayName, email, role: "user" } });
    } catch (error) {
      console.error("[Auth] Register error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
