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

export type Rule = {
  id: string;
  accountId: string; // account id or '*' for all
  name: string;
  subjectRegex?: string;
  fromRegex?: string;
  notificationTitle: string;
  notificationMessage: string;
  enabled: boolean;
};

export type AppConfig = {
  accounts: ImapAccount[];
  rules: Rule[];
  pollInterval: number; // seconds
};

export const config = new Conf<AppConfig>({
  cwd: join(process.cwd(), "config"),
  projectName: "imap-notifier",
  defaults: {
    accounts: [],
    rules: [],
    pollInterval: 60,
  },
  clearInvalidConfig: true,
});
