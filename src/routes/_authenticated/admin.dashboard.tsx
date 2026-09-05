import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { adminMetrics } from "@/lib/admin.functions";
import { Users, Key, Sparkles, AlertTriangle, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fn = useServerFn(adminMetrics);
  const [m, setM] = useState<any>(null);
  useEffect(() => { fn({} as any).then(setM).catch(() => setM({})); }, [fn]);

  const stats = [
    { icon: Users, label: "Total Pengguna", value: m?.totalUsers ?? "…" },
    { icon: Key, label: "API Keys Aktif", value: m?.activeKeys ?? "…" },
    { icon: Sparkles, label: "Prompt Hari Ini", value: m?.promptsToday ?? "…" },
    { icon: AlertTriangle, label: "Gagal 24 Jam", value: m?.failedRequests ?? "…" },
    { icon: Clock, label: "Latensi Rata-rata", value: m ? `${m.avgLatency}ms` : "…" },
    { icon: TrendingUp, label: "Kategori Terpopuler", value: m?.topCategory ?? "…" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ringkasan Sistem</h1>
        <p className="text-muted-foreground mt-1">Metrik real-time platform AI Prompt Studio.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-4 w-4" /></div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Pengguna Baru</h2>
        {(m?.newUsers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(m?.newUsers ?? []).map((u: any) => (
              <li key={u.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("id-ID")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
