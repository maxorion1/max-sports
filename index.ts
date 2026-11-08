export interface Env {
  DB: D1Database;
  VECTOR_STAKE_SESSION: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth/session") {
      return new Response(JSON.stringify({
        account: "maxorion1",
        sovereign_pass: true,
        kernel: "Planetary-MAX"
      }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname.startsWith("/api/stake")) {
      const id = env.VECTOR_STAKE_SESSION.idFromName("global-match-pool");
      const stub = env.VECTOR_STAKE_SESSION.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS
      ? env.ASSETS.fetch(request)
      : new Response("MAX-SPORTS maxorion1 Edge Active", { status: 200 });
  }
};

export class VectorStakeSession {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      owner: "maxorion1",
      state_lock: "EXECUTED",
      latency: "<1ms"
    }), {
      headers: { "content-type": "application/json" }
    });
  }
}
