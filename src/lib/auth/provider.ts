export function dataProvider(): "demo" | "supabase" {
  const value = process.env.DATA_PROVIDER || "demo";
  if (value !== "demo" && value !== "supabase") {
    throw new Error("DATA_PROVIDER must be either demo or supabase.");
  }
  return value;
}
