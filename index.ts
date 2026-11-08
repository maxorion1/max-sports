import { VectorStakeSession } from "./telemetrySession";

export interface Env {
  DB: D1Database;
  VECTOR_STAKE_SESSION: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function fromHex(value: string): Uint8Array | null {
  if (!/^(?:[\da-f]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleSovereignStake(request: Request, env: Env): Promise<Response> {
  let body: {
    payload?: { matchId?: unknown; nodeId?: unknown; stakeAmount?: unknown; timestamp?: unknown; requestId?: unknown };
    publicKeyHex?: unknown;
    signatureHex?: unknown;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400, headers: corsHeaders });
  }

  const { payload, publicKeyHex, signatureHex } = body;
  if (!payload || typeof payload !== "object" || typeof publicKeyHex !== "string" || typeof signatureHex !== "string") {
    return Response.json({ error: "A payload, public key, and signature are required." }, { status: 400, headers: corsHeaders });
  }
  const { matchId, nodeId, stakeAmount, timestamp, requestId } = payload;
  if (
    typeof matchId !== "string" || matchId.length < 1 || matchId.length > 128 ||
    typeof nodeId !== "string" || nodeId.length < 1 || nodeId.length > 128 ||
    typeof stakeAmount !== "number" || !Number.isSafeInteger(stakeAmount) || stakeAmount < 1 || stakeAmount > 10000 ||
    typeof timestamp !== "number" || !Number.isSafeInteger(timestamp) ||
    typeof requestId !== "string" || requestId.length < 1 || requestId.length > 128
  ) {
    return Response.json({ error: "Stake payload is invalid." }, { status: 400, headers: corsHeaders });
  }
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return Response.json({ error: "Signed request has expired. Please submit it again." }, { status: 401, headers: corsHeaders });
  }

  const publicKeyBytes = fromHex(publicKeyHex);
  const signatureBytes = fromHex(signatureHex);
  if (!publicKeyBytes || !signatureBytes || publicKeyBytes.byteLength > 256 || signatureBytes.byteLength !== 64) {
    return Response.json({ error: "Public key or signature encoding is invalid." }, { status: 400, headers: corsHeaders });
  }

  try {
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signatureBytes,
      new TextEncoder().encode(JSON.stringify(payload)),
    );
    if (!isValid) {
      return Response.json({ error: "Invalid cryptographic signature." }, { status: 401, headers: corsHeaders });
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBytes);
    const sovereignId = `0xMAX_${toHex(new Uint8Array(hashBuffer)).slice(0, 16)}`;
    const stakeId = crypto.randomUUID();

    // Persist only after verification. The unique signature constraint blocks exact replay.
    await env.DB.prepare(
      `INSERT INTO sovereign_stakes
        (id, match_id, node_id, wallet_address, stake_amount, status, signature_hex, request_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?, ?, ?)`,
    ).bind(stakeId, matchId, nodeId, sovereignId, stakeAmount, signatureHex.toLowerCase(), requestId, Date.now()).run();

    return Response.json({
      success: true,
      sovereignId,
      transactionHash: stakeId,
      status: "VERIFIED_AT_EDGE",
    }, { headers: corsHeaders });
  } catch (error) {
    // Duplicate request/signature is a replay, not an internal server error.
    const message = error instanceof Error ? error.message : "Unable to verify or persist stake.";
    if (/unique|constraint/i.test(message)) {
      return Response.json({ error: "This signed stake request has already been submitted." }, { status: 409, headers: corsHeaders });
    }
    return Response.json({ error: "Unable to verify or persist the signed stake request." }, { status: 500, headers: corsHeaders });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/stake/sovereign") {
      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
      }
      return handleSovereignStake(request, env);
    }

    // 1. Sovereign Session Authentication Route
    if (url.pathname === "/api/auth/session") {
      return new Response(JSON.stringify({
        account: "maxorion1",
        sovereign_pass: true,
        kernel: "Planetary-MAX",
      }), { headers: { "content-type": "application/json" } });
    }

    // 2. High-Frequency Telemetry WebSocket Routing
    if (url.pathname.startsWith("/api/telemetry/ws")) {
      const matchId = url.searchParams.get("match_id") || "global-default-match";
      const id = env.VECTOR_STAKE_SESSION.idFromName(matchId);
      return env.VECTOR_STAKE_SESSION.get(id).fetch(request);
    }

    // 3. Existing Vector Stake API routing
    if (url.pathname.startsWith("/api/stake")) {
      const id = env.VECTOR_STAKE_SESSION.idFromName("global-match-pool");
      return env.VECTOR_STAKE_SESSION.get(id).fetch(request);
    }

    // 4. Fallback to Cloudflare Workers Static Assets (Frontend SPA & Wasm Bundle)
    return env.ASSETS
      ? env.ASSETS.fetch(request)
      : new Response("MAX-SPORTS maxorion1 Edge Active", { status: 200 });
  },
};

// Export the Durable Object class so the Worker runtime binds it.
export { VectorStakeSession };
