import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HISTORY_DIR = join(process.cwd(), "config");
const HISTORY_PATH = join(HISTORY_DIR, "history.json");

type History = {
  processedMessages: string[];
};

function readHistory(): History {
  if (!existsSync(HISTORY_PATH)) {
    return { processedMessages: [] };
  }
  try {
    const raw = readFileSync(HISTORY_PATH, "utf-8");
    const parsed = JSON.parse(raw) as History;
    if (!Array.isArray(parsed.processedMessages)) {
      return { processedMessages: [] };
    }
    return parsed;
  } catch {
    return { processedMessages: [] };
  }
}

function writeHistory(history: History): void {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), "utf-8");
}

export function isMessageProcessed(accountId: string, uid: string | number): boolean {
  const history = readHistory();
  const key = `${accountId}:${uid}`;
  return history.processedMessages.includes(key);
}

export function markMessageProcessed(accountId: string, uid: string | number): void {
  const history = readHistory();
  const key = `${accountId}:${uid}`;
  if (!history.processedMessages.includes(key)) {
    history.processedMessages.push(key);
    writeHistory(history);
  }
}
