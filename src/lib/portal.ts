import { headers } from "next/headers";
import { isPortalSlug, PORTAL_HEADER } from "@/lib/branding";

/** The barangay slug of the subdomain this request came in on, if any. */
export async function subdomainSlug() {
  const slug = (await headers()).get(PORTAL_HEADER);
  return isPortalSlug(slug) ? slug : null;
}

export function rootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() ?? "";
}
