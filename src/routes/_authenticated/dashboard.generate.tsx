import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generatePromptFn } from "@/lib/prompts.functions";
import { Loader2, Wand2, Upload, X, Copy, Star, ImageIcon } from "lucide-react";
import { InfoButton } from "@/components/info-button";

export const Route = createFileRoute("/_authenticated/dashboard/generate")({
  component: GeneratePage,
});

interface Category {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  items: { value: string; label: string; description: string | null }[];
}

const CONTENT_TYPES = [
  { value: "cinematic", label: "Sinematik / Film" },
  { value: "product", label: "Produk / Iklan" },
  { value: "portrait", label: "Portrait / Karakter" },
  { value: "landscape", label: "Landscape / Alam" },
  { value: "anime", label: "Anime / Manga" },
  { value: "logo", label: "Logo / Branding" },
  { value: "illustration", label: "Ilustrasi Digital" },
  { value: "food", label: "Food Photography" },
  { value: "fashion", label: "Fashion Editorial" },
  { value: "architecture", label: "Arsitektur / Interior" },
];

function GeneratePage() {
  const generate = useServerFn(generatePromptFn);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [imageFile, setImageFile] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("dropdown_categories")
        .select("id, slug, label, description")
        .eq("is_enabled", true)
        .order("sort_order");
      const { data: items } = await supabase
        .from("dropdown_items")
        .select("category_id, value, label, description, sort_order")
        .eq("is_enabled", true)
        .order("sort_order");
      const built = (cats ?? []).map((c) => ({
        ...c,
        items: (items ?? []).filter((i) => i.category_id === c.id).map((i) => ({
          value: i.value, label: i.label, description: i.description,
        })),
      }));
      setCategories(built);
    })();
  }, []);

  const onImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran gambar maks 10MB");
      return;
    }
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setImageFile({ base64: b64, mime: file.type, name: file.name });
  };

  const submit = async () => {
    if (!topic.trim()) {
      toast.error("Topik wajib diisi");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const filtered: Record<string, string> = {};
      for (const c of categories) if (selections[c.slug]) filtered[c.label] = selections[c.slug];
      const r = await generate({
        data: {
          topic,
          description,
          notes,
          content_type: contentType,
          selections: filtered,
          reference_image_base64: imageFile?.base64 ?? null,
          reference_image_mime: imageFile?.mime ?? null,
        },
      });
      setResult(r);
      toast.success("Prompt berhasil dibuat!");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat prompt");
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = () => {
    if (result?.prompt) {
      navigator.clipboard.writeText(result.prompt);
      toast.success("Prompt disalin ke clipboard");
    }
  };

  const toggleFavorite = async () => {
    if (!result?.id) return;
    await supabase.from("generated_prompts").update({ is_favorite: true }).eq("id", result.id);
    toast.success("Ditambahkan ke favorit");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buat Prompt Gambar</h1>
        <p className="text-muted-foreground mt-1">
          Isi parameter di bawah lalu biarkan Gemini menyusun prompt profesional untuk kamu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="topic">Topik / Ide Utama <span className="text-destructive">*</span></Label>
                <InfoButton title="Topik" description="Deskripsi singkat gambar yang kamu inginkan. Contoh: 'Ninja modern di kota Tokyo malam hari'." />
              </div>
              <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Contoh: Ninja modern di kota Tokyo malam hari" className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="desc">Deskripsi Tambahan</Label>
                <InfoButton title="Deskripsi" description="Detail visual yang ingin kamu tekankan (opsional)." />
              </div>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detail tambahan..." className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="type">Tipe Konten</Label>
                <InfoButton title="Tipe Konten" description="Pilih template gaya prompt yang paling cocok." />
              </div>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="type" className="mt-1.5"><SelectValue placeholder="Pilih tipe konten" /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label>Gambar Referensi (opsional)</Label>
                <InfoButton title="Gambar Referensi" description="Upload gambar untuk dianalisis palet warna, komposisi, dan gaya. Maks 10MB." />
              </div>
              {imageFile ? (
                <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="text-sm flex-1 truncate">{imageFile.name}</span>
                  <Button size="icon" variant="ghost" onClick={() => setImageFile(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <label className="mt-1.5 flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Klik untuk upload gambar</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
                </label>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="notes">Catatan Khusus</Label>
                <InfoButton title="Catatan" description="Instruksi tambahan untuk AI (opsional)." />
              </div>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Contoh: Hindari warna merah, fokus pada wajah..." className="mt-1.5" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold">Parameter Detail</h2>
              <InfoButton title="Parameter Detail" description="Pilih parameter yang relevan. Semakin detail, semakin akurat hasil prompt." />
              <Badge variant="secondary" className="ml-auto">{categories.length} kategori</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center gap-2">
                    <Label>{c.label}</Label>
                    {c.description && <InfoButton title={c.label} description={c.description} />}
                  </div>
                  <Select value={selections[c.slug] ?? ""} onValueChange={(v) => setSelections((s) => ({ ...s, [c.slug]: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      {c.items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          <Button size="lg" className="w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {loading ? "Memproses..." : "Buat Prompt"}
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold">Hasil Prompt</h2>
              <InfoButton title="Hasil Prompt" description="Prompt siap pakai untuk Midjourney, DALL-E, Stable Diffusion, dll." />
            </div>
            {!result ? (
              <p className="text-sm text-muted-foreground">Prompt akan muncul di sini setelah kamu klik Buat Prompt.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Prompt</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">{result.prompt}</div>
                </div>
                {result.negative_prompt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Negative Prompt</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm">{result.negative_prompt}</div>
                  </div>
                )}
                {result.viral_score && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Skor Viral</Label>
                      <span className="text-2xl font-bold text-primary">{result.viral_score.overall}/100</span>
                    </div>
                    <Progress value={result.viral_score.overall} />
                    {result.viral_score.suggestions?.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        {result.viral_score.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={copyPrompt}><Copy className="h-4 w-4 mr-1" /> Salin</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={toggleFavorite}><Star className="h-4 w-4 mr-1" /> Favorit</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
