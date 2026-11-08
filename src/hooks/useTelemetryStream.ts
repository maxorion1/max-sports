import { useState, useEffect, useRef, useCallback } from "react";

export interface PlayerTelemetry {
  id: string;
  x: number;
  z: number;
  speed: number;
  team: "offense" | "defense";
  pressureLevel: number;
}

interface UseTelemetryStreamOptions {
  matchId: string;
  wsEndpoint?: string;
  fallbackIntervalMs?: number;
}

export function useTelemetryStream({
  matchId,
  wsEndpoint = `wss://sports.portal-os.com/api/telemetry/ws`,
  fallbackIntervalMs = 10, // ~100Hz simulation fallback if WS throttles
}: UseTelemetryStreamOptions) {
  const [telemetry, setTelemetry] = useState<PlayerTelemetry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "CONNECTED" | "FALLBACK_SIMULATION" | "DISCONNECTED"
  >("CONNECTING");
  
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Simulated 100Hz telemetry generator for fallback / edge testing
  const generateSimulatedFrame = useCallback((prevNodes: PlayerTelemetry[]): PlayerTelemetry[] => {
    if (prevNodes.length === 0) {
      return [
        { id: "QB1", x: 0, z: 5, speed: 4.2, team: "offense", pressureLevel: 0.85 },
        { id: "WR1", x: -12, z: -15, speed: 8.7, team: "offense", pressureLevel: 0.2 },
        { id: "CB1", x: -11, z: -14, speed: 8.5, team: "defense", pressureLevel: 0.9 },
        { id: "DE1", x: 1.5, z: 3.5, speed: 6.1, team: "defense", pressureLevel: 0.95 },
      ];
    }

    return prevNodes.map((node) => ({
      ...node,
      x: node.x + (Math.sin(performance.now() * 0.002 + node.id.charCodeAt(0)) * 0.05),
      z: node.z + (Math.cos(performance.now() * 0.002 + node.id.charCodeAt(0)) * 0.05),
      pressureLevel: Math.min(1.0, Math.max(0.1, node.pressureLevel + (Math.random() * 0.1 - 0.05))),
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${wsEndpoint}?match_id=${matchId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus("CONNECTED");
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsedData = JSON.parse(event.data);
            if (parsedData.telemetry) {
              setTelemetry(parsedData.telemetry);
            }
          } catch (err) {
            console.error("Failed to parse telemetry frame:", err);
          }
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setConnectionStatus("FALLBACK_SIMULATION");
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus("FALLBACK_SIMULATION");
          // Attempt reconnection after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (e) {
        if (!isMounted) return;
        setConnectionStatus("FALLBACK_SIMULATION");
      }
    };

    connectWebSocket();

    // 100Hz animation loop for smooth interpolation / fallback stream
    let lastUpdate = performance.now();
    const runStreamLoop = (now: number) => {
      if (connectionStatus === "FALLBACK_SIMULATION" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (now - lastUpdate >= fallbackIntervalMs) {
          setTelemetry((prev) => generateSimulatedFrame(prev));
          lastUpdate = now;
        }
      }
      animationFrameRef.current = requestAnimationFrame(runStreamLoop);
    };

    animationFrameRef.current = requestAnimationFrame(runStreamLoop);

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [matchId, wsEndpoint, fallbackIntervalMs, generateSimulatedFrame, connectionStatus]);

  return { telemetry, connectionStatus };
}
