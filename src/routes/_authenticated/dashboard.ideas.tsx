import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lightbulb } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateIdeasFn } from "@/lib/prompts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/ideas")({
  component: IdeasPage,
});

function IdeasPage() {
  const gen = useServerFn(generateIdeasFn);
  const [category, setCategory] = useState("teknologi");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await gen({ data: { category, count: 8 } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ide Konten AI</h1>
        <p className="text-muted-foreground mt-1">Dapatkan ide segar berdasarkan kategori pilihanmu.</p>
      </div>
      <Card className="p-5 space-y-4">
        <div>
          <Label>Kategori</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Contoh: teknologi, fashion, makanan..." className="mt-1.5" />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
          Cari Ide
        </Button>
      </Card>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.ideas ?? []).map((i: any, idx: number) => (
            <Card key={idx} className="p-4">
              <h3 className="font-semibold">{i.title}</h3>
              <p className="text-sm text-primary mt-2 italic">"{i.hook}"</p>
              <p className="text-xs text-muted-foreground mt-2">{i.why}</p>
            </Card>
          ))}
          {(data.series ?? []).length > 0 && (
            <Card className="p-4 md:col-span-2">
              <h3 className="font-semibold mb-2">💡 Ide Serial Konten</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.series.map((s: string, i: number) => <li key={i}>• {s}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
