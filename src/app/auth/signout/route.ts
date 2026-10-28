import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (dataProvider() === "supabase") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(DEMO_COOKIE_NAME);
  return response;
}
