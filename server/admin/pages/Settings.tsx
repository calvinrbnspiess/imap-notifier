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

export function Settings() {
  const [pollInterval, setPollInterval] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setPollInterval(data.pollInterval ?? 60);
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

  const handleSave = async () => {
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
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Polling Configuration</CardTitle>
          <CardDescription>
            Configure how often IMAP accounts are polled for new messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poll-interval">Poll Interval (seconds)</Label>
            <Input
              id="poll-interval"
              type="number"
              min={1}
              placeholder="60"
              value={loading ? "" : pollInterval}
              disabled={loading}
              onChange={(e) =>
                setPollInterval(parseInt(e.target.value) || 60)
              }
            />
            <p className="text-xs text-slate-500">
              {pollInterval >= 60
                ? `Every ${Math.floor(pollInterval / 60)} minute${Math.floor(pollInterval / 60) !== 1 ? "s" : ""}${pollInterval % 60 > 0 ? ` and ${pollInterval % 60}s` : ""}`
                : `Every ${pollInterval} second${pollInterval !== 1 ? "s" : ""}`}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>WebSocket Endpoint</CardTitle>
          <CardDescription>
            Connect to this endpoint to receive real-time notifications
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
