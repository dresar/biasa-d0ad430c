import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Zap, Layers, Shield, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Landing,
});

const models = [
  "ChatGPT Images", "Gemini Image", "Google Imagen",
  "Flux", "Midjourney", "Stable Diffusion",
];

const features = [
  {
    icon: Sparkles,
    title: "Prompt Berkualitas Tinggi",
    desc: "Prompt panjang, terstruktur, dan sinematik siap pakai di semua model gambar AI populer.",
  },
  {
    icon: Layers,
    title: "20+ Parameter Terkontrol",
    desc: "Atur gaya, tata letak, palet warna, mood, komposisi, pencahayaan, dan banyak lagi.",
  },
  {
    icon: Zap,
    title: "Analisa Gambar Referensi",
    desc: "Unggah gambar dan biarkan AI menganalisa warna, tipografi, dan komposisinya.",
  },
  {
    icon: Shield,
    title: "Skor Viral & Saran",
    desc: "Setiap prompt dinilai potensi viralnya lengkap dengan saran perbaikan.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            AI Prompt Studio
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Masuk</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Mulai Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Didukung Gemini 2.5 Flash
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Buat Prompt Gambar AI Profesional dalam Hitungan Detik
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Studio prompt cerdas untuk desainer, marketer, dan pembuat konten. Hasilkan prompt siap pakai untuk ChatGPT Images, Gemini, Midjourney, Flux, dan model lainnya.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto">
              Coba Sekarang Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Login Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Models */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Kompatibel dengan model gambar AI populer
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {models.map((m) => (
            <span key={m} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Semua yang Anda butuhkan
          </h2>
          <p className="mt-3 text-muted-foreground">Perangkat lengkap untuk membuat prompt gambar berkualitas.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 bg-muted/40 rounded-3xl my-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Cara Kerja</h2>
          <p className="mt-3 text-muted-foreground">Tiga langkah sederhana.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            { n: "01", t: "Isi Detail", d: "Masukkan topik, deskripsi, dan pilih parameter dari dropdown." },
            { n: "02", t: "Generate", d: "AI menganalisa input Anda dan membuat prompt gambar lengkap." },
            { n: "03", t: "Salin & Pakai", d: "Salin prompt ke model gambar favorit Anda dan hasilkan gambar." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold mb-4">
                {s.n}
              </div>
              <h3 className="font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pertanyaan Umum</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="1">
            <AccordionTrigger>Apakah aplikasi ini membuat gambar?</AccordionTrigger>
            <AccordionContent>Tidak. AI Prompt Studio membuat <b>prompt</b> berkualitas tinggi yang Anda pakai di model gambar seperti Midjourney, Flux, atau Gemini Image.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="2">
            <AccordionTrigger>Model AI apa yang digunakan?</AccordionTrigger>
            <AccordionContent>Kami menggunakan Google Gemini 2.5 Flash yang cepat dan hemat biaya.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="3">
            <AccordionTrigger>Apakah gratis?</AccordionTrigger>
            <AccordionContent>Ya, tersedia paket gratis untuk mencoba semua fitur inti.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="4">
            <AccordionTrigger>Bahasa apa yang didukung?</AccordionTrigger>
            <AccordionContent>Antarmuka penuh Bahasa Indonesia. Prompt gambar dihasilkan dalam Bahasa Inggris agar optimal di semua model.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Mulai buat prompt gambar Anda hari ini</h2>
          <p className="mt-4 opacity-90">Gratis untuk memulai. Tanpa kartu kredit.</p>
          <Link to="/auth" className="inline-block mt-8">
            <Button size="lg" variant="secondary">
              Mulai Sekarang <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 mt-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} AI Prompt Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Check className="h-3 w-3" /> Dibuat dengan Lovable Cloud
          </div>
        </div>
      </footer>
    </div>
  );
}
