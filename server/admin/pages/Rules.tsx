import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type ImapAccount = {
  id: string;
  name: string;
};

type Rule = {
  id: string;
  accountId: string;
  name: string;
  subjectRegex?: string;
  fromRegex?: string;
  notificationTitle: string;
  notificationMessage: string;
  enabled: boolean;
};

const defaultRule: Omit<Rule, "id"> = {
  accountId: "*",
  name: "",
  subjectRegex: "",
  fromRegex: "",
  notificationTitle: "New email: {{subject}}",
  notificationMessage: "From: {{from}}\nDate: {{date}}",
  enabled: true,
};

export function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<ImapAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<Omit<Rule, "id">>(defaultRule);
  const [saving, setSaving] = useState(false);

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
      subjectRegex: rule.subjectRegex ?? "",
      fromRegex: rule.fromRegex ?? "",
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
      const url = editingRule
        ? `/api/rules/${editingRule.id}`
        : "/api/rules";
      const method = editingRule ? "PUT" : "POST";

      const body = {
        ...form,
        subjectRegex: form.subjectRegex || undefined,
        fromRegex: form.fromRegex || undefined,
      };

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

  const getAccountName = (accountId: string) => {
    if (accountId === "*") return "All accounts";
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.name : accountId;
  };

  return (
    <div className="space-y-6">
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
              <DialogTitle>
                {editingRule ? "Edit Rule" : "Add Rule"}
              </DialogTitle>
              <DialogDescription>
                Define when to send notifications and what to include.
                Templates support: {"{{subject}}"}, {"{{from}}"}, {"{{date}}"}, {"{{to}}"}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rule-subject">Subject Regex (optional)</Label>
                  <Input
                    id="rule-subject"
                    placeholder="e.g. invoice|payment"
                    value={form.subjectRegex}
                    onChange={(e) =>
                      setForm({ ...form, subjectRegex: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-from">From Regex (optional)</Label>
                  <Input
                    id="rule-from"
                    placeholder="e.g. @company\.com"
                    value={form.fromRegex}
                    onChange={(e) =>
                      setForm({ ...form, fromRegex: e.target.value })
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
                  placeholder="From: {{from}}&#10;Date: {{date}}"
                  value={form.notificationMessage}
                  onChange={(e) =>
                    setForm({ ...form, notificationMessage: e.target.value })
                  }
                  rows={3}
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
                      {rule.subjectRegex ? (
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {rule.subjectRegex}
                        </code>
                      ) : (
                        <span className="text-slate-400 text-xs">any</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rule.fromRegex ? (
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {rule.fromRegex}
                        </code>
                      ) : (
                        <span className="text-slate-400 text-xs">any</span>
                      )}
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
