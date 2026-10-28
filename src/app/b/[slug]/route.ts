import { NextResponse, type NextRequest } from "next/server";
import { isPortalSlug, portalAddress } from "@/lib/branding";
import { rootDomain } from "@/lib/portal";

/** Short sign-in link for a barangay: /b/<slug> opens its branded sign-in page. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPortalSlug(slug)) return NextResponse.redirect(new URL("/login", request.url));
  // With barangay subdomains configured, send people to the barangay's own address.
  if (rootDomain())
    return NextResponse.redirect(
      new URL("/login", portalAddress(slug, request.nextUrl.origin, rootDomain())),
    );
  const target = new URL("/login", request.url);
  target.searchParams.set("b", slug);
  return NextResponse.redirect(target);
}
