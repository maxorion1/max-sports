import { DurableObject } from "cloudflare:workers";

const MAX_CONCURRENT_STREAMS = 2;
const SESSION_TTL_MS = 60 * 60 * 1000;

export class StreamRateLimiter extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/check-limit" || request.method !== "GET") return new Response("Not found", { status: 404 });
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId || sessionId.length > 128) return Response.json({ allowed: false, error: "Missing or invalid stream session ID." }, { status: 400 });
    const now = Date.now();
    const prefix = "session:";
    for (const [key, expiresAt] of await this.ctx.storage.list<number>({ prefix })) {
      if (expiresAt <= now) await this.ctx.storage.delete(key);
    }
    const active = await this.ctx.storage.list<number>({ prefix });
    const key = `${prefix}${sessionId}`;
    if (!active.has(key) && active.size >= MAX_CONCURRENT_STREAMS) {
      return Response.json({ allowed: false, error: `Maximum of ${MAX_CONCURRENT_STREAMS} concurrent streams reached for this pass.` }, { status: 429 });
    }
    await this.ctx.storage.put(key, now + SESSION_TTL_MS);
    return Response.json({ allowed: true, activeCount: active.size + (active.has(key) ? 0 : 1) });
  }
}
