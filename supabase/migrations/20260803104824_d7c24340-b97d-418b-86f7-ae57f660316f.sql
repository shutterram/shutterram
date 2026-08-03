-- 1) Remove the privileged one-time admin claim function (admin already assigned)
DROP FUNCTION IF EXISTS public.claim_admin();

-- 2) has_role no longer needs elevated privileges: user_roles has a
--    "read own roles" policy, and every call site checks auth.uid().
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 3) Hide settings.form_endpoint from anonymous readers (column-level grants)
REVOKE SELECT ON public.settings FROM anon;
GRANT SELECT (
  id, name, tagline, email, phone, location, about_short, about_long,
  budget_ranges, hour_options, updated_at
) ON public.settings TO anon;