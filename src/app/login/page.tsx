import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginView } from "@/features/auth/login-view";
import { DEMO_COOKIE_NAME, demoLoginHint, verifyDemoSession } from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const mode = dataProvider();
  if (mode === "demo") {
    const cookieStore = await cookies();
    if (verifyDemoSession(cookieStore.get(DEMO_COOKIE_NAME)?.value)) redirect("/dashboard");
  } else if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return (
    <LoginView
      mode={mode}
      demoHint={mode === "demo" ? demoLoginHint() : null}
      supabaseConfigured={
        !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      }
    />
  );
}
