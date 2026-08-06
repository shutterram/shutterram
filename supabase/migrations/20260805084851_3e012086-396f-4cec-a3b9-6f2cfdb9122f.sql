REVOKE SELECT (email) ON public.testimonials FROM anon;
REVOKE SELECT (email) ON public.testimonials FROM authenticated;
GRANT SELECT (id,name,role,occasion,quote,rating,images,status,sort_order) ON public.testimonials TO anon;
GRANT SELECT (id,name,role,occasion,quote,rating,images,status,sort_order) ON public.testimonials TO authenticated;