import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { InfoButton } from "@/components/info-button";

export const Route = createFileRoute("/_authenticated/admin/keys")({
  component: KeysPage,
});

function mask(k: string) {
  if (!k) return "";
  return k.length <= 8 ? "••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

function KeysPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [priority, setPriority] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gemini_api_keys").select("*").order("priority").order("created_at");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!label.trim() || !apiKey.trim()) return toast.error("Isi label dan API key");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gemini_api_keys").insert({
      name: label, api_key: apiKey, priority, is_enabled: true,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("API key ditambahkan");
    setLabel(""); setApiKey(""); setPriority(1);
    load();
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("gemini_api_keys").update({ is_enabled: v }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Hapus API key ini?")) return;
    await supabase.from("gemini_api_keys").delete().eq("id", id);
    toast.success("Dihapus");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen API Keys Gemini</h1>
        <p className="text-muted-foreground mt-1">
          Kelola kunci Google Gemini. Sistem akan otomatis merotasi kunci berdasarkan prioritas dan status kesehatan.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Tambah API Key Baru</h2>
          <InfoButton title="API Key Gemini" description="Dapatkan gratis di https://aistudio.google.com/app/apikey" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input placeholder="Label (mis. Utama)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="AIza..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="sm:col-span-2" />
          <Input type="number" min={1} placeholder="Prioritas" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>
        <Button onClick={add} disabled={loading}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Label</th><th className="p-3">API Key</th><th className="p-3">Prioritas</th>
                <th className="p-3">Status</th><th className="p-3">Pemakaian</th><th className="p-3">Aktif</th><th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="p-3 font-medium">{k.name}</td>
                  <td className="p-3 font-mono text-xs">{mask(k.api_key)}</td>
                  <td className="p-3">{k.priority}</td>
                  <td className="p-3">
                    <Badge variant={k.health_status === "healthy" ? "secondary" : k.health_status === "failing" ? "destructive" : "outline"}>
                      {k.health_status}
                    </Badge>
                  </td>
                  <td className="p-3">{k.usage_count} / {k.failure_count} gagal</td>
                  <td className="p-3"><Switch checked={k.is_enabled} onCheckedChange={(v) => toggle(k.id, v)} /></td>
                  <td className="p-3"><Button size="icon" variant="ghost" onClick={() => del(k.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Belum ada API key. Sistem akan menggunakan Lovable AI Gateway sebagai fallback.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
