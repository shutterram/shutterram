/**
 * Subdomain routing: admin.example.com, crm.example.com and auth.example.com
 * serve the same app but land on their section instead of the public site.
 */
export const SUBDOMAIN_SECTIONS: Record<string, string> = {
  admin: "/admin",
  crm: "/crm",
  auth: "/auth",
};

/** The section a hostname belongs to, or "" for the main site. */
export function sectionForHost(hostname: string): string {
  const label = hostname.split(".")[0]?.toLowerCase() ?? "";
  if (hostname.split(".").length < 3) return "";
  return SUBDOMAIN_SECTIONS[label] ?? "";
}

/**
 * Path a visitor should land on for the current host, or "" when the current
 * path is already fine.
 */
export function subdomainRedirect(hostname: string, pathname: string): string {
  const section = sectionForHost(hostname);
  if (!section) return "";
  if (pathname.startsWith("/api/")) return "";
  if (pathname === "/") return section;
  // Allow deep links that already belong to this section (or to auth flows).
  if (pathname.startsWith(section) || pathname.startsWith("/auth")) return "";
  if (pathname.startsWith("/reset-password")) return "";
  return section;
}

/** Hosts where subdomains cannot exist (preview, staging, local dev). */
function isNonSubdomainHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".lovable.app") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

/**
 * Reverse rule: on the apex domain, section paths (/admin, /crm, /auth)
 * bounce to their dedicated subdomain so the public site never serves them.
 * Returns a full URL, or "" when no redirect is needed.
 */
export function apexSectionRedirect(hostname: string, pathname: string): string {
  if (isNonSubdomainHost(hostname)) return "";
  if (sectionForHost(hostname)) return ""; // already on a subdomain
  const label = Object.keys(SUBDOMAIN_SECTIONS).find(
    (key) => pathname === `/${key}` || pathname.startsWith(`/${key}/`),
  );
  if (!label) return "";
  return `https://${label}.${hostname}${pathname}`;
}
