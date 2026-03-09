import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { join } from "path";
import { config, ImapAccount, Rule } from "./helpers/config.js";
import { initAuthentication } from "./authentication.js";
import { clearHistory } from "./helpers/history.js";
import { initWebSocketServer, getWsClientCount, getWsConnections } from "./helpers/websocket.js";
import { getPollLogs } from "./helpers/pollLog.js";
import { pollAllAccounts, previewRule } from "./helpers/imap.js";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

let cronTask: cron.ScheduledTask | null = null;

function startCronJob(intervalSeconds: number, enabled: boolean): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }

  if (!enabled) {
    console.log("IMAP polling is disabled.");
    return;
  }

  // node-cron 6-field: second minute hour dom month dow
  // For sub-minute intervals use second field, otherwise minute field.
  let cronExpression: string;
  if (intervalSeconds < 60) {
    cronExpression = `*/${Math.max(1, intervalSeconds)} * * * * *`;
  } else {
    const minutes = Math.floor(intervalSeconds / 60);
    cronExpression = `0 */${Math.max(1, minutes)} * * * *`;
  }

  console.log(
    `Starting IMAP poll cron: every ${intervalSeconds}s (expression: ${cronExpression})`
  );

  cronTask = cron.schedule(cronExpression, async () => {
    await pollAllAccounts();
  });
}

(async () => {
  if (
    !process.env.CONFIG_PANEL_USERNAME ||
    !process.env.CONFIG_PANEL_PASSWORD
  ) {
    console.error(
      "The application could not be launched because no credentials for the configuration panel were provided. Please set CONFIG_PANEL_USERNAME and CONFIG_PANEL_PASSWORD variables."
    );
    process.exit(0);
  }

  const port = 8000;
  const app = express();
  const httpServer = createHttpServer(app);

  app.use(express.json());

  initAuthentication(app);

  // Initialize WebSocket server
  initWebSocketServer(httpServer);

  // ---- REST API ----

  // GET /api/config — returns full config
  app.get("/api/config", (req, res) => {
    res.json(config.store);
  });

  // GET /api/poll-logs — returns last 50 poll log entries
  app.get("/api/poll-logs", (req, res) => {
    res.json(getPollLogs());
  });

  // GET /api/ws-clients — returns { count: number }
  app.get("/api/ws-clients", (req, res) => {
    res.json({ count: getWsClientCount() });
  });

  // GET /api/ws-connections — returns active connection details
  app.get("/api/ws-connections", (req, res) => {
    res.json(getWsConnections());
  });

  // GET /api/rules/:id/preview — preview which messages match a rule
  app.get("/api/rules/:id/preview", async (req, res) => {
    const rules = config.get("rules");
    const rule = rules.find((r) => r.id === req.params.id);
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    try {
      const matches = await previewRule(rule);
      res.json({ matches });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  // DELETE /api/history — clear processed message history
  app.delete("/api/history", (req, res) => {
    clearHistory();
    res.json({ success: true });
  });

  // POST /api/poll — trigger manual poll
  app.post("/api/poll", async (req, res) => {
    pollAllAccounts().catch((err) =>
      console.error("Manual poll error:", err)
    );
    res.json({ success: true, message: "Poll triggered" });
  });

  // POST /api/accounts — add account
  app.post("/api/accounts", (req, res) => {
    const body = req.body as Omit<ImapAccount, "id">;
    const accounts = config.get("accounts");
    const newAccount: ImapAccount = {
      id: crypto.randomUUID(),
      name: body.name ?? "",
      host: body.host ?? "",
      port: body.port ?? 993,
      tls: body.tls ?? true,
      username: body.username ?? "",
      password: body.password ?? "",
    };
    accounts.push(newAccount);
    config.set("accounts", accounts);
    res.status(201).json(newAccount);
  });

  // PUT /api/accounts/:id — update account
  app.put("/api/accounts/:id", (req, res) => {
    const accounts = config.get("accounts");
    const idx = accounts.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    const updated: ImapAccount = {
      ...accounts[idx],
      ...(req.body as Partial<ImapAccount>),
      id: req.params.id,
    };
    accounts[idx] = updated;
    config.set("accounts", accounts);
    res.json(updated);
  });

  // DELETE /api/accounts/:id — delete account
  app.delete("/api/accounts/:id", (req, res) => {
    const accounts = config.get("accounts");
    const filtered = accounts.filter((a) => a.id !== req.params.id);
    if (filtered.length === accounts.length) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    config.set("accounts", filtered);
    res.json({ success: true });
  });

  // POST /api/rules — add rule
  app.post("/api/rules", (req, res) => {
    const body = req.body as Omit<Rule, "id">;
    const rules = config.get("rules");
    const newRule: Rule = {
      id: crypto.randomUUID(),
      accountId: body.accountId ?? "*",
      name: body.name ?? "",
      subjectPattern: body.subjectPattern,
      subjectMatchMode: body.subjectMatchMode,
      fromPattern: body.fromPattern,
      fromMatchMode: body.fromMatchMode,
      notificationTitle: body.notificationTitle ?? "",
      notificationMessage: body.notificationMessage ?? "",
      enabled: body.enabled ?? true,
    };
    rules.push(newRule);
    config.set("rules", rules);
    res.status(201).json(newRule);
  });

  // PUT /api/rules/:id — update rule
  app.put("/api/rules/:id", (req, res) => {
    const rules = config.get("rules");
    const idx = rules.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    const updated: Rule = {
      ...(req.body as Rule),
      id: req.params.id,
    };
    rules[idx] = updated;
    config.set("rules", rules);
    res.json(updated);
  });

  // DELETE /api/rules/:id — delete rule
  app.delete("/api/rules/:id", (req, res) => {
    const rules = config.get("rules");
    const filtered = rules.filter((r) => r.id !== req.params.id);
    if (filtered.length === rules.length) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    config.set("rules", filtered);
    res.json({ success: true });
  });

  // PUT /api/settings — update pollInterval and/or pollingEnabled
  app.put("/api/settings", (req, res) => {
    const body = req.body as { pollInterval?: number; pollingEnabled?: boolean };

    if (body.pollInterval !== undefined) {
      if (typeof body.pollInterval !== "number" || body.pollInterval < 1) {
        res.status(400).json({ error: "pollInterval must be a positive number" });
        return;
      }
      config.set("pollInterval", body.pollInterval);
    }

    if (body.pollingEnabled !== undefined) {
      config.set("pollingEnabled", body.pollingEnabled);
    }

    startCronJob(config.get("pollInterval"), config.get("pollingEnabled"));
    res.json({ success: true, pollInterval: config.get("pollInterval"), pollingEnabled: config.get("pollingEnabled") });
  });

  // ---- Static / Vite dev ----
  if (process.env.NODE_ENV === "development") {
    const viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      configFile: join(process.cwd(), "vite.config.js"),
      root: join(process.cwd(), "server", "admin"),
      base: "/",
    });
    app.use(viteDevServer.middlewares);
  } else {
    app.use(express.static(join(process.cwd(), "dist")));
  }

  // Start polling cron
  startCronJob(config.get("pollInterval"), config.get("pollingEnabled"));

  httpServer.listen(port, () => {
    console.log("Server started: http://localhost:" + port);
    console.log("WebSocket server: ws://localhost:" + port + "/ws");
  });
})();
