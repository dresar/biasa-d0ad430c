import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(context: any) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Akses ditolak: bukan admin");
}

export const adminMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: totalUsers }, { count: activeKeys }, { count: promptsToday }, { count: failedReq }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("gemini_api_keys").select("*", { count: "exact", head: true }).eq("is_enabled", true),
      supabaseAdmin.from("generated_prompts").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabaseAdmin.from("logs").select("*", { count: "exact", head: true }).eq("is_success", false).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
    ]);

    const { data: latencyRows } = await supabaseAdmin
      .from("logs")
      .select("latency_ms")
      .eq("is_success", true)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
      .not("latency_ms", "is", null)
      .limit(200);
    const lats = (latencyRows ?? []).map((r: any) => r.latency_ms).filter((n) => typeof n === "number");
    const avgLatency = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;

    const { data: popular } = await supabaseAdmin
      .from("generated_prompts")
      .select("content_type")
      .not("content_type", "is", null)
      .limit(500);
    const counts: Record<string, number> = {};
    for (const p of popular ?? []) if (p.content_type) counts[p.content_type] = (counts[p.content_type] ?? 0) + 1;
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    const { data: newUsers } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      totalUsers: totalUsers ?? 0,
      activeKeys: activeKeys ?? 0,
      promptsToday: promptsToday ?? 0,
      failedRequests: failedReq ?? 0,
      avgLatency,
      topCategory,
      newUsers: newUsers ?? [],
    };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional().default("") }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) q = q.ilike("email", `%${data.search}%`);
    const { data: users } = await q;

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: counts } = await supabaseAdmin.from("generated_prompts").select("user_id");
    const byUser: Record<string, number> = {};
    for (const c of counts ?? []) byUser[c.user_id] = (byUser[c.user_id] ?? 0) + 1;
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? []) (rolesByUser[r.user_id] ??= []).push(r.role);

    return (users ?? []).map((u) => ({
      ...u,
      roles: rolesByUser[u.id] ?? [],
      prompts: byUser[u.id] ?? 0,
    }));
  });

export const adminSetUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_suspended: data.suspended }).eq("id", data.userId);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return (data ?? []).map((r) => r.role);
  });
