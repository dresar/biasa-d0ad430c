import { createServerFn } from "@tanstack/react-start";

/**
 * Ensures the two demo accounts exist and have correct roles.
 * Idempotent — safe to call from the /auth page on mount.
 */
export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const demos = [
    { email: "demo@user.com", password: "password123", role: "user" as const, full_name: "Demo User" },
    { email: "admin@demo.com", password: "admin123", role: "admin" as const, full_name: "Demo Admin" },
  ];

  for (const d of demos) {
    // Try to find existing user by email
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let existing = list?.users?.find((u) => u.email?.toLowerCase() === d.email.toLowerCase());

    if (!existing) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: d.email,
        password: d.password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name },
      });
      if (error) {
        console.error("[bootstrap] createUser failed", d.email, error.message);
        continue;
      }
      existing = created.user!;
    }

    // Ensure profile & role
    await supabaseAdmin.from("profiles").upsert(
      { id: existing.id, email: d.email, full_name: d.full_name },
      { onConflict: "id" },
    );
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: existing.id, role: d.role },
      { onConflict: "user_id,role" },
    );
  }

  return { ok: true };
});
