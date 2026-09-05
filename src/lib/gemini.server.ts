// Server-only Gemini caller with admin API key rotation & Lovable AI Gateway fallback.
import type { SupabaseClient } from "@supabase/supabase-js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GOOGLE_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiResult {
  text: string;
  used_key_id: string | null;
  used_source: "google_direct" | "lovable_gateway";
  latency_ms: number;
}

interface CallOpts {
  system: string;
  user_parts: GeminiPart[];
  json?: boolean;
  supabaseAdmin: SupabaseClient;
}

async function callGoogle(apiKey: string, opts: CallOpts, timeoutMs = 45_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GOOGLE_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: opts.user_parts }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: opts.json ? "application/json" : "text/plain",
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`google_${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("google_empty_response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function callLovableGateway(opts: CallOpts): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("lovable_api_key_missing");

  // Convert Gemini parts to OpenAI-compat content
  const content: any[] = [];
  for (const p of opts.user_parts) {
    if (p.text) content.push({ type: "text", text: p.text });
    else if (p.inline_data) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}` },
      });
    }
  }

  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content },
      ],
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.85,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`lovable_${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callGeminiWithRotation(opts: CallOpts): Promise<GeminiResult> {
  const started = Date.now();
  const { data: keys } = await opts.supabaseAdmin
    .from("gemini_api_keys")
    .select("id, api_key, priority")
    .eq("is_enabled", true)
    .order("priority", { ascending: true })
    .order("usage_count", { ascending: true });

  const list = keys ?? [];
  let lastError: string | null = null;

  for (const k of list) {
    try {
      const text = await callGoogle(k.api_key, opts);
      // Fetch current usage to increment atomically-enough
      const { data: cur } = await opts.supabaseAdmin
        .from("gemini_api_keys")
        .select("usage_count")
        .eq("id", k.id)
        .single();
      await opts.supabaseAdmin
        .from("gemini_api_keys")
        .update({
          usage_count: ((cur as any)?.usage_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
          health_status: "healthy",
          last_error: null,
        })
        .eq("id", k.id);
      return { text, used_key_id: k.id, used_source: "google_direct", latency_ms: Date.now() - started };
    } catch (e: any) {
      lastError = e?.message ?? String(e);
      const { data: cur } = await opts.supabaseAdmin
        .from("gemini_api_keys")
        .select("failure_count")
        .eq("id", k.id)
        .single();
      await opts.supabaseAdmin
        .from("gemini_api_keys")
        .update({
          failure_count: ((cur as any)?.failure_count ?? 0) + 1,
          health_status: "failing",
          last_error: lastError,
        })
        .eq("id", k.id);
    }
  }

  // Fallback: Lovable AI Gateway
  try {
    const text = await callLovableGateway(opts);
    return {
      text,
      used_key_id: null,
      used_source: "lovable_gateway",
      latency_ms: Date.now() - started,
    };
  } catch (e: any) {
    throw new Error(
      `Semua kunci Gemini gagal. Terakhir: ${lastError ?? "n/a"}. Fallback gagal: ${e?.message ?? e}`,
    );
  }
}
