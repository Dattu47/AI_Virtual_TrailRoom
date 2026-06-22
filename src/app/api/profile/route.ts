import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfileByEmail, upsertProfile } from "@/lib/local-store";
import { isFreeMode } from "@/lib/runtime";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/session";
import { Profile } from "@/types";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string(),
  age: z.number().int().positive().optional(),
  height: z.number().int().positive(),
  weight: z.number().int().positive(),
  chest: z.number().int().positive(),
  waist: z.number().int().positive(),
  hip: z.number().int().positive(),
  preferred_size: z.string(),
  skin_tone: z.string(),
  undertone: z.string(),
  body_goal: z.string().optional(),
  occasion: z.string(),
  favorite_colors: z.array(z.string()).optional(),
  preferred_styles: z.array(z.string()).optional(),
  body_photo_url: z.string().optional()
});

export async function GET() {
  try {
    const session = await requireSession();
    const email = session.user.email as string;
    if (isFreeMode) {
      const data = await getProfileByEmail(email);
      return NextResponse.json(data ?? {});
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("relation")) {
        return NextResponse.json({});
      }
      throw error;
    }

    if (data) {
      if (typeof data.favorite_colors === "string") {
        try {
          data.favorite_colors = JSON.parse(data.favorite_colors);
        } catch {
          data.favorite_colors = data.favorite_colors ? data.favorite_colors.split(",") : [];
        }
      }
      if (typeof data.preferred_styles === "string") {
        try {
          data.preferred_styles = JSON.parse(data.preferred_styles);
        } catch {
          data.preferred_styles = data.preferred_styles ? data.preferred_styles.split(",") : [];
        }
      }
    }

    return NextResponse.json(data ?? {});
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const email = session.user.email as string;
    const parsed = profileSchema.parse(await req.json());

    const payload = {
      ...parsed,
      email,
      id: crypto.randomUUID()
    };

    if (isFreeMode) {
      const existing = await getProfileByEmail(email);
      if (existing?.id) payload.id = String(existing.id);
      await upsertProfile(payload as unknown as Profile);
      return NextResponse.json({ ok: true });
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existing?.id) payload.id = existing.id;

    const dbPayload = {
      ...payload,
      favorite_colors: payload.favorite_colors ? JSON.stringify(payload.favorite_colors) : null,
      preferred_styles: payload.preferred_styles ? JSON.stringify(payload.preferred_styles) : null
    };

    const { error } = await supabaseAdmin.from("profiles").upsert(dbPayload);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
