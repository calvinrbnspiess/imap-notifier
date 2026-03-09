import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Loader2, Check, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MatchMode = "contains" | "exact" | "regex";

type PreviewMessage = {
  uid: string;
  accountName: string;
  subject: string;
  from: string;
  date: string;
  to: string;
  body: string;
  matched: boolean;
};

type ImapAccount = {
  id: string;
  name: string;
};

type Rule = {
  id: string;
  accountId: string;
  name: string;
  subjectPattern?: string;
  subjectMatchMode?: MatchMode;
  fromPattern?: string;
  fromMatchMode?: MatchMode;
  notificationTitle: string;
  notificationMessage: string;
  enabled: boolean;
};

const defaultRule: Omit<Rule, "id"> = {
  accountId: "*",
  name: "",
  subjectPattern: "",
  subjectMatchMode: "contains",
  fromPattern: "",
  fromMatchMode: "contains",
  notificationTitle: "New email: {{subject}}",
  notificationMessage: "From: {{from}}\nDate: {{date}}\n\n{{body}}",
  enabled: true,
};

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  contains: "contains",
  exact: "exact",
  regex: "regex",
};

function MatchModeSelect({
  value,
  onChange,
  id,
}: {
  value: MatchMode;
  onChange: (v: MatchMode) => void;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MatchMode)}>
      <SelectTrigger id={id} className="w-28 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="contains">contains</SelectItem>
        <SelectItem value="exact">exact</SelectItem>
        <SelectItem value="regex">regex</SelectItem>
      </SelectContent>
    </Select>
  );
}

function filterLabel(pattern: string | undefined, mode: MatchMode | undefined) {
  if (!pattern) return <span className="text-slate-400 text-xs">any</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-slate-400">{mode ?? "contains"}:</span>
      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{pattern}</code>
    </span>
  );
}

export function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<ImapAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<Omit<Rule, "id">>(defaultRule);
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRule, setPreviewRule] = useState<Rule | null>(null);
  const [previewMatches, setPreviewMatches] = useState<PreviewMessage[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
        setAccounts(data.accounts ?? []);
      }
    } catch {
      toast.error("Failed to fetch configuration");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingRule(null);
    setForm(defaultRule);
    setDialogOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm({
      accountId: rule.accountId,
      name: rule.name,
      subjectPattern: rule.subjectPattern ?? "",
      subjectMatchMode: rule.subjectMatchMode ?? "contains",
      fromPattern: rule.fromPattern ?? "",
      fromMatchMode: rule.fromMatchMode ?? "contains",
      notificationTitle: rule.notificationTitle,
      notificationMessage: rule.notificationMessage,
      enabled: rule.enabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Rule name is required");
      return;
    }
    if (!form.notificationTitle) {
      toast.error("Notification title is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingRule ? `/api/rules/${editingRule.id}` : "/api/rules";
      const method = editingRule ? "PUT" : "POST";

      const body = { ...form };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingRule ? "Rule updated" : "Rule added");
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error("Failed to save rule");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: Rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;

    try {
      const res = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rule deleted");
        fetchData();
      } else {
        toast.error("Failed to delete rule");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const toggleEnabled = async (rule: Rule) => {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      if (res.ok) {
        fetchData();
      } else {
        toast.error("Failed to update rule");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const openPreview = async (rule: Rule) => {
    setPreviewRule(rule);
    setPreviewMatches([]);
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewOpen(true);

    try {
      const res = await fetch(`/api/rules/${rule.id}/preview`);
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error ?? "Unknown error");
      } else {
        setPreviewMatches(data.matches ?? []);
      }
    } catch {
      setPreviewError("Connection error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const getAccountName = (accountId: string) => {
    if (accountId === "*") return "All accounts";
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.name : accountId;
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewRule?.name}</DialogTitle>
            <DialogDescription>
              Last 10 messages per account checked against this rule's filters.
            </DialogDescription>
          </DialogHeader>

          {previewLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to mailbox…
            </div>
          )}

          {previewError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewError}
            </div>
          )}

          {!previewLoading && !previewError && (
            previewMatches.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                No messages found in mailbox.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Body preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewMatches.map((m) => (
                      <TableRow
                        key={`${m.accountName}-${m.uid}`}
                        className={m.matched ? "bg-green-50" : ""}
                      >
                        <TableCell>
                          {m.matched
                            ? <Check className="h-4 w-4 text-green-600" />
                            : <X className="h-4 w-4 text-slate-300" />}
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] truncate">{m.subject}</TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-[150px] truncate">{m.from}</TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(m.date)}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[180px] truncate">{m.body}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}

          <div className="flex justify-between items-center pt-1">
            {!previewLoading && !previewError && previewMatches.length > 0 && (
              <span className="text-xs text-slate-400">
                {previewMatches.filter((m) => m.matched).length} of {previewMatches.length} messages matched
              </span>
            )}
            <div className="ml-auto">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Rules</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
              <DialogDescription>
                Templates:{" "}
                {["{{subject}}", "{{from}}", "{{date}}", "{{to}}", "{{body}}"].map(
                  (t) => (
                    <code key={t} className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 text-xs">
                      {t}
                    </code>
                  )
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g. Alert on invoices"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-account">Account</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(val) => setForm({ ...form, accountId: val })}
                >
                  <SelectTrigger id="rule-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">All accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject Filter (optional)</Label>
                <div className="flex gap-2">
                  <MatchModeSelect
                    value={form.subjectMatchMode ?? "contains"}
                    onChange={(v) => setForm({ ...form, subjectMatchMode: v })}
                  />
                  <Input
                    placeholder={
                      form.subjectMatchMode === "regex"
                        ? "e.g. invoice|payment"
                        : "e.g. invoice"
                    }
                    value={form.subjectPattern}
                    onChange={(e) =>
                      setForm({ ...form, subjectPattern: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>From Filter (optional)</Label>
                <div className="flex gap-2">
                  <MatchModeSelect
                    value={form.fromMatchMode ?? "contains"}
                    onChange={(v) => setForm({ ...form, fromMatchMode: v })}
                  />
                  <Input
                    placeholder={
                      form.fromMatchMode === "regex"
                        ? "e.g. @company\\.com"
                        : "e.g. @company.com"
                    }
                    value={form.fromPattern}
                    onChange={(e) =>
                      setForm({ ...form, fromPattern: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-title">Notification Title</Label>
                <Input
                  id="rule-title"
                  placeholder="New email: {{subject}}"
                  value={form.notificationTitle}
                  onChange={(e) =>
                    setForm({ ...form, notificationTitle: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-message">Notification Message</Label>
                <Textarea
                  id="rule-message"
                  placeholder={"From: {{from}}\nDate: {{date}}\n\n{{body}}"}
                  value={form.notificationMessage}
                  onChange={(e) =>
                    setForm({ ...form, notificationMessage: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, enabled: checked })
                  }
                />
                <Label>Enabled</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Rules</CardTitle>
          <CardDescription>
            Rules are checked against each incoming email during polling
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No rules configured yet. Add a rule to start receiving notifications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Subject Filter</TableHead>
                  <TableHead>From Filter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {getAccountName(rule.accountId)}
                    </TableCell>
                    <TableCell>
                      {filterLabel(rule.subjectPattern, rule.subjectMatchMode)}
                    </TableCell>
                    <TableCell>
                      {filterLabel(rule.fromPattern, rule.fromMatchMode)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleEnabled(rule)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(rule)}
                          title="Preview matching messages"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rule)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
