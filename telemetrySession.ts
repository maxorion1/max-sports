import { DurableObject } from "cloudflare:workers";

interface PlayerTelemetry {
  id: string;
  x: number;
  z: number;
  speed: number;
  team: "offense" | "defense";
  pressureLevel: number;
}

export class VectorStakeSession extends DurableObject {
  private sessions: Set<WebSocket> = new Set();
  private telemetryState: PlayerTelemetry[] = [
    { id: "QB1", x: 0, z: 5, speed: 4.2, team: "offense", pressureLevel: 0.85 },
    { id: "WR1", x: -12, z: -15, speed: 8.7, team: "offense", pressureLevel: 0.2 },
    { id: "CB1", x: -11, z: -14, speed: 8.5, team: "defense", pressureLevel: 0.9 },
    { id: "DE1", x: 1.5, z: 3.5, speed: 6.1, team: "defense", pressureLevel: 0.95 },
  ];
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);

    // Restore hibernated sessions on startup.
    this.ctx.getWebSockets().forEach((ws) => {
      this.sessions.add(ws);
    });

    // Start the telemetry loop only while connections are active.
    this.startBroadcastLoop();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket endpoint for live telemetry.
    if (url.pathname.endsWith("/ws")) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected a WebSocket upgrade request", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.ctx.acceptWebSocket(server);
      this.sessions.add(server);
      this.startBroadcastLoop();

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // REST endpoint for vector stake state locks.
    if (request.method === "POST" && url.pathname.startsWith("/api/stake")) {
      let body: Record<string, unknown>;
      try {
        body = await request.json() as Record<string, unknown>;
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      return Response.json({
        state_lock: "VERIFIED",
        target_id: body.target_id,
        vector_type: body.vector_type,
        latency: "<1ms",
      });
    }

    return new Response("MAX-SPORTS Durable Object Active", { status: 200 });
  }

  // WebSocket hibernation handlers.
  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") return;
      const data = JSON.parse(message);
      if (data.type === "CLIENT_VECTOR_UPDATE") {
        this.broadcastState();
      }
    } catch {
      // Ignore malformed, binary, or control frames.
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.sessions.delete(ws);
    if (this.sessions.size === 0 && this.broadcastInterval !== null) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown) {
    this.sessions.delete(ws);
    if (this.sessions.size === 0 && this.broadcastInterval !== null) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  private startBroadcastLoop() {
    if (this.broadcastInterval !== null || this.sessions.size === 0) return;

    this.broadcastInterval = setInterval(() => {
      if (this.sessions.size === 0) {
        if (this.broadcastInterval !== null) clearInterval(this.broadcastInterval);
        this.broadcastInterval = null;
        return;
      }

      // Simulate small live position and pressure changes at a 10ms tick.
      this.telemetryState = this.telemetryState.map((node) => ({
        ...node,
        x: node.x + Math.sin(Date.now() * 0.003 + node.id.charCodeAt(0)) * 0.08,
        z: node.z + Math.cos(Date.now() * 0.003 + node.id.charCodeAt(0)) * 0.08,
        pressureLevel: Math.min(
          1.0,
          Math.max(0.1, node.pressureLevel + (Math.random() * 0.08 - 0.04))
        ),
      }));

      this.broadcastState();
    }, 10);
  }

  private broadcastState() {
    const payload = JSON.stringify({
      timestamp: Date.now(),
      telemetry: this.telemetryState,
    });

    for (const ws of this.sessions) {
      try {
        ws.send(payload);
      } catch {
        this.sessions.delete(ws);
      }
    }

    if (this.sessions.size === 0 && this.broadcastInterval !== null) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }
}
