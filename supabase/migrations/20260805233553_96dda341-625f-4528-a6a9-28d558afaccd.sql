ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS cover text NOT NULL DEFAULT '';
ALTER TABLE public.type_tokens ADD COLUMN IF NOT EXISTS sample_text text NOT NULL DEFAULT '';

INSERT INTO public.type_tokens (role, label, group_label, hint, selector, sample_text, sort_order)
VALUES
  ('home_about_eyebrow','About — small label','Home page sections','The tiny uppercase label above the heading','#sec-about .eyebrow','About Me',100),
  ('home_about_heading','About — heading','Home page sections','','#sec-about h2','A quiet eye, fifteen years in.',101),
  ('home_about_body','About — paragraph','Home page sections','','#sec-about p:not(.eyebrow)','A one-person studio built on patience and available light.',102),

  ('home_featured_eyebrow','Featured Work — small label','Home page sections','','#sec-featured .eyebrow','Featured Work',110),
  ('home_featured_heading','Featured Work — heading','Home page sections','','#sec-featured h2','A handful of favourites.',111),
  ('home_featured_body','Featured Work — paragraph','Home page sections','','#sec-featured h2 ~ p','A rotating selection from recent commissions.',112),

  ('home_editing_eyebrow','Editing — small label','Home page sections','','#sec-editing .eyebrow','The Power of Editing',120),
  ('home_editing_heading','Editing — heading','Home page sections','','#sec-editing h2','Same frame. Two different photographs.',121),
  ('home_editing_body','Editing — paragraph','Home page sections','','#sec-editing h2 ~ p','Drag the handle across the image to reveal the unedited capture.',122),

  ('home_services_eyebrow','Services — small label','Home page sections','','#sec-services .eyebrow','Services',130),
  ('home_services_heading','Services — heading','Home page sections','','#sec-services h2','What I can photograph for you.',131),
  ('home_services_body','Services — paragraph','Home page sections','','#sec-services h2 ~ p','Every engagement is quoted individually.',132),

  ('home_experience_eyebrow','Experience — small label','Home page sections','','#sec-experience .eyebrow','The Experience',140),
  ('home_experience_heading','Experience — heading','Home page sections','','#sec-experience h2','How a shoot actually runs.',141),
  ('home_experience_body','Experience — paragraph','Home page sections','','#sec-experience h2 ~ p','From the first message to the final gallery.',142),

  ('home_testimonials_eyebrow','Testimonials — small label','Home page sections','','#sec-testimonials .eyebrow','Testimonials',150),
  ('home_testimonials_heading','Testimonials — heading','Home page sections','','#sec-testimonials h2','What people say afterwards.',151),
  ('home_testimonials_quote','Testimonials — quote text','Home page sections','The quote inside each review card','#sec-testimonials blockquote','“He caught the moments we never saw.”',152),

  ('home_connect_eyebrow','Connect — small label','Home page sections','','#sec-connect .eyebrow','Connect With Me',160),
  ('home_connect_heading','Connect — heading','Home page sections','','#sec-connect h2','Follow the work in progress.',161),
  ('home_connect_body','Connect — paragraph','Home page sections','','#sec-connect h2 ~ p','New frames and behind-the-scenes.',162),

  ('category_hero_eyebrow','Category page — small label','Category pages','','#category-hero .eyebrow','Previous Works',170),
  ('category_hero_title','Category page — title','Category pages','','#category-hero h1','Corporate Photography',171),
  ('category_hero_tagline','Category page — tagline','Category pages','','#category-hero p:not(.eyebrow)','Brand imagery with the composure of a boardroom.',172)
ON CONFLICT (role) DO NOTHING;