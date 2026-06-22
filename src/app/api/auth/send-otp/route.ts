import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { isFreeMode } from "@/lib/runtime";

const otpSchema = z.object({
  email: z.string().email("Invalid email address")
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = otpSchema.parse(body);

    if (isFreeMode) {
      return NextResponse.json({
        ok: true,
        message: "Free Mode: OTP sent successfully! (Use any 6-digit code to log in)"
      });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    // Call Supabase native OTP mechanism
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email: parsed.email,
      options: {
        shouldCreateUser: true // creates profile on successful verification
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "One-time password (OTP) sent to your email! Please check your inbox."
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
