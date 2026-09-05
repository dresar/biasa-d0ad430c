import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Lightbulb, History, Heart, Sparkles, TrendingUp } from "lucide-react";
import { InfoButton } from "@/components/info-button";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const [name, setName] = useState<string>("");
  const [stats, setStats] = useState({ total: 0, favorites: 0, today: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
      setName(prof?.full_name || prof?.email?.split("@")[0] || "Kreator");

      const [{ count: total }, { count: favorites }, { count: today }, { data: rec }] = await Promise.all([
        supabase.from("generated_prompts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("generated_prompts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_favorite", true),
        supabase.from("generated_prompts").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
        supabase.from("generated_prompts").select("id, topic, content_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ total: total ?? 0, favorites: favorites ?? 0, today: today ?? 0 });
      setRecent(rec ?? []);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Halo, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">Selamat datang kembali di AI Prompt Studio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Sparkles} label="Total Prompt" value={stats.total} />
        <StatCard icon={Heart} label="Favorit" value={stats.favorites} />
        <StatCard icon={TrendingUp} label="Dibuat Hari Ini" value={stats.today} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAction to="/dashboard/generate" icon={Wand2} title="Buat Prompt Baru" desc="Mulai buat prompt gambar profesional dengan Gemini." />
        <QuickAction to="/dashboard/ideas" icon={Lightbulb} title="Cari Ide Konten" desc="Dapatkan ide segar yang belum pernah kamu buat." />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <h2 className="font-semibold">Aktivitas Terbaru</h2>
            <InfoButton title="Aktivitas Terbaru" description="5 prompt terakhir yang kamu buat." />
          </div>
          <Link to="/dashboard/history" className="text-sm text-primary hover:underline">Lihat semua</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada prompt. Mulai buat sekarang!</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.topic}</p>
                  <p className="text-xs text-muted-foreground">{r.content_type || "—"} • {new Date(r.created_at).toLocaleString("id-ID")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, title, desc }: any) {
  return (
    <Link to={to} className="block">
      <Card className="p-5 hover:border-primary/50 transition group">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
