import { NextResponse } from "next/server";
import { addWardrobeItem, deleteWardrobeItem, getProfileByEmail, listWardrobeItems } from "@/lib/local-store";
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
      const data = await listWardrobeItems(String(profile.id));
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
      .from("wardrobe_items")
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
      await addWardrobeItem({
        user_id: String(profile.id),
        image_url: payload.image_url,
        category: payload.category,
        color: payload.color,
      });
      return NextResponse.json({ ok: true });
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    const { error } = await supabaseAdmin.from("wardrobe_items").insert({
      user_id: profile?.id,
      image_url: payload.image_url,
      category: payload.category,
      color: payload.color,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const email = session.user.email as string;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    if (isFreeMode) {
      const profile = await getProfileByEmail(email);
      if (!profile?.id) throw new Error("Profile not found");
      await deleteWardrobeItem(id, String(profile.id));
      return NextResponse.json({ ok: true });
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    const { error } = await supabaseAdmin
      .from("wardrobe_items")
      .delete()
      .eq("id", id)
      .eq("user_id", profile?.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
