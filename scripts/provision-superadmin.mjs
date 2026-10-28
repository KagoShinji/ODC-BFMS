import { once } from "node:events";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const email = "superadmin@odc.com";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");

// Read one JSON line from stdin so credentials are never put in source files,
// command arguments, or a persistent environment variable.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
const input = createInterface({ input: process.stdin, terminal: false });
const [line] = await once(input, "line");
input.close();
if (process.stdin.isTTY) process.stdin.setRawMode(false);
const {
  secretKey,
  password,
  inspectOnly = false,
  authOnly = false,
  assignUserId,
  verifyOnly = false,
} = JSON.parse(line);

if (verifyOnly) {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey || typeof password !== "string") {
    throw new Error("The publishable key and account password are required for verification.");
  }
  const userClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: login, error: loginError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (loginError || !login.user) {
    throw new Error(loginError?.message ?? "Super admin sign-in failed.");
  }
  const { data: role, error: roleError } = await userClient
    .from("system_admins")
    .select("user_id")
    .eq("user_id", login.user.id)
    .single();
  const { data: isAdmin, error: checkError } = await userClient.rpc("is_system_admin");
  await userClient.auth.signOut();
  if (roleError || !role || checkError || isAdmin !== true) {
    throw new Error("The account signed in, but its super admin role check failed.");
  }
  process.stdout.write(`Verified sign-in and super admin role for ${email}.\n`);
  process.exit(0);
}

if (typeof secretKey !== "string" || !secretKey.startsWith("sb_secret_")) {
  throw new Error("A Supabase secret key is required for admin provisioning.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (!authOnly) {
  const { error: schemaError } = await supabase.from("system_admins").select("user_id").limit(1);
  if (schemaError) {
    throw new Error(
      `System administrator schema check failed: ${schemaError.code ?? "unknown"} ${schemaError.message}`,
    );
  }
  if (inspectOnly) {
    process.stdout.write("System administrator schema is ready.\n");
    process.exit(0);
  }
}

if (assignUserId) {
  const { data: existing, error: userError } = await supabase.auth.admin.getUserById(assignUserId);
  if (userError || existing.user?.email?.toLowerCase() !== email) {
    throw new Error("The supplied Auth user ID does not belong to the requested account.");
  }
  const { error: roleError } = await supabase
    .from("system_admins")
    .upsert({ user_id: assignUserId }, { onConflict: "user_id" });
  if (roleError) throw new Error(`Super admin role assignment failed: ${roleError.message}`);
  process.stdout.write(`Assigned the super admin role to ${email}.\n`);
  process.exit(0);
}

if (typeof password !== "string" || password.length < 8) {
  throw new Error("An account password of at least 8 characters is required.");
}

const { data, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError || !data.user) {
  throw new Error(createError?.message ?? "Auth user creation failed.");
}

if (authOnly) {
  process.stdout.write(
    `Created Auth user ${email} with ID ${data.user.id}; role assignment is pending.\n`,
  );
  process.exit(0);
}

const { error: roleError } = await supabase.from("system_admins").insert({ user_id: data.user.id });
if (roleError) {
  const { error: cleanupError } = await supabase.auth.admin.deleteUser(data.user.id);
  throw new Error(
    cleanupError
      ? `Role assignment failed and the Auth user ${data.user.id} needs manual cleanup.`
      : "Role assignment failed; the new Auth user was removed.",
  );
}

process.stdout.write(`Created super admin account for ${email}.\n`);
