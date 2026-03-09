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

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
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
    if (client.readyState === WebSocket.OPEN) {
      count++;
    }
  });
  return count;
}
