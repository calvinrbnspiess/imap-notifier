import { ImapFlow } from "imapflow";
import { config, ImapAccount, Rule } from "./config.js";
import { isMessageProcessed, markMessageProcessed } from "./history.js";
import { addPollLog } from "./pollLog.js";
import { broadcastNotification } from "./websocket.js";

function applyTemplate(
  template: string,
  vars: { subject: string; from: string; date: string; to: string }
): string {
  return template
    .replace(/\{\{subject\}\}/g, vars.subject)
    .replace(/\{\{from\}\}/g, vars.from)
    .replace(/\{\{date\}\}/g, vars.date)
    .replace(/\{\{to\}\}/g, vars.to);
}

function matchesRule(
  rule: Rule,
  accountId: string,
  subject: string,
  from: string
): boolean {
  if (!rule.enabled) return false;
  if (rule.accountId !== "*" && rule.accountId !== accountId) return false;

  if (rule.subjectRegex) {
    try {
      const re = new RegExp(rule.subjectRegex, "i");
      if (!re.test(subject)) return false;
    } catch {
      return false;
    }
  }

  if (rule.fromRegex) {
    try {
      const re = new RegExp(rule.fromRegex, "i");
      if (!re.test(from)) return false;
    } catch {
      return false;
    }
  }

  return true;
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

    try {
      // Search for all unseen messages
      const searchResult = await client.search({ seen: false });
      const uids: number[] = searchResult === false ? [] : searchResult;

      if (uids.length === 0) {
        addPollLog({
          account: account.name,
          status: "success",
          matchCount: 0,
          info: "No unseen messages",
        });
        return;
      }

      for await (const msg of client.fetch(uids, {
        uid: true,
        envelope: true,
      })) {
        const uid = String(msg.uid);
        if (isMessageProcessed(account.id, uid)) continue;

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

        markMessageProcessed(account.id, uid);

        const matchedRules = rules.filter((r) =>
          matchesRule(r, account.id, subject, from)
        );

        for (const rule of matchedRules) {
          const title = applyTemplate(rule.notificationTitle, {
            subject,
            from,
            date,
            to,
          });
          const message = applyTemplate(rule.notificationMessage, {
            subject,
            from,
            date,
            to,
          });

          broadcastNotification(title, message);
          matchCount++;
        }
      }

      addPollLog({
        account: account.name,
        status: "success",
        matchCount,
        info:
          matchCount > 0
            ? `${matchCount} notification(s) sent`
            : `${uids.length} unseen message(s) checked, no matches`,
      });
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`IMAP poll error for account ${account.name}:`, message);
    addPollLog({
      account: account.name,
      status: "error",
      matchCount: 0,
      info: message,
    });
  }
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
