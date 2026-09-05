import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Star, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("generated_prompts")
      .select("id, topic, content_type, prompt, is_favorite, created_at, viral_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => !q || r.topic.toLowerCase().includes(q.toLowerCase()));

  const toggleFav = async (id: string, current: boolean) => {
    await supabase.from("generated_prompts").update({ is_favorite: !current }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Hapus prompt ini?")) return;
    await supabase.from("generated_prompts").delete().eq("id", id);
    toast.success("Prompt dihapus");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Riwayat Prompt</h1>
        <p className="text-muted-foreground mt-1">Semua prompt yang pernah kamu buat.</p>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari berdasarkan topik..." className="pl-9" />
      </div>
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada prompt.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{r.topic}</h3>
                    {r.content_type && <Badge variant="secondary">{r.content_type}</Badge>}
                    {r.viral_score?.overall && <Badge>Skor {r.viral_score.overall}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.prompt}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("id-ID")}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.prompt); toast.success("Disalin"); }}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleFav(r.id, r.is_favorite)}>
                    <Star className={`h-4 w-4 ${r.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
