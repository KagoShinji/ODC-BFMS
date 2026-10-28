import { NextResponse, type NextRequest } from "next/server";
import { defaultBranding, validateBranding, type Branding } from "@/lib/branding";
import {
  BRANDING_COOKIE_MAX_AGE,
  BRANDING_COOKIE_NAME,
  clearBarangayBranding,
  encodeBrandingCookie,
  saveBranding,
} from "@/lib/branding-server";
import { createClient } from "@/lib/supabase/server";
import { authorizeBranding, fail } from "./authorize";

function demoResponse(branding: Branding) {
  const response = NextResponse.json({ branding });
  response.cookies.set(BRANDING_COOKIE_NAME, encodeBrandingCookie(branding), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BRANDING_COOKIE_MAX_AGE,
  });
  return response;
}

export async function PUT(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail("Send the settings as JSON.", 415);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("The settings could not be read.", 400);
  }
  const auth = await authorizeBranding(body?.scope);
  if ("response" in auth) return auth.response;
  const result = validateBranding(body);
  if (!result.ok) return fail(result.error, 400);
  if (auth.account.mode === "demo") return demoResponse(result.value);
  const saved = await saveBranding(await createClient(), auth.scope, result.value);
  if (!saved)
    return fail("White-label settings could not be saved. Apply the latest migration.", 500);
  return NextResponse.json({ branding: result.value });
}

/** Restores the default system branding, or returns a barangay to the system branding. */
export async function DELETE(request: NextRequest) {
  const auth = await authorizeBranding(request.nextUrl.searchParams.get("scope") ?? undefined);
  if ("response" in auth) return auth.response;
  if (auth.account.mode === "demo") return demoResponse(defaultBranding);
  const supabase = await createClient();
  const saved =
    auth.scope === "system"
      ? await saveBranding(supabase, "system", defaultBranding)
      : await clearBarangayBranding(supabase, auth.scope);
  if (!saved) return fail("White-label settings could not be reset.", 500);
  return NextResponse.json({ ok: true });
}
