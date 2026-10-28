import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";
import { currentAccount } from "@/lib/auth/session";
import { portalAddress } from "@/lib/branding";
import { rootDomain } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let target = new URL("/login", request.url);
  if (dataProvider() === "supabase") {
    const supabase = await createClient();
    // Return barangay staff to their own branded sign-in page.
    const account = await currentAccount();
    if (account?.barangayId && account.level !== "superadmin") {
      const { data } = await supabase
        .from("barangays")
        .select("slug")
        .eq("id", account.barangayId)
        .maybeSingle();
      if (data?.slug) {
        if (rootDomain())
          target = new URL(
            "/login",
            portalAddress(data.slug, request.nextUrl.origin, rootDomain()),
          );
        else target.searchParams.set("b", data.slug);
      }
    }
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(target, 303);
  response.cookies.delete(DEMO_COOKIE_NAME);
  return response;
}
