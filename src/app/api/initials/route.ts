import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  deviceId: z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/),
  initials: z.string().regex(/^[A-Z]{3}$/),
});

/** Arcade initials: the guest identity primitive from design.md. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid initials." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("players")
    .update({ display_name: parsed.data.initials, updated_at: new Date().toISOString() })
    .eq("device_id", parsed.data.deviceId);
  if (error) return NextResponse.json({ error: "Could not save initials." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
