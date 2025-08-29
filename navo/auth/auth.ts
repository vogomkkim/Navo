import jwt from "jsonwebtoken";
import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  hashPassword as hashWithScrypt,
  verifyPassword as verifyWithScrypt,
} from "./password.js";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function handleRegister(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.log("[AUTH] 🚀 Entering handleRegister");

  try {
    const { email, password, name } = request.body as any;
    console.log("[AUTH] 📝 Registration attempt for:", {
      email,
      name: name || "not provided",
    });

    if (!email || !password) {
      console.log("[AUTH] ❌ Missing email or password");
      reply
        .status(400)
        .send({ ok: false, error: "Email and password are required" });
      return;
    }

    // Check if user already exists
    console.log("[AUTH] 🔍 Checking if user already exists...");
    const existingRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const existingUser = existingRows[0];

    console.log("[AUTH] 📊 Existing user check result:", {
      found: !!existingUser,
      existingUserId: existingUser?.id,
    });

    if (existingUser) {
      console.log("[AUTH] ❌ User already exists:", existingUser.id);
      reply.status(400).send({ ok: false, error: "User already exists" });
      return;
    }

    // Hash password with scrypt
    console.log("[AUTH] 🔐 Hashing password...");
    const hashedPassword = await hashWithScrypt(password);
    console.log("[AUTH] 🔑 Password hashed successfully");

    // Create user
    console.log("[AUTH] 👤 Creating new user in database...");
    const inserted = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name: name || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    const user = inserted[0];
    console.log("[AUTH] ✅ User created successfully:", {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });

    reply.send({ ok: true, user });
  } catch (error) {
    console.error("[AUTH] 💥 Error during registration:", error);
    reply.status(500).send({ ok: false, error: "Registration failed" });
  }
}

export async function handleLogin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.log("[AUTH] 🚀 Entering handleLogin");

  try {
    const { email, password } = request.body as any;
    console.log("[AUTH] 📧 Login attempt for email:", email);

    if (!email || !password) {
      console.log("[AUTH] ❌ Missing email or password");
      reply
        .status(400)
        .send({ ok: false, error: "Email and password are required" });
      return;
    }

    // Find user
    console.log("[AUTH] 🔍 Searching for user in database...");
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    console.log("[AUTH] 📊 Database query result:", {
      found: !!user,
      userId: user?.id,
      userEmail: user?.email,
    });

    if (!user || !user.password) {
      console.log("[AUTH] ❌ User not found or invalid password");
      reply.status(401).send({ ok: false, error: "Invalid credentials" });
      return;
    }

    // Check password (scrypt only)
    console.log("[AUTH] 🔐 Verifying password...");
    const verify = await verifyWithScrypt(password, user.password);
    console.log("[AUTH] 🔑 Password verification result:", {
      isValid: verify.ok,
    });

    if (!verify.ok) {
      console.log("[AUTH] ❌ Invalid password");
      reply.status(401).send({ ok: false, error: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    console.log("[AUTH] 🎫 Generating JWT token for user:", user.id);
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: "24h" }
    );

    console.log("[AUTH] ✅ Login successful for user:", {
      userId: user.id,
      email: user.email,
      tokenGenerated: !!token,
    });

    reply.send({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[AUTH] 💥 Error during login:", error);
    reply.status(500).send({ ok: false, error: "Login failed" });
  }
}

export function getUserIdFromToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (typeof decoded === "string" || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    reply.status(401).send({ ok: false, error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (typeof decoded === "string" || !decoded.userId) {
      reply.status(401).send({ ok: false, error: "Invalid token" });
      return;
    }

    request.userId = decoded.userId;
  } catch (error) {
    reply.status(401).send({ ok: false, error: "Invalid token" });
  }
}
