import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PORTAL_HEADER, slugFromHost } from "@/lib/branding";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  if (process.env.DATA_PROVIDER !== "supabase") return NextResponse.next();
  // Only the middleware may say which barangay subdomain a request came from.
  request.headers.delete(PORTAL_HEADER);
  const slug = slugFromHost(request.headers.get("host"), process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "");
  if (slug) request.headers.set(PORTAL_HEADER, slug);
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
