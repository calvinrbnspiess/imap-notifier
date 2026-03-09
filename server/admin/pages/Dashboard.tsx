import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Wifi } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PollLogEntry = {
  timestamp: string;
  account: string;
  status: "success" | "error" | "skipped";
  info: string;
};

export function Dashboard() {
  const [pollLogs, setPollLogs] = useState<PollLogEntry[]>([]);
  const [wsClientCount, setWsClientCount] = useState(0);
  const [pollingEnabled, setPollingEnabled] = useState<boolean | null>(null);
  const [polling, setPolling] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, clientsRes, configRes] = await Promise.all([
        fetch("/api/poll-logs"),
        fetch("/api/ws-clients"),
        fetch("/api/config"),
      ]);
      if (logsRes.ok) setPollLogs(await logsRes.json());
      if (clientsRes.ok) setWsClientCount((await clientsRes.json()).count);
      if (configRes.ok) setPollingEnabled((await configRes.json()).pollingEnabled ?? true);
    } catch {
      // silently ignore auto-refresh errors
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const clearHistory = async () => {
    if (!confirm("Clear all processed message history? Messages will be re-evaluated on the next poll.")) return;
    setClearingHistory(true);
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (res.ok) {
        toast.success("History cleared");
      } else {
        toast.error("Failed to clear history");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setClearingHistory(false);
    }
  };

  const triggerPoll = async () => {
    setPolling(true);
    try {
      const res = await fetch("/api/poll", { method: "POST" });
      if (res.ok) {
        toast.success("Poll triggered successfully");
        setTimeout(fetchData, 2000);
      } else {
        toast.error("Failed to trigger poll");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setPolling(false);
    }
  };

  const statusBadge = (status: PollLogEntry["status"]) => {
    if (status === "success") return <Badge variant="success">success</Badge>;
    if (status === "error") return <Badge variant="error">error</Badge>;
    return <Badge variant="secondary">skipped</Badge>;
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            <Wifi className="h-3.5 w-3.5" />
            <span>{wsClientCount} WS client{wsClientCount !== 1 ? "s" : ""} connected</span>
          </div>
          {pollingEnabled !== null && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${pollingEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
              <span className={`h-2 w-2 rounded-full ${pollingEnabled ? "bg-green-500" : "bg-slate-400"}`} />
              {pollingEnabled ? "Polling active" : "Polling paused"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={clearHistory} disabled={clearingHistory}>
            {clearingHistory ? "Clearing..." : "Clear History"}
          </Button>
          <Button onClick={triggerPoll} disabled={polling} size="sm">
            {polling ? "Polling..." : "Trigger Poll"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Poll Logs</CardTitle>
          <CardDescription>Last 50 poll events across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {pollLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No poll events yet. Configure accounts and rules to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pollLogs.map((log, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">{log.account}</TableCell>
                    <TableCell>{statusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                      {log.info}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
