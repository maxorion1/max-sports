import { VectorStakeSession } from "./telemetrySession";

export interface Env {
  DB: D1Database;
  VECTOR_STAKE_SESSION: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Sovereign Session Authentication Route
    if (url.pathname === "/api/auth/session") {
      return new Response(
        JSON.stringify({
          account: "maxorion1",
          sovereign_pass: true,
          kernel: "Planetary-MAX",
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // 2. High-Frequency Telemetry WebSocket Routing
    if (url.pathname.startsWith("/api/telemetry/ws")) {
      const matchId = url.searchParams.get("match_id") || "global-default-match";

      // Derive a unique, persistent Durable Object instance ID for the specific match
      const id = env.VECTOR_STAKE_SESSION.idFromName(matchId);
      const stub = env.VECTOR_STAKE_SESSION.get(id);

      // Forward the WebSocket handshake request directly to the Durable Object
      return stub.fetch(request);
    }

    // 3. Vector Stake Execution & State Lock API Route
    if (url.pathname.startsWith("/api/stake")) {
      const id = env.VECTOR_STAKE_SESSION.idFromName("global-match-pool");
      const stub = env.VECTOR_STAKE_SESSION.get(id);
      return stub.fetch(request);
    }

    // 4. Fallback to Cloudflare Pages Static Assets (Frontend SPA & Wasm Bundle)
    return env.ASSETS
      ? env.ASSETS.fetch(request)
      : new Response("MAX-SPORTS maxorion1 Edge Active", { status: 200 });
  },
};

// Export the Durable Object class so the Cloudflare Worker runtime binds it
export { VectorStakeSession };
