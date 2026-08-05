INSERT INTO public.site_copy (key,label,group_label,value,sort_order) VALUES
('footer.blurb','Footer paragraph','Footer','A one-person studio photographing weddings, brands and people who would rather be remembered honestly than perfectly.',47),
('footer.note','Footer small note','Footer','Every frame edited by hand',48)
ON CONFLICT (key) DO NOTHING;