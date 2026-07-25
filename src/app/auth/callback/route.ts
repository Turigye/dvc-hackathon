import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { mergeGuestIntoAuthenticatedPlayer } from "@/lib/score-persistence";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await supabase.auth.getUser();
    const device = (await cookies()).get("tip-tap-device")?.value;
    if (user && device) await mergeGuestIntoAuthenticatedPlayer(device, user.id);
  }
  return NextResponse.redirect(new URL("/?auth=complete", request.url));
}
