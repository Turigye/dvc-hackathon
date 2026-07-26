import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Who is signed in, if anyone. Lets the feed stop prompting a logged-in player. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ signedIn: false });
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return NextResponse.json({ signedIn: false });
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = (meta.full_name ?? meta.name ?? meta.user_name ?? user.email?.split("@")[0] ?? "PLAYER") as string;
  return NextResponse.json({ signedIn: true, name: String(raw).slice(0, 14).toUpperCase() });
}
