import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("generated_prompts")
      .select("id, topic, content_type, prompt, created_at")
      .eq("user_id", user.id)
      .eq("is_favorite", true)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Prompt Favorit</h1>
        <p className="text-muted-foreground mt-1">Kumpulan prompt terbaikmu.</p>
      </div>
      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada favorit. Tandai prompt dari halaman Riwayat.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{r.topic}</h3>
                    {r.content_type && <Badge variant="secondary">{r.content_type}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.prompt}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.prompt); toast.success("Disalin"); }}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("generated_prompts").update({ is_favorite: false }).eq("id", r.id); load(); }}>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
