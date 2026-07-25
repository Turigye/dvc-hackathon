import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/?auth=unavailable", request.url));
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } });
  if (error || !data.url) return NextResponse.redirect(new URL("/?auth=error", request.url));
  const response = NextResponse.redirect(data.url);
  const device = new URL(request.url).searchParams.get("device");
  if (device) response.cookies.set("tip-tap-device", device, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
