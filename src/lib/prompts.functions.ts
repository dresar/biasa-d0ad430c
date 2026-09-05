import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  topic: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  content_type: z.string().max(100).optional().default(""),
  selections: z.record(z.string(), z.string()).default({}),
  reference_image_base64: z.string().max(15_000_000).nullable().optional(),
  reference_image_mime: z.string().max(100).nullable().optional(),
});

export const generatePromptFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callGeminiWithRotation } = await import("@/lib/gemini.server");

    // Fetch system prompt template
    const { data: templates } = await context.supabase
      .from("prompt_templates")
      .select("slug, template")
      .eq("is_enabled", true);
    const tmpl = (slug: string) => templates?.find((t) => t.slug === slug)?.template ?? "";
    const systemBase = tmpl("system_prompt") ||
      "Kamu adalah AI Prompt Engineer profesional untuk pembuatan gambar.";
    const typeTemplate = data.content_type ? tmpl(data.content_type) : "";

    // Fetch last 10 topics of this user to avoid duplication
    const { data: recent } = await context.supabase
      .from("generated_prompts")
      .select("topic")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    const recentTopics = (recent ?? []).map((r) => `- ${r.topic}`).join("\n");

    const system =
      `${systemBase}\n\n${typeTemplate}\n\nSelalu balas dalam format JSON dengan skema:\n` +
      `{"prompt": string (prompt gambar Bahasa Inggris, minimal 120 kata, detail sinematik),` +
      ` "negative_prompt": string,` +
      ` "viral_score": {"overall": number 0-100, "hook": number, "curiosity": number, "educational": number, "share": number, "visual": number, "suggestions": string[] (Bahasa Indonesia, 2-4 saran singkat)}}`;

    const selectionsBlock = Object.entries(data.selections)
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const userText =
      `Topik: ${data.topic}\n` +
      `Deskripsi: ${data.description || "-"}\n` +
      `Catatan tambahan: ${data.notes || "-"}\n` +
      `Tipe konten: ${data.content_type || "-"}\n` +
      `Parameter yang dipilih user:\n${selectionsBlock || "(tidak ada)"}\n\n` +
      `Topik terbaru user (HINDARI meniru persis):\n${recentTopics || "(kosong)"}\n\n` +
      (data.reference_image_base64
        ? "Terlampir gambar referensi — analisa palet warna, tipografi, tata letak, mood, komposisi, gaya ilustrasi. Gabungkan ke dalam prompt.\n"
        : "") +
      "Buat prompt gambar profesional siap pakai. Balas HANYA JSON valid tanpa pembungkus.";

    const parts: any[] = [{ text: userText }];
    if (data.reference_image_base64 && data.reference_image_mime) {
      parts.push({
        inline_data: {
          mime_type: data.reference_image_mime,
          data: data.reference_image_base64,
        },
      });
    }

    const started = Date.now();
    let result;
    try {
      result = await callGeminiWithRotation({
        system,
        user_parts: parts,
        json: true,
        supabaseAdmin,
      });
    } catch (e: any) {
      await supabaseAdmin.from("logs").insert({
        user_id: context.userId,
        event: "generate_prompt_failed",
        level: "error",
        is_success: false,
        latency_ms: Date.now() - started,
        metadata: { error: e?.message?.slice(0, 500) ?? String(e) },
      });
      throw new Error(e?.message ?? "Gagal menghasilkan prompt");
    }

    let parsed: { prompt: string; negative_prompt?: string; viral_score?: any };
    try {
      parsed = JSON.parse(result.text);
    } catch {
      // Try to extract JSON substring
      const m = result.text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { prompt: result.text };
    }

    const payload = {
      topic: data.topic,
      description: data.description,
      notes: data.notes,
      content_type: data.content_type,
      selections: data.selections,
      negative_prompt: parsed.negative_prompt ?? "",
      model_hint: "gemini-2.5-flash",
    };

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("generated_prompts")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        description: data.description,
        notes: data.notes,
        content_type: data.content_type,
        payload,
        prompt: parsed.prompt ?? "",
        viral_score: parsed.viral_score ?? null,
      })
      .select()
      .single();

    if (saveErr) throw new Error(`Gagal menyimpan: ${saveErr.message}`);

    await supabaseAdmin.from("logs").insert({
      user_id: context.userId,
      event: "generate_prompt",
      level: "info",
      is_success: true,
      latency_ms: result.latency_ms,
      api_key_id: result.used_key_id,
      metadata: { source: result.used_source, content_type: data.content_type },
    });

    return {
      id: saved.id,
      prompt: parsed.prompt,
      negative_prompt: parsed.negative_prompt ?? "",
      viral_score: parsed.viral_score ?? null,
      payload,
    };
  });

// -------- Content ideas --------
const IdeasInput = z.object({
  category: z.string().max(100),
  count: z.number().int().min(1).max(15).default(8),
});

export const generateIdeasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdeasInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callGeminiWithRotation } = await import("@/lib/gemini.server");

    const { data: recent } = await context.supabase
      .from("generated_prompts")
      .select("topic")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    const recentTopics = (recent ?? []).map((r) => `- ${r.topic}`).join("\n");

    const { data: hooks } = await context.supabase
      .from("hook_templates")
      .select("pattern")
      .eq("is_enabled", true)
      .order("sort_order")
      .limit(20);
    const hookPatterns = (hooks ?? []).map((h) => `- ${h.pattern}`).join("\n");

    const system =
      "Kamu adalah AI Content Strategist untuk kreator visual. Balas HANYA JSON valid: " +
      `{"ideas": [{"title": string, "hook": string, "why": string (1 kalimat)}], "series": [string]}. ` +
      "Semua dalam Bahasa Indonesia. Ide harus segar, spesifik, tidak generik.";

    const user =
      `Kategori: ${data.category}\n` +
      `Jumlah ide yang diminta: ${data.count}\n\n` +
      `Contoh pola hook viral yang bisa digunakan:\n${hookPatterns}\n\n` +
      `Topik yang SUDAH pernah dibuat oleh user (JANGAN mengulang, sarankan yang berbeda):\n${recentTopics || "(kosong)"}\n\n` +
      "Berikan ide-ide baru yang belum dieksplorasi user. Sertakan hook menarik untuk setiap ide.";

    const result = await callGeminiWithRotation({
      system,
      user_parts: [{ text: user }],
      json: true,
      supabaseAdmin,
    });

    let parsed: { ideas: any[]; series: string[] };
    try { parsed = JSON.parse(result.text); }
    catch {
      const m = result.text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { ideas: [], series: [] };
    }
    return parsed;
  });
