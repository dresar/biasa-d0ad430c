import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ensureDemoAccounts } from "@/lib/bootstrap.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

async function routeAfterLogin(navigate: ReturnType<typeof useNavigate>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = roles?.some((r) => r.role === "admin");
  navigate({ to: isAdmin ? "/admin/dashboard" : "/dashboard", replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(ensureDemoAccounts);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    bootstrap().catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterLogin(navigate);
    });
  }, [bootstrap, navigate]);

  const fillDemo = (kind: "user" | "admin") => {
    if (kind === "user") {
      setEmail("demo@user.com");
      setPassword("password123");
    } else {
      setEmail("admin@demo.com");
      setPassword("admin123");
    }
    setTab("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Gagal masuk", { description: error.message });
    toast.success("Berhasil masuk");
    await routeAfterLogin(navigate);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split("@")[0] },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) return toast.error("Gagal mendaftar", { description: error.message });
    toast.success("Akun dibuat!", { description: "Silakan masuk." });
    setTab("login");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-muted/50">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          AI Prompt Studio
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight max-w-md">
            Buat prompt gambar AI profesional dengan mudah.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-sm">
            Bergabung dengan ribuan kreator yang mempercepat alur kerja mereka.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© AI Prompt Studio</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-6 flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            AI Prompt Studio
          </div>
          <Card className="p-6">
            <div className="mb-6 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => fillDemo("user")}>
                Login sebagai User
              </Button>
              <Button variant="outline" size="sm" onClick={() => fillDemo("admin")}>
                Login sebagai Admin
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anda@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Kata Sandi</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Masuk
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nama Lengkap</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Anda" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">Email</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anda@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password2">Kata Sandi</Label>
                    <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 karakter" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Buat Akun
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
