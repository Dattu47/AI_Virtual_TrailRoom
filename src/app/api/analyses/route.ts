import { NextResponse } from "next/server";
import { addAnalysis, getProfileByEmail, listAnalyses } from "@/lib/local-store";
import { isFreeMode } from "@/lib/runtime";
import { requireSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user.email as string;
    if (isFreeMode) {
      const profile = await getProfileByEmail(email);
      if (!profile?.id) return NextResponse.json([]);
      const data = await listAnalyses(String(profile.id));
      return NextResponse.json(data);
    }
    if (!supabaseAdmin) return NextResponse.json([]);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!profile?.id) return NextResponse.json([]);

    const { data, error } = await supabaseAdmin
      .from("analyses")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json([]);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const email = session.user.email as string;
    const payload = await req.json();
    if (isFreeMode) {
      const profile = await getProfileByEmail(email);
      if (!profile?.id) throw new Error("Complete onboarding first");
      await addAnalysis({
        user_id: String(profile.id),
        ...payload
      });
      return NextResponse.json({ ok: true });
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    const { error } = await supabaseAdmin.from("analyses").insert({
      user_id: profile?.id,
      ...payload
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
