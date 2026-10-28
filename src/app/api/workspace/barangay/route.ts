import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_BARANGAY_COOKIE, getWorkspaceBarangays } from "@/lib/auth/active-barangay";
import { currentAccount } from "@/lib/auth/session";

/** Remembers which barangay a super admin (or multi-barangay member) is viewing. */
export async function POST(request: NextRequest) {
  const account = await currentAccount();
  if (!account || account.mode !== "supabase") return new NextResponse(null, { status: 404 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Send the request as JSON." }, { status: 415 });
  let id: unknown;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: "Choose a barangay." }, { status: 400 });
  }
  const { options } = await getWorkspaceBarangays(account);
  if (typeof id !== "string" || !options.some((item) => item.id === id))
    return NextResponse.json({ error: "You cannot open that barangay." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_BARANGAY_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
