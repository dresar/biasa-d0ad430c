import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dropdowns")({
  component: DropdownsPage,
});

function DropdownsPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ label: "", value: "" });

  const load = async () => {
    const { data: c } = await supabase.from("dropdown_categories").select("*").order("sort_order");
    setCats(c ?? []);
    if (c && c.length && !activeCat) setActiveCat(c[0].id);
    const { data: i } = await supabase.from("dropdown_items").select("*").order("sort_order");
    const grouped: Record<string, any[]> = {};
    for (const it of i ?? []) (grouped[it.category_id] ??= []).push(it);
    setItems(grouped);
  };
  useEffect(() => { load(); }, []);

  const toggleCat = async (id: string, v: boolean) => {
    await supabase.from("dropdown_categories").update({ is_enabled: v }).eq("id", id);
    load();
  };
  const addItem = async () => {
    if (!activeCat || !newItem.label.trim()) return;
    const value = newItem.value.trim() || newItem.label.trim().toLowerCase().replace(/\s+/g, "_");
    const { error } = await supabase.from("dropdown_items").insert({
      category_id: activeCat, label: newItem.label, value, sort_order: 999, is_enabled: true,
    });
    if (error) return toast.error(error.message);
    setNewItem({ label: "", value: "" });
    load();
  };
  const delItem = async (id: string) => {
    await supabase.from("dropdown_items").delete().eq("id", id);
    load();
  };

  const activeItems = activeCat ? (items[activeCat] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen Dropdown</h1>
        <p className="text-muted-foreground mt-1">Kelola kategori dan opsi parameter prompt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 md:col-span-1">
          <h2 className="font-semibold mb-3">Kategori ({cats.length})</h2>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {cats.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={`w-full text-left p-2 rounded-md text-sm flex items-center justify-between ${activeCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <span>{c.label}</span>
                <Badge variant="secondary" className="text-xs">{items[c.id]?.length ?? 0}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:col-span-2">
          {activeCat ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">{cats.find((c) => c.id === activeCat)?.label}</h2>
                  <p className="text-xs text-muted-foreground">{cats.find((c) => c.id === activeCat)?.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  Aktif <Switch checked={cats.find((c) => c.id === activeCat)?.is_enabled ?? false} onCheckedChange={(v) => toggleCat(activeCat, v)} />
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Label opsi baru" value={newItem.label} onChange={(e) => setNewItem((s) => ({ ...s, label: e.target.value }))} />
                <Input placeholder="value (opsional)" value={newItem.value} onChange={(e) => setNewItem((s) => ({ ...s, value: e.target.value }))} />
                <Button onClick={addItem}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 max-h-[440px] overflow-y-auto">
                {activeItems.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-2 border border-border rounded-md text-sm">
                    <div><span className="font-medium">{i.label}</span> <span className="text-muted-foreground">({i.value})</span></div>
                    <Button size="icon" variant="ghost" onClick={() => delItem(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {activeItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada opsi.</p>}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Pilih kategori di kiri.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
