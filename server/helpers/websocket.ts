import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";

let wss: WebSocketServer | null = null;

export type WsNotification = {
  type: "notification";
  timestamp: string;
  title: string;
  message: string;
};

export type WsConnectionInfo = {
  id: string;
  ip: string;
  hostname: string;
  connectedAt: string; // ISO
};

const connections = new Map<WebSocket, WsConnectionInfo>();

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    const id = crypto.randomUUID();

    connections.set(ws, {
      id,
      ip,
      hostname: "unknown",
      connectedAt: new Date().toISOString(),
    });

    console.log(`WebSocket client connected from ${ip}`);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "register") {
          const info = connections.get(ws);
          if (info) {
            info.hostname = msg.hostname ?? "unknown";
            console.log(`WebSocket client identified as ${info.hostname} (${ip})`);
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    });

    ws.on("close", () => {
      const info = connections.get(ws);
      console.log(`WebSocket client disconnected: ${info?.hostname ?? "unknown"} (${ip})`);
      connections.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  });

  console.log("WebSocket server initialized on path /ws");
  return wss;
}

export function broadcastNotification(title: string, message: string): void {
  if (!wss) return;

  const payload: WsNotification = {
    type: "notification",
    timestamp: new Date().toISOString(),
    title,
    message,
  };

  const json = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

export function getWsClientCount(): number {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) count++;
  });
  return count;
}

export function getWsConnections(): WsConnectionInfo[] {
  const result: WsConnectionInfo[] = [];
  connections.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) result.push({ ...info });
  });
  return result;
}
