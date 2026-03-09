import { ImapFlow } from "imapflow";
import { config, ImapAccount, MatchMode, Rule } from "./config.js";
import { isMessageProcessed, markMessageProcessed } from "./history.js";
import { addPollLog } from "./pollLog.js";
import { broadcastNotification } from "./websocket.js";

function applyTemplate(
  template: string,
  vars: { subject: string; from: string; date: string; to: string; body: string }
): string {
  return template
    .replace(/\{\{subject\}\}/g, vars.subject)
    .replace(/\{\{from\}\}/g, vars.from)
    .replace(/\{\{date\}\}/g, vars.date)
    .replace(/\{\{to\}\}/g, vars.to)
    .replace(/\{\{body\}\}/g, vars.body);
}

function matchesPattern(
  pattern: string | undefined,
  mode: MatchMode | undefined,
  value: string
): boolean {
  if (!pattern) return true;
  const m = mode ?? "contains";
  switch (m) {
    case "exact":
      return value.toLowerCase() === pattern.toLowerCase();
    case "contains":
      return value.toLowerCase().includes(pattern.toLowerCase());
    case "regex":
      try {
        return new RegExp(pattern, "i").test(value);
      } catch {
        return false;
      }
  }
}

function matchesRule(
  rule: Rule,
  accountId: string,
  subject: string,
  from: string
): boolean {
  if (!rule.enabled) return false;
  if (rule.accountId !== "*" && rule.accountId !== accountId) return false;
  if (!matchesPattern(rule.subjectPattern, rule.subjectMatchMode, subject)) return false;
  if (!matchesPattern(rule.fromPattern, rule.fromMatchMode, extractAddress(from))) return false;
  return true;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extracts the address inside <> if present, otherwise returns the string as-is. */
function extractAddress(formatted: string): string {
  const m = formatted.match(/<([^>]+)>/);
  return m ? m[1] : formatted;
}

async function pollAccount(account: ImapAccount, rules: Rule[]): Promise<void> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: {
      user: account.username,
      pass: account.password,
    },
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    let matchCount = 0;
    let alreadyProcessedCount = 0;

    try {
      // Search for all unseen messages
      const searchResult = await client.search({ seen: false });
      const uids: number[] = searchResult === false ? [] : searchResult;
      const unseenCount = uids.length;

      if (uids.length === 0) {
        addPollLog({ account: account.name, status: "success", info: "No unseen messages" });
        return;
      }

      for await (const msg of client.fetch(uids, {
        uid: true,
        envelope: true,
        bodyParts: ["TEXT"],
      })) {
        const uid = String(msg.uid);
        if (isMessageProcessed(account.id, uid)) {
          alreadyProcessedCount++;
          continue;
        }

        const subject = msg.envelope?.subject ?? "(no subject)";
        const fromAddr = msg.envelope?.from?.[0];
        const from = fromAddr
          ? fromAddr.name
            ? `${fromAddr.name} <${fromAddr.address}>`
            : fromAddr.address ?? ""
          : "";
        const date = msg.envelope?.date
          ? msg.envelope.date.toISOString()
          : new Date().toISOString();
        const toAddr = msg.envelope?.to?.[0];
        const to = toAddr
          ? toAddr.name
            ? `${toAddr.name} <${toAddr.address}>`
            : toAddr.address ?? ""
          : "";
        const bodyRaw = msg.bodyParts?.get("TEXT")?.toString("utf-8") ?? "";
        const body = stripHtml(bodyRaw).slice(0, 1000);

        const matchedRules = rules.filter((r) =>
          matchesRule(r, account.id, subject, from)
        );

        if (matchedRules.length > 0) {
          markMessageProcessed(account.id, uid);
          const vars = { subject, from, date, to, body };
          for (const rule of matchedRules) {
            broadcastNotification(
              applyTemplate(rule.notificationTitle, vars),
              applyTemplate(rule.notificationMessage, vars)
            );
            matchCount++;
          }
        }
      }

      const parts: string[] = [`${unseenCount} unseen`];
      if (alreadyProcessedCount > 0) parts.push(`${alreadyProcessedCount} already processed`);
      parts.push(matchCount > 0 ? `${matchCount} matched` : "0 matched");
      addPollLog({ account: account.name, status: "success", info: parts.join(" · ") });
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`IMAP poll error for account ${account.name}:`, message);
    addPollLog({ account: account.name, status: "error", info: message });
  }
}

export type PreviewMessage = {
  uid: string;
  accountName: string;
  subject: string;
  from: string;
  date: string;
  to: string;
  body: string;
  matched: boolean;
};

export async function previewRule(rule: Rule): Promise<PreviewMessage[]> {
  const accounts = config.get("accounts");
  const targets =
    rule.accountId === "*"
      ? accounts
      : accounts.filter((a) => a.id === rule.accountId);

  const results: PreviewMessage[] = [];

  for (const account of targets) {
    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.tls,
      auth: { user: account.username, pass: account.password },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const allUids = await client.search({ all: true });
        if (!allUids || allUids.length === 0) continue;
        const recentUids = allUids.slice(-10);

        for await (const msg of client.fetch(recentUids, {
          uid: true,
          envelope: true,
          bodyParts: ["TEXT"],
        })) {
          const subject = msg.envelope?.subject ?? "(no subject)";
          const fromAddr = msg.envelope?.from?.[0];
          const from = fromAddr
            ? fromAddr.name
              ? `${fromAddr.name} <${fromAddr.address}>`
              : fromAddr.address ?? ""
            : "";
          const date = msg.envelope?.date ? msg.envelope.date.toISOString() : "";
          const toAddr = msg.envelope?.to?.[0];
          const to = toAddr
            ? toAddr.name
              ? `${toAddr.name} <${toAddr.address}>`
              : toAddr.address ?? ""
            : "";
          const bodyRaw = msg.bodyParts?.get("TEXT")?.toString("utf-8") ?? "";
          const body = stripHtml(bodyRaw).slice(0, 300);

          const matched =
            matchesPattern(rule.subjectPattern, rule.subjectMatchMode, subject) &&
            matchesPattern(rule.fromPattern, rule.fromMatchMode, extractAddress(from));

          results.push({ uid: String(msg.uid), accountName: account.name, subject, from, date, to, body, matched });
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Account "${account.name}": ${message}`);
    }
  }

  return results;
}

export async function pollAllAccounts(): Promise<void> {
  const accounts = config.get("accounts");
  const rules = config.get("rules");

  if (accounts.length === 0) {
    console.log("No IMAP accounts configured, skipping poll.");
    return;
  }

  console.log(`Polling ${accounts.length} IMAP account(s)...`);

  await Promise.allSettled(accounts.map((account) => pollAccount(account, rules)));
}
