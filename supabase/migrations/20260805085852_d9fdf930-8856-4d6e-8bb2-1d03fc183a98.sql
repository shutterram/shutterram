CREATE TABLE public.theme_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL,
  group_label text NOT NULL DEFAULT 'General',
  hint text NOT NULL DEFAULT '',
  dark_value text NOT NULL DEFAULT '#000000',
  dark_opacity integer NOT NULL DEFAULT 100,
  light_value text NOT NULL DEFAULT '#ffffff',
  light_opacity integer NOT NULL DEFAULT 100,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_tokens TO authenticated;
GRANT ALL ON public.theme_tokens TO service_role;

ALTER TABLE public.theme_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.theme_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.theme_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_theme_tokens BEFORE UPDATE ON public.theme_tokens
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO public.theme_tokens (token,label,group_label,hint,dark_value,dark_opacity,light_value,light_opacity,sort_order) VALUES
('background','Page background','Surfaces','','#0a0a0a',100,'#fafafa',100,10),
('surface','Panel background','Surfaces','Cards, rails and quiet blocks','#131313',100,'#f0f0f0',100,20),
('surface-2','Panel background (deeper)','Surfaces','','#1c1c1c',100,'#e6e6e6',100,30),
('card','Card background','Surfaces','','#131313',100,'#fafafa',100,40),
('popover','Popup background','Surfaces','','#131313',100,'#fafafa',100,50),
('foreground','Body text','Text','Headings and main copy','#ebebeb',100,'#121212',100,60),
('card-foreground','Card text','Text','','#ebebeb',100,'#121212',100,70),
('popover-foreground','Popup text','Text','','#ebebeb',100,'#121212',100,80),
('muted-foreground','Muted text','Text','Eyebrows, captions, helper text','#97989a',100,'#515354',100,90),
('secondary-foreground','Secondary text','Text','','#ebebeb',100,'#121212',100,100),
('primary','Primary / button fill','Accents','Solid buttons and highlights','#e7e8e9',100,'#151617',100,110),
('primary-foreground','Primary button text','Accents','','#0d0d0d',100,'#f8f8f8',100,120),
('secondary','Secondary fill','Accents','','#202020',100,'#e8e8e8',100,130),
('accent','Accent','Accents','','#b2b8bf',100,'#373b40',100,140),
('accent-foreground','Accent text','Accents','','#0d0d0d',100,'#f8f8f8',100,150),
('muted','Muted fill','Accents','','#202020',100,'#e8e8e8',100,160),
('destructive','Error / delete','Accents','','#b54a46',100,'#b33736',100,170),
('destructive-foreground','Error text','Accents','','#f2f2f2',100,'#f8f8f8',100,180),
('hairline','Hairline rules','Lines & effects','Thin dividers — lower the intensity to soften','#ffffff',10,'#000000',12,190),
('border','Borders','Lines & effects','','#ffffff',12,'#000000',14,200),
('input','Form field lines','Lines & effects','','#ffffff',16,'#000000',18,210),
('ring','Focus ring','Lines & effects','','#96989b',100,'#535558',100,220),
('glow','Hover glow','Lines & effects','Soft light on hover — intensity controls strength','#ffffff',28,'#000000',22,230);