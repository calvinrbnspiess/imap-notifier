import Conf from "conf";
import { join } from "path";

export type ImapAccount = {
  id: string;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
};

export type MatchMode = "contains" | "exact" | "regex";

export type Rule = {
  id: string;
  accountId: string; // account id or '*' for all
  name: string;
  subjectPattern?: string;
  subjectMatchMode?: MatchMode;
  fromPattern?: string;
  fromMatchMode?: MatchMode;
  notificationTitle: string;
  notificationMessage: string;
  enabled: boolean;
};

export type AppConfig = {
  accounts: ImapAccount[];
  rules: Rule[];
  pollInterval: number; // seconds
  pollingEnabled: boolean;
};

export const config = new Conf<AppConfig>({
  cwd: join(process.cwd(), "config"),
  projectName: "imap-notifier",
  defaults: {
    accounts: [],
    rules: [],
    pollInterval: 60,
    pollingEnabled: true,
  },
  clearInvalidConfig: true,
});
