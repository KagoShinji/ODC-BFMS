import { NextResponse, type NextRequest } from "next/server";
import { LOGO_MAX_BYTES, logoFormat, validateBranding } from "@/lib/branding";
import {
  BRAND_BUCKET,
  getBarangayBranding,
  getSystemBranding,
  saveBranding,
} from "@/lib/branding-server";
import { createClient } from "@/lib/supabase/server";
import { authorizeBranding, fail } from "../authorize";

/** Uploads a PNG, JPEG or WebP logo to public storage and applies it to the scope right away. */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Choose a logo file to upload.", 400);
  }
  const auth = await authorizeBranding(form.get("scope") ?? undefined);
  if ("response" in auth) return auth.response;
  if (auth.account.mode === "demo")
    return fail(
      "Logo uploads are unavailable in the demo. Paste an https image link instead.",
      400,
    );
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("Choose a logo file to upload.", 400);
  if (file.size > LOGO_MAX_BYTES) return fail("The logo must be 1 MB or smaller.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = logoFormat(bytes);
  if (!format) return fail("Upload a PNG, JPEG, or WebP image.", 415);

  const supabase = await createClient();
  const path = `${auth.scope}/logo-${Date.now()}.${format.extension}`;
  const storage = supabase.storage.from(BRAND_BUCKET);
  const { error: uploadError } = await storage.upload(path, bytes, {
    contentType: format.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return fail("The logo could not be uploaded. Apply the latest migration.", 500);

  const current =
    auth.scope === "system"
      ? await getSystemBranding()
      : ((await getBarangayBranding(supabase, auth.scope)) ?? (await getSystemBranding()));
  const result = validateBranding({
    ...current,
    logoUrl: storage.getPublicUrl(path).data.publicUrl,
  });
  if (!result.ok || !(await saveBranding(supabase, auth.scope, result.value))) {
    await storage.remove([path]);
    return fail("The logo was uploaded but could not be applied.", 500);
  }
  return NextResponse.json({ branding: result.value });
}
