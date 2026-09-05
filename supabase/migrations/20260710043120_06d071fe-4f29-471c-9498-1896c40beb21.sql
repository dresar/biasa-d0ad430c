
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (separate table, security definer)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- POLICIES for profiles & user_roles
-- =========================================================
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Generic updated_at trigger fn
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- GEMINI API KEYS (admin only)
-- =========================================================
CREATE TABLE public.gemini_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  notes TEXT,
  usage_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gemini_api_keys TO authenticated;
GRANT ALL ON public.gemini_api_keys TO service_role;
ALTER TABLE public.gemini_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gemini_keys_admin_all" ON public.gemini_api_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER gemini_keys_updated BEFORE UPDATE ON public.gemini_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- DROPDOWN CATEGORIES & ITEMS
-- =========================================================
CREATE TABLE public.dropdown_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dropdown_categories TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.dropdown_categories TO authenticated;
GRANT ALL ON public.dropdown_categories TO service_role;
ALTER TABLE public.dropdown_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dropdown_cat_read_all" ON public.dropdown_categories FOR SELECT USING (true);
CREATE POLICY "dropdown_cat_admin_write" ON public.dropdown_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER dc_updated BEFORE UPDATE ON public.dropdown_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dropdown_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.dropdown_categories(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dropdown_items(category_id);
GRANT SELECT ON public.dropdown_items TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.dropdown_items TO authenticated;
GRANT ALL ON public.dropdown_items TO service_role;
ALTER TABLE public.dropdown_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dropdown_item_read_all" ON public.dropdown_items FOR SELECT USING (true);
CREATE POLICY "dropdown_item_admin_write" ON public.dropdown_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER di_updated BEFORE UPDATE ON public.dropdown_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PROMPT TEMPLATES
-- =========================================================
CREATE TABLE public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prompt_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.prompt_templates TO authenticated;
GRANT ALL ON public.prompt_templates TO service_role;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_read_auth" ON public.prompt_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "pt_admin_write" ON public.prompt_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pt_updated BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- HOOK TEMPLATES
-- =========================================================
CREATE TABLE public.hook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  category TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hook_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hook_templates TO authenticated;
GRANT ALL ON public.hook_templates TO service_role;
ALTER TABLE public.hook_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ht_read_auth" ON public.hook_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "ht_admin_write" ON public.hook_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ht_updated BEFORE UPDATE ON public.hook_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CONTENT IDEA CATEGORIES
-- =========================================================
CREATE TABLE public.content_idea_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_idea_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_idea_categories TO authenticated;
GRANT ALL ON public.content_idea_categories TO service_role;
ALTER TABLE public.content_idea_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cic_read_auth" ON public.content_idea_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cic_admin_write" ON public.content_idea_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cic_updated BEFORE UPDATE ON public.content_idea_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- GENERATED PROMPTS (history)
-- =========================================================
CREATE TABLE public.generated_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  content_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt TEXT NOT NULL,
  viral_score JSONB,
  reference_image_path TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.generated_prompts(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_prompts TO authenticated;
GRANT ALL ON public.generated_prompts TO service_role;
ALTER TABLE public.generated_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gp_owner_all" ON public.generated_prompts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SETTINGS (single row, admin managed)
-- =========================================================
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'AI Prompt Studio',
  logo_url TEXT,
  favicon_url TEXT,
  footer_text TEXT,
  copyright TEXT DEFAULT '© AI Prompt Studio',
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#0f172a',
  daily_prompt_limit INT NOT NULL DEFAULT 100,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
GRANT SELECT ON public.settings TO authenticated, anon;
GRANT UPDATE, INSERT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================================================
-- LOGS
-- =========================================================
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  latency_ms INT,
  api_key_id UUID REFERENCES public.gemini_api_keys(id) ON DELETE SET NULL,
  is_success BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.logs(created_at DESC);
GRANT SELECT ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_admin_read" ON public.logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SEED: DROPDOWN CATEGORIES + ITEMS
-- =========================================================
WITH cats AS (
  INSERT INTO public.dropdown_categories (slug, label, description, sort_order) VALUES
    ('content_type', 'Tipe Konten', 'Jenis konten visual yang akan dibuat', 1),
    ('style', 'Gaya', 'Gaya visual keseluruhan', 2),
    ('layout', 'Tata Letak', 'Susunan elemen dalam komposisi', 3),
    ('mood', 'Suasana', 'Emosi & nuansa yang ingin ditampilkan', 4),
    ('color_palette', 'Palet Warna', 'Kombinasi warna dominan', 5),
    ('typography', 'Tipografi', 'Gaya huruf', 6),
    ('audience', 'Target Audiens', 'Siapa target penonton', 7),
    ('complexity', 'Kompleksitas', 'Tingkat detail visual', 8),
    ('aspect_ratio', 'Rasio Aspek', 'Perbandingan lebar dan tinggi', 9),
    ('language', 'Bahasa', 'Bahasa teks dalam gambar', 10),
    ('output_style', 'Gaya Output', 'Format output yang diinginkan', 11),
    ('illustration_style', 'Gaya Ilustrasi', 'Gaya ilustrasi', 12),
    ('rendering_style', 'Gaya Rendering', 'Teknik rendering', 13),
    ('lighting', 'Pencahayaan', 'Tipe pencahayaan', 14),
    ('composition', 'Komposisi', 'Susunan komposisi', 15),
    ('brand_tone', 'Nada Merek', 'Nada komunikasi merek', 16),
    ('icon_style', 'Gaya Ikon', 'Gaya ikon dan simbol', 17),
    ('negative_prompt', 'Preset Negatif', 'Yang dihindari dalam gambar', 18),
    ('visual_density', 'Densitas Visual', 'Kepadatan elemen visual', 19)
  RETURNING id, slug
)
INSERT INTO public.dropdown_items (category_id, value, label, sort_order)
SELECT c.id, x.value, x.label, x.sort_order
FROM cats c JOIN (VALUES
  ('content_type','poster','Poster',1),
  ('content_type','infographic','Infografis',2),
  ('content_type','carousel','Karusel',3),
  ('content_type','instagram_post','Postingan Instagram',4),
  ('content_type','youtube_thumbnail','Thumbnail YouTube',5),
  ('content_type','logo','Logo',6),
  ('content_type','banner','Banner',7),
  ('content_type','flyer','Selebaran',8),
  ('content_type','presentation','Presentasi',9),
  ('content_type','social_media','Media Sosial',10),
  ('content_type','advertisement','Iklan',11),
  ('content_type','brochure','Brosur',12),
  ('content_type','book_cover','Sampul Buku',13),
  ('content_type','packaging','Kemasan',14),
  ('content_type','business_card','Kartu Nama',15),

  ('style','minimalist','Minimalis',1),
  ('style','modern','Modern',2),
  ('style','vintage','Vintage',3),
  ('style','flat','Flat',4),
  ('style','3d','3D',5),
  ('style','realistic','Realistis',6),
  ('style','cartoon','Kartun',7),
  ('style','luxury','Mewah',8),
  ('style','editorial','Editorial',9),

  ('layout','grid','Grid',1),
  ('layout','asymmetric','Asimetris',2),
  ('layout','centered','Terpusat',3),
  ('layout','split','Terbagi',4),
  ('layout','stacked','Bertumpuk',5),
  ('layout','magazine','Majalah',6),

  ('mood','professional','Profesional',1),
  ('mood','playful','Ceria',2),
  ('mood','serious','Serius',3),
  ('mood','elegant','Elegan',4),
  ('mood','energetic','Enerjik',5),
  ('mood','calm','Tenang',6),
  ('mood','mysterious','Misterius',7),

  ('color_palette','monochrome','Monokrom',1),
  ('color_palette','pastel','Pastel',2),
  ('color_palette','vibrant','Cerah',3),
  ('color_palette','earth_tone','Warna Bumi',4),
  ('color_palette','neon','Neon',5),
  ('color_palette','dark','Gelap',6),
  ('color_palette','warm','Hangat',7),
  ('color_palette','cool','Sejuk',8),

  ('typography','serif','Serif',1),
  ('typography','sans_serif','Sans Serif',2),
  ('typography','handwritten','Tulisan Tangan',3),
  ('typography','bold_display','Display Tebal',4),
  ('typography','modern_geometric','Geometris Modern',5),

  ('audience','general','Umum',1),
  ('audience','teens','Remaja',2),
  ('audience','professional','Profesional',3),
  ('audience','children','Anak-anak',4),
  ('audience','gen_z','Gen Z',5),
  ('audience','millennials','Milenial',6),
  ('audience','entrepreneurs','Pengusaha',7),

  ('complexity','simple','Sederhana',1),
  ('complexity','moderate','Sedang',2),
  ('complexity','detailed','Detail',3),
  ('complexity','very_detailed','Sangat Detail',4),

  ('aspect_ratio','1_1','1:1 (Persegi)',1),
  ('aspect_ratio','9_16','9:16 (Portrait)',2),
  ('aspect_ratio','16_9','16:9 (Landscape)',3),
  ('aspect_ratio','4_5','4:5 (Instagram)',4),
  ('aspect_ratio','3_4','3:4',5),
  ('aspect_ratio','a4','A4',6),

  ('language','id','Bahasa Indonesia',1),
  ('language','en','Bahasa Inggris',2),
  ('language','none','Tanpa Teks',3),

  ('output_style','clean','Bersih',1),
  ('output_style','artistic','Artistik',2),
  ('output_style','photographic','Fotografis',3),
  ('output_style','graphic','Grafis',4),

  ('illustration_style','vector','Vektor',1),
  ('illustration_style','line_art','Line Art',2),
  ('illustration_style','watercolor','Cat Air',3),
  ('illustration_style','isometric','Isometrik',4),
  ('illustration_style','doodle','Doodle',5),
  ('illustration_style','anime','Anime',6),

  ('rendering_style','photorealistic','Fotorealistik',1),
  ('rendering_style','cinematic','Sinematik',2),
  ('rendering_style','matte','Matte',3),
  ('rendering_style','clay','Clay Render',4),
  ('rendering_style','pixel_art','Pixel Art',5),

  ('lighting','soft','Lembut',1),
  ('lighting','dramatic','Dramatis',2),
  ('lighting','studio','Studio',3),
  ('lighting','natural','Alami',4),
  ('lighting','golden_hour','Golden Hour',5),
  ('lighting','neon_glow','Neon Glow',6),

  ('composition','rule_of_thirds','Rule of Thirds',1),
  ('composition','symmetrical','Simetris',2),
  ('composition','close_up','Close Up',3),
  ('composition','wide_shot','Wide Shot',4),
  ('composition','top_down','Top Down',5),

  ('brand_tone','friendly','Bersahabat',1),
  ('brand_tone','authoritative','Berwibawa',2),
  ('brand_tone','playful','Ceria',3),
  ('brand_tone','luxurious','Mewah',4),
  ('brand_tone','innovative','Inovatif',5),

  ('icon_style','outline','Outline',1),
  ('icon_style','filled','Filled',2),
  ('icon_style','duotone','Duotone',3),
  ('icon_style','3d_icon','3D',4),

  ('negative_prompt','no_text','Tanpa teks acak',1),
  ('negative_prompt','no_watermark','Tanpa watermark',2),
  ('negative_prompt','no_lowres','Tanpa resolusi rendah',3),
  ('negative_prompt','no_extra_limbs','Tanpa anatomi aneh',4),
  ('negative_prompt','no_blurry','Tanpa blur',5),

  ('visual_density','sparse','Renggang',1),
  ('visual_density','balanced','Seimbang',2),
  ('visual_density','dense','Padat',3)
) AS x(cat_slug, value, label, sort_order) ON c.slug = x.cat_slug;

-- =========================================================
-- SEED: HOOK TEMPLATES
-- =========================================================
INSERT INTO public.hook_templates (pattern, category, sort_order) VALUES
  ('99% orang tidak tahu tentang {topik}', 'curiosity', 1),
  ('Kebenaran tentang {topik} yang jarang dibahas', 'curiosity', 2),
  ('Kamu selama ini salah melakukan {topik}', 'shock', 3),
  ('Berhenti melakukan {topik} sekarang juga', 'shock', 4),
  ('Trik kecil {topik} yang mengubah segalanya', 'value', 5),
  ('Tidak ada yang membicarakan hal ini soal {topik}', 'curiosity', 6),
  ('Sebelum kamu membeli {topik}, baca ini dulu', 'warning', 7),
  ('Fitur tersembunyi {topik} yang wajib kamu coba', 'value', 8),
  ('Kebanyakan orang mengabaikan {topik}', 'social_proof', 9),
  ('Rahasia {topik} yang tidak diajarkan di sekolah', 'authority', 10),
  ('Ini alasan {topik} kamu belum berhasil', 'insight', 11),
  ('Hentikan 5 kebiasaan buruk saat {topik}', 'listicle', 12);

-- =========================================================
-- SEED: PROMPT TEMPLATES
-- =========================================================
INSERT INTO public.prompt_templates (slug, name, description, template, sort_order) VALUES
  ('system_prompt', 'System Prompt Utama', 'Instruksi sistem utama untuk Gemini',
   'Kamu adalah AI Prompt Engineer profesional untuk pembuatan gambar. Tugasmu adalah membuat prompt gambar yang sangat detail, sinematik, dan siap dipakai di ChatGPT Images, Gemini Image, Imagen, Flux, Midjourney, dan Stable Diffusion. Selalu balas dalam format JSON yang diminta. Tulis prompt dalam Bahasa Inggris (karena model gambar lebih memahaminya), tetapi rangkuman skor & saran tetap Bahasa Indonesia.', 1),
  ('poster', 'Template Poster', 'Template khusus poster', 'Buat prompt gambar untuk POSTER dengan komposisi kuat, headline mencolok, dan hierarki visual yang jelas.', 2),
  ('infographic', 'Template Infografis', '', 'Buat prompt untuk INFOGRAFIS yang informatif, ikon konsisten, dan ada alur baca.', 3),
  ('carousel', 'Template Karusel', '', 'Buat prompt untuk slide karusel media sosial, konsisten antar slide, hook di slide 1.', 4),
  ('thumbnail', 'Template Thumbnail', '', 'Buat prompt untuk THUMBNAIL YouTube yang punya kontras tinggi, wajah ekspresif, dan teks besar 3-5 kata.', 5),
  ('logo', 'Template Logo', '', 'Buat prompt untuk LOGO minimalis, memorable, scalable, dan bermakna.', 6),
  ('banner', 'Template Banner', '', 'Buat prompt untuk BANNER dengan rasio lebar, focal point kiri, teks headline di kanan.', 7),
  ('photo_enhancement', 'Template Peningkatan Foto', '', 'Buat prompt untuk meningkatkan kualitas foto: lighting, warna, ketajaman, latar belakang.', 8),
  ('negative_prompt', 'Template Negative Prompt', '', 'Kumpulan hal yang harus dihindari: watermark, artefak, anatomi aneh, teks kabur.', 9);

-- =========================================================
-- SEED: CONTENT IDEA CATEGORIES
-- =========================================================
INSERT INTO public.content_idea_categories (slug, label, description, sort_order) VALUES
  ('technology', 'Teknologi', 'Tren teknologi terbaru', 1),
  ('programming', 'Pemrograman', 'Coding & pengembangan', 2),
  ('cyber_security', 'Keamanan Siber', 'Cybersecurity & privasi', 3),
  ('artificial_intelligence', 'Kecerdasan Buatan', 'AI & machine learning', 4),
  ('android', 'Android', 'Tips & trik Android', 5),
  ('business', 'Bisnis', 'Bisnis & wirausaha', 6),
  ('education', 'Edukasi', 'Belajar & mengajar', 7),
  ('health', 'Kesehatan', 'Kesehatan & wellness', 8),
  ('lifestyle', 'Gaya Hidup', 'Gaya hidup harian', 9),
  ('marketing', 'Pemasaran', 'Marketing & branding', 10),
  ('design', 'Desain', 'Desain grafis & UI/UX', 11),
  ('photography', 'Fotografi', 'Fotografi & videografi', 12);
