alter table public.edit_samples add column if not exists src_before text not null default '';
update public.edit_samples set src_before = '/placeholders/before.svg', src = '/placeholders/after.svg';