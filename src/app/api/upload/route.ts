import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isFreeMode } from "@/lib/runtime";
import { requireSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = String(form.get("folder") || "misc");
    if (!file) return NextResponse.json({ error: "File missing" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storagePath = `${session.user.id || "user"}/${folder}/${Date.now()}-${file.name}`;

    if (isFreeMode) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const relativeDir = path.join("uploads", folder);
      const outputDir = path.join(process.cwd(), "public", relativeDir);
      await fs.mkdir(outputDir, { recursive: true });
      const fileName = `${Date.now()}-${safeName}`;
      await fs.writeFile(path.join(outputDir, fileName), buffer);
      return NextResponse.json({ url: `/${relativeDir}/${fileName}`, path: `${relativeDir}/${fileName}` });
    }
    if (!supabaseAdmin) throw new Error("Supabase is not configured");

    const { error } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET!)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (error) throw error;

    const { data } = supabaseAdmin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET!)
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: data.publicUrl, path: storagePath });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
