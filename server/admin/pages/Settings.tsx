import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function Settings() {
  const [pollInterval, setPollInterval] = useState<number>(60);
  const [pollingEnabled, setPollingEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingPoll, setTogglingPoll] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setPollInterval(data.pollInterval ?? 60);
        setPollingEnabled(data.pollingEnabled ?? true);
      }
    } catch {
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveInterval = async () => {
    if (!pollInterval || pollInterval < 1) {
      toast.error("Poll interval must be at least 1 second");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollInterval }),
      });

      if (res.ok) {
        toast.success("Poll interval saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePolling = async (enabled: boolean) => {
    setTogglingPoll(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollingEnabled: enabled }),
      });

      if (res.ok) {
        setPollingEnabled(enabled);
        toast.success(enabled ? "Polling enabled" : "Polling disabled");
      } else {
        toast.error("Failed to update polling state");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setTogglingPoll(false);
    }
  };

  const intervalLabel = () => {
    if (pollInterval >= 60) {
      const m = Math.floor(pollInterval / 60);
      const s = pollInterval % 60;
      return `Every ${m} minute${m !== 1 ? "s" : ""}${s > 0 ? ` and ${s}s` : ""}`;
    }
    return `Every ${pollInterval} second${pollInterval !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Polling</CardTitle>
          <CardDescription>
            Control whether IMAP accounts are polled and how often
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Enable polling</p>
              <p className="text-xs text-slate-500">
                {pollingEnabled ? "Actively checking for new messages" : "Polling is paused"}
              </p>
            </div>
            <Switch
              checked={pollingEnabled}
              disabled={loading || togglingPoll}
              onCheckedChange={handleTogglePolling}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-interval">Poll Interval (seconds)</Label>
            <div className="flex gap-2">
              <Input
                id="poll-interval"
                type="number"
                min={1}
                placeholder="60"
                value={loading ? "" : pollInterval}
                disabled={loading}
                onChange={(e) => setPollInterval(parseInt(e.target.value) || 60)}
              />
              <Button onClick={handleSaveInterval} disabled={saving || loading}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            {!loading && (
              <p className="text-xs text-slate-500">{intervalLabel()}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>WebSocket Endpoint</CardTitle>
          <CardDescription>
            Connect to receive real-time notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700">
            ws://{typeof window !== "undefined" ? window.location.host : "..."}/ws
          </div>
          <p className="mt-2 text-xs text-slate-500">
            No authentication required. Messages are broadcast as JSON with type,
            timestamp, title, and message fields.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
