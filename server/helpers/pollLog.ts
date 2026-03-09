export type PollLogEntry = {
  timestamp: string;
  account: string;
  status: "success" | "error" | "skipped";
  matchCount: number;
  info: string;
};

const MAX_ENTRIES = 50;
const pollLogs: PollLogEntry[] = [];

export function addPollLog(entry: Omit<PollLogEntry, "timestamp">): void {
  const logEntry: PollLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  pollLogs.unshift(logEntry);
  if (pollLogs.length > MAX_ENTRIES) {
    pollLogs.splice(MAX_ENTRIES);
  }
}

export function getPollLogs(): PollLogEntry[] {
  return [...pollLogs];
}
