import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetUserSuspended, adminDeleteUser } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Search, Ban, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const listFn = useServerFn(adminListUsers);
  const suspendFn = useServerFn(adminSetUserSuspended);
  const deleteFn = useServerFn(adminDeleteUser);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const load = () => listFn({ data: { search: q } }).then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
        <p className="text-muted-foreground mt-1">Kelola akun pengguna platform.</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email..." className="pl-9" onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
        <Button onClick={load}>Cari</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left"><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Prompt</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.full_name || "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.roles.length > 0 ? u.roles.map((r: string) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">{r}</Badge>) : <span className="text-muted-foreground">user</span>}</td>
                  <td className="p-3">{u.prompts}</td>
                  <td className="p-3">{u.is_suspended ? <Badge variant="destructive">Diblokir</Badge> : <Badge variant="secondary">Aktif</Badge>}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={async () => { await suspendFn({ data: { userId: u.id, suspended: !u.is_suspended } }); toast.success("Diperbarui"); load(); }}>
                        {u.is_suspended ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={async () => { if (!confirm(`Hapus ${u.email}?`)) return; await deleteFn({ data: { userId: u.id } }); toast.success("Dihapus"); load(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
