import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { isFreeMode } from "@/lib/runtime";
import { upsertProfile } from "@/lib/local-store";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.parse(body);

    if (isFreeMode) {
      // For free mode, auto-register locally
      const mockUserId = crypto.randomUUID();
      await upsertProfile({
        id: mockUserId,
        email: parsed.email,
        name: parsed.email.split("@")[0] || "Local User",
        gender: "male",
        height: 170,
        weight: 65,
        chest: 36,
        waist: 32,
        hip: 38,
        preferred_size: "M",
        skin_tone: "wheatish",
        undertone: "warm",
        occasion: "casual"
      });
      return NextResponse.json({ ok: true, message: "Local mock user created successfully" });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    // Create user in Supabase auth system (pre-confirmed via admin API)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      // Fallback: If admin API fails or isn't allowed, try standard signUp
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email: parsed.email,
        password: parsed.password
      });

      if (signUpError || !signUpData.user) {
        return NextResponse.json({ error: signUpError?.message || authError?.message || "User creation failed" }, { status: 400 });
      }

      // Check if user already has a profile, otherwise insert one
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", parsed.email)
        .single();

      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          id: signUpData.user.id,
          email: parsed.email
        });
      }

      return NextResponse.json({ ok: true, message: "Verification email sent" });
    }

    // Insert user into profiles table
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email: parsed.email
    });

    if (profileError) {
      // If profile insertion fails (e.g. key conflict), check if it already exists
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", parsed.email)
        .single();

      if (!existing) {
        return NextResponse.json({ error: "Could not create profile: " + profileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, message: "User registered and profile created successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
