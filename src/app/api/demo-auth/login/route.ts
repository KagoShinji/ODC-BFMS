import { NextResponse, type NextRequest } from "next/server";
import {
  createDemoSession,
  DEMO_COOKIE_NAME,
  DEMO_SESSION_MAX_AGE,
  validDemoCredentials,
} from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";
import { isAccessLevel } from "@/lib/auth/roles";

export async function POST(request: NextRequest) {
  if (dataProvider() !== "demo") return new NextResponse(null, { status: 404 });
  let email: unknown;
  let password: unknown;
  let level: unknown;
  try {
    ({ email, password, level = "superadmin" } = await request.json());
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 256 ||
    !isAccessLevel(level) ||
    !validDemoCredentials(email, password)
  ) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE_NAME, createDemoSession(level), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE,
  });
  return response;
}
