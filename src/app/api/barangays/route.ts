import { NextResponse, type NextRequest } from "next/server";
import { currentAccount } from "@/lib/auth/session";
import { isPortalSlug, portalSlug } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readBody(request: NextRequest) {
  const account = await currentAccount();
  if (!account || account.mode !== "supabase")
    return { response: new NextResponse(null, { status: 404 }) };
  if (account.level !== "superadmin")
    return { response: fail("Only a super admin can onboard barangays.", 403) };
  if (!request.headers.get("content-type")?.includes("application/json"))
    return { response: fail("Send the request as JSON.", 415) };
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") throw new Error();
    return { body: body as Record<string, unknown> };
  } catch {
    return { response: fail("The request could not be read.", 400) };
  }
}

function cleanName(value: unknown) {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return name && name.length <= 120 ? name : null;
}

function cleanSlug(value: unknown) {
  if (value === undefined || value === "") return undefined;
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isPortalSlug(slug) ? slug : null;
}

const slugTaken = "That sign-in link is already used by another barangay.";
const badSlug = "Use lowercase letters, numbers, and single hyphens for the sign-in link.";

export async function POST(request: NextRequest) {
  const read = await readBody(request);
  if ("response" in read) return read.response;
  const name = cleanName(read.body.name);
  if (!name) return fail("Enter a barangay name.", 400);
  const requested = cleanSlug(read.body.slug);
  if (requested === null) return fail(badSlug, 400);
  const supabase = await createClient();
  const base = requested ?? portalSlug(name);
  // An explicit link must be free; a generated one gets a numeric suffix when taken.
  for (let attempt = 1; attempt <= (requested ? 1 : 20); attempt++) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const slug = `${base.slice(0, 60 - suffix.length).replace(/-+$/, "")}${suffix}`;
    const { data, error } = await supabase
      .from("barangays")
      .insert({ name, slug })
      .select("id, slug")
      .single();
    if (!error) return NextResponse.json(data, { status: 201 });
    if (error.code !== "23505")
      return fail("The barangay could not be created. Apply the latest migration.", 500);
  }
  return fail(slugTaken, 409);
}

export async function PATCH(request: NextRequest) {
  const read = await readBody(request);
  if ("response" in read) return read.response;
  const { id } = read.body;
  if (typeof id !== "string" || !uuid.test(id)) return fail("Choose a barangay.", 400);
  const changes: { name?: string; slug?: string } = {};
  if (read.body.name !== undefined) {
    const name = cleanName(read.body.name);
    if (!name) return fail("Enter a barangay name.", 400);
    changes.name = name;
  }
  if (read.body.slug !== undefined) {
    const slug = cleanSlug(read.body.slug);
    if (!slug) return fail(badSlug, 400);
    changes.slug = slug;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barangays")
    .update(changes)
    .eq("id", id)
    .select("id, slug");
  if (error?.code === "23505") return fail(slugTaken, 409);
  if (error || !data.length) return fail("The barangay could not be updated.", 500);
  return NextResponse.json(data[0]);
}
