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
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
};

const defaultAccount: Omit<ImapAccount, "id"> = {
  name: "",
  host: "",
  port: 993,
  tls: true,
  username: "",
  password: "",
};

export function Accounts() {
  const [accounts, setAccounts] = useState<ImapAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ImapAccount | null>(null);
  const [form, setForm] = useState<Omit<ImapAccount, "id">>(defaultAccount);
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      }
    } catch {
      toast.error("Failed to fetch accounts");
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const openAdd = () => {
    setEditingAccount(null);
    setForm(defaultAccount);
    setDialogOpen(true);
  };

  const openEdit = (account: ImapAccount) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      host: account.host,
      port: account.port,
      tls: account.tls,
      username: account.username,
      password: account.password,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.host || !form.username) {
      toast.error("Name, host, and username are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : "/api/accounts";
      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(
          editingAccount ? "Account updated" : "Account added"
        );
        setDialogOpen(false);
        fetchAccounts();
      } else {
        toast.error("Failed to save account");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: ImapAccount) => {
    if (!confirm(`Delete account "${account.name}"?`)) return;

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Account deleted");
        fetchAccounts();
      } else {
        toast.error("Failed to delete account");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">IMAP Accounts</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Add Account"}
              </DialogTitle>
              <DialogDescription>
                Configure an IMAP account for polling.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acc-name">Name</Label>
                <Input
                  id="acc-name"
                  placeholder="My Mail Account"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-host">Host</Label>
                <Input
                  id="acc-host"
                  placeholder="imap.example.com"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="acc-port">Port</Label>
                  <Input
                    id="acc-port"
                    type="number"
                    placeholder="993"
                    value={form.port}
                    onChange={(e) =>
                      setForm({ ...form, port: parseInt(e.target.value) || 993 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>TLS</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={form.tls}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, tls: checked })
                      }
                    />
                    <span className="text-sm text-slate-600">
                      {form.tls ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-username">Username</Label>
                <Input
                  id="acc-username"
                  type="email"
                  placeholder="user@example.com"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-password">Password</Label>
                <Input
                  id="acc-password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
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
          <CardTitle>Configured Accounts</CardTitle>
          <CardDescription>
            IMAP accounts that will be polled on the configured interval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No accounts configured yet. Add an account to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>TLS</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-slate-600">{account.host}</TableCell>
                    <TableCell>{account.port}</TableCell>
                    <TableCell>
                      {account.tls ? (
                        <Badge variant="success">TLS</Badge>
                      ) : (
                        <Badge variant="secondary">Plain</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{account.username}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(account)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(account)}
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
