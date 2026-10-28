import { NextResponse, type NextRequest } from "next/server";
import { currentAccount } from "@/lib/auth/session";
import { canManageRole, canManageStaff, validateNewStaff } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** Live staff management only; demo staff stay in the browser. */
async function authorize(request: NextRequest) {
  const account = await currentAccount();
  if (!account || account.mode !== "supabase") return { response: fail("Not found.", 404) };
  if (!canManageStaff(account.level))
    return { response: fail("Only administrators can manage staff.", 403) };
  if (!request.headers.get("content-type")?.includes("application/json"))
    return { response: fail("Send the request as JSON.", 415) };
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") throw new Error();
    return { account, body: body as Record<string, unknown> };
  } catch {
    return { response: fail("The request could not be read.", 400) };
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const { account, body } = auth;
  const { barangayId, fullName, email, role, password } = body;
  if (typeof barangayId !== "string" || !uuid.test(barangayId))
    return fail("Choose a barangay.", 400);
  const inputError = validateNewStaff(body, account.level, { requirePassword: false });
  if (inputError) return fail(inputError, 400);

  // The database decides whether this account may grant the role in this barangay.
  const supabase = await createClient();
  const { data: allowed, error: checkError } = await supabase.rpc("can_manage_staff", {
    p_barangay_id: barangayId,
    p_role: role,
  });
  if (checkError) return fail("Staff management is not set up. Apply the latest migration.", 500);
  if (allowed !== true) return fail("You are not allowed to assign this role here.", 403);

  const admin = createAdminClient();
  if (!admin) return fail("Adding accounts needs SUPABASE_SECRET_KEY on the server.", 503);
  const normalizedEmail = (email as string).trim().toLowerCase();
  const { data: profile, error: lookupError } = await admin
    .from("staff_profiles")
    .select("user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (lookupError) return fail("Staff profiles could not be checked.", 500);

  let userId: string = profile?.user_id;
  let createdUserId: string | null = null;
  if (!userId) {
    const passwordError = validateNewStaff(body, account.level, { requirePassword: true });
    if (passwordError) return fail(passwordError, 400);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: password as string,
      email_confirm: true,
      user_metadata: { full_name: (fullName as string).trim() },
    });
    if (createError || !created.user)
      return fail(
        createError?.code === "email_exists"
          ? "This email already has a sign-in account without a staff profile. Ask a super admin to link it."
          : "The sign-in account could not be created.",
        409,
      );
    userId = createdUserId = created.user.id;
    const { error: profileError } = await admin.from("staff_profiles").insert({
      user_id: userId,
      full_name: (fullName as string).trim(),
      email: normalizedEmail,
      created_by: account.userId,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return fail("The staff profile could not be saved; no account was created.", 500);
    }
  }

  // Inserted with the signed-in user's session so row level security and the audit trigger apply.
  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({ user_id: userId, barangay_id: barangayId, role, active: true });
  if (membershipError) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return fail(
      membershipError.code === "23505"
        ? "This person already has that role here. Reactivate it from the list instead."
        : "The role could not be assigned.",
      membershipError.code === "23505" ? 409 : 403,
    );
  }
  return NextResponse.json({ userId }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const { account, body } = auth;
  const { barangayId, userId, role, active } = body;
  if (
    typeof barangayId !== "string" ||
    !uuid.test(barangayId) ||
    typeof userId !== "string" ||
    !uuid.test(userId) ||
    typeof active !== "boolean" ||
    typeof role !== "string"
  )
    return fail("The request is incomplete.", 400);
  if (!canManageRole(account.level, role))
    return fail("Only a super admin can change administrator access.", 403);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .update({ active })
    .match({ barangay_id: barangayId, user_id: userId, role })
    .select("user_id");
  if (error || !data.length) return fail("You are not allowed to change this access.", 403);
  return NextResponse.json({ ok: true });
}
