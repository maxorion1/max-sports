import { DurableObject } from "cloudflare:workers";
import { VectorStakeSession } from "./telemetrySession";

export interface Env {
  DB: D1Database;
  VECTOR_STAKE_SESSION: DurableObjectNamespace;
  STREAM_RATE_LIMITER: DurableObjectNamespace;
  STREAM_HLS_URL?: string;
  ASSETS?: Fetcher;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Signature, X-Public-Key, X-Timestamp",
};

function fromHex(value: string): Uint8Array | null {
  if (!/^(?:[\da-f]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifySignedPayload<T extends object>(publicKeyHex: string | null, signatureHex: string | null, payload: T) {
  if (!publicKeyHex || !signatureHex) return null;
  const keyBytes = fromHex(publicKeyHex);
  const signature = fromHex(signatureHex);
  if (!keyBytes || keyBytes.byteLength > 256 || !signature || signature.byteLength !== 64) return null;
  try {
    const key = await crypto.subtle.importKey("spki", keyBytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, new TextEncoder().encode(JSON.stringify(payload)));
    if (!valid) return null;
    const hash = await crypto.subtle.digest("SHA-256", keyBytes);
    return { sovereignId: `0xMAX_${toHex(new Uint8Array(hash)).slice(0, 16)}` };
  } catch {
    return null;
  }
}

async function accountStatus(request: Request, env: Env): Promise<Response> {
  const timestamp = Number(request.headers.get("X-Timestamp"));
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return Response.json({ error: "Request timestamp expired or invalid." }, { status: 401, headers: corsHeaders });
  }
  const identity = await verifySignedPayload(request.headers.get("X-Public-Key"), request.headers.get("X-Signature"), { action: "account-status", timestamp });
  if (!identity) return Response.json({ error: "Invalid account signature." }, { status: 401, headers: corsHeaders });
  try {
    let user = await env.DB.prepare("SELECT tier, simulations_remaining FROM user_accounts WHERE wallet_address = ?")
      .bind(identity.sovereignId).first<{ tier: string; simulations_remaining: number }>();
    if (!user) {
      const now = Date.now();
      await env.DB.prepare("INSERT OR IGNORE INTO user_accounts (wallet_address, tier, simulations_remaining, created_at, updated_at) VALUES (?, 'FREE', 3, ?, ?)")
        .bind(identity.sovereignId, now, now).run();
      user = await env.DB.prepare("SELECT tier, simulations_remaining FROM user_accounts WHERE wallet_address = ?")
        .bind(identity.sovereignId).first<{ tier: string; simulations_remaining: number }>();
    }
    if (!user) throw new Error("Account missing after initialization.");
    return Response.json({ sovereignId: identity.sovereignId, tier: user.tier, simulationsRemaining: user.simulations_remaining }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Unable to read account status." }, { status: 500, headers: corsHeaders });
  }
}

async function liveStream(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
  if (!env.STREAM_HLS_URL) return Response.json({ error: "Live stream is not configured." }, { status: 503, headers: corsHeaders });
  const timestamp = Number(request.headers.get("X-Timestamp"));
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return Response.json({ error: "Request timestamp expired or invalid." }, { status: 401, headers: corsHeaders });
  }
  const streamId = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) || "default_stream";
  const identity = await verifySignedPayload(request.headers.get("X-Public-Key"), request.headers.get("X-Signature"), { streamId, expiresAt: timestamp + 60 * 60 * 1000 });
  if (!identity) return Response.json({ error: "Invalid stream signature." }, { status: 401, headers: corsHeaders });

  try {
    const pass = await env.DB.prepare("SELECT tier, expires_at FROM user_accounts WHERE wallet_address = ? AND tier IN ('SPORTS_PRO', 'ELITE', 'ENTERPRISE')")
      .bind(identity.sovereignId).first<{ tier: string; expires_at: number | null }>();
    if (!pass || (pass.expires_at !== null && pass.expires_at <= Date.now())) {
      return Response.json({ error: "No active Sports Pass found." }, { status: 403, headers: corsHeaders });
    }
    const sessionId = crypto.randomUUID();
    const limiter = env.STREAM_RATE_LIMITER.get(env.STREAM_RATE_LIMITER.idFromName(identity.sovereignId));
    const response = await limiter.fetch(`https://stream-limiter/check-limit?sessionId=${encodeURIComponent(sessionId)}`);
    const limit = await response.json() as { allowed?: boolean; error?: string };
    if (!response.ok || !limit.allowed) return Response.json({ error: limit.error || "Stream limit reached." }, { status: 429, headers: corsHeaders });
    return Response.json({ success: true, sovereignId: identity.sovereignId, sessionId, expiresAt: Date.now() + 60 * 60 * 1000, streamUrl: env.STREAM_HLS_URL }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Unable to authorize the live stream." }, { status: 500, headers: corsHeaders });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (url.pathname === "/api/account/status") {
      if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
      return accountStatus(request, env);
    }
    if (url.pathname.startsWith("/api/stream/live/")) return liveStream(request, env);
    if (url.pathname === "/api/auth/session") return Response.json({ account: "maxorion1", sovereign_pass: true, kernel: "Planetary-MAX" });
    if (url.pathname.startsWith("/api/telemetry/ws")) {
      const matchId = url.searchParams.get("match_id") || "global-default-match";
      return env.VECTOR_STAKE_SESSION.get(env.VECTOR_STAKE_SESSION.idFromName(matchId)).fetch(request);
    }
    if (url.pathname.startsWith("/api/stake")) return env.VECTOR_STAKE_SESSION.get(env.VECTOR_STAKE_SESSION.idFromName("global-match-pool")).fetch(request);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("MAX-SPORTS maxorion1 Edge Active", { status: 200 });
  },
};

export { VectorStakeSession, StreamRateLimiter };
