import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getUserByOpenId } from "../db";
import { sanitizeForLog } from "../lib/logSanitizer";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // First try JWT token from Authorization header (for email/password login)
    const authHeader = opts.req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, ENV.jwtSecret) as { userId: number; openId: string };
        console.log('[Auth] JWT verified:', { userId: decoded.userId });
        const fetchedUser = await getUserByOpenId(decoded.openId);
        console.log('[Auth] getUserByOpenId result:', fetchedUser ? { userId: fetchedUser.id } : null);
        user = fetchedUser || null;
      } catch (jwtError) {
        console.error('[Auth] JWT verification failed:', sanitizeForLog(jwtError));
        user = null;
      }
    }
    
    // Fallback to Manus OAuth (for OAuth login)
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
