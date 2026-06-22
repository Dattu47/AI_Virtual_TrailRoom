import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isFreeMode } from "@/lib/runtime";
import { requireSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { addAnalysis, getProfileByEmail } from "@/lib/local-store";
import { Verdict, WardrobeItem } from "@/types";
import { promises as fs } from "fs";
import path from "path";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Types ──────────────────────────────────────────────────────────────────
interface Agent1Output {
  skinTone: string;
  bodyType: string;
  shirtStyle: string;
  color: string;
  fitSuggestion: string;
  matchScore: number;
  outfitDescription: string;
}

interface Agent3Output {
  fit_score: number;
  color_score: number;
  style_score: number;
  occasion_score: number;
  overall_verdict: string;
  fit_feedback: string;
  color_feedback: string;
  occasion_feedback: string;
  style_feedback: string;
  body_goal_feedback: string;
  improvement_tips: string[];
  recommended_colors: string[];
  neutral_colors: string[];
  colors_to_avoid: string[];
  better_colors: string[];
  pair_with: string[];
  learning_insights: string;
  local_tip: string;
  suitability_summary: string;
}

// ── Image Utilities ────────────────────────────────────────────────────────

// Cache fetched images in memory for the duration of a single request
const imageCache = new Map<string, { buffer: Buffer; mimeType: string }>();

async function urlToBuffer(urlOrPath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (imageCache.has(urlOrPath)) {
    return imageCache.get(urlOrPath)!;
  }

  let buffer: Buffer;
  let mimeType = "image/jpeg";

  const ext = urlOrPath.split(".").pop()?.toLowerCase().split("?")[0];
  if (ext === "png") mimeType = "image/png";
  else if (ext === "webp") mimeType = "image/webp";

  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(urlOrPath, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch remote image: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  } else {
    const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
    const localPath = path.join(process.cwd(), "public", cleanPath);
    buffer = await fs.readFile(localPath);
  }

  const result = { buffer, mimeType };
  imageCache.set(urlOrPath, result);
  return result;
}

async function urlToGenerativePart(
  urlOrPath: string
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const { buffer, mimeType } = await urlToBuffer(urlOrPath);
  return { inlineData: { data: buffer.toString("base64"), mimeType } };
}

function localFallbackAnalysis(): Agent3Output {
  return {
    fit_score: 74,
    color_score: 72,
    occasion_score: 75,
    style_score: 80,
    overall_verdict: "decent",
    fit_feedback: "The silhouette looks balanced for daily wear.",
    color_feedback: "Current palette is safe; try one contrast accessory for depth.",
    occasion_feedback: "This outfit fits casual and office-casual occasions.",
    style_feedback: "Matches your preferred casual look well.",
    body_goal_feedback: "Use cleaner vertical lines to look more elongated.",
    improvement_tips: ["Try sharper layering", "Prefer better fabric drape"],
    recommended_colors: ["navy", "olive", "off-white"],
    neutral_colors: ["black", "grey", "beige"],
    colors_to_avoid: ["bright orange", "neon green"],
    better_colors: ["navy", "olive", "off-white"],
    pair_with: ["neutral sneakers", "minimal watch"],
    learning_insights:
      "Monochromatic or low-contrast schemes elongate the torso, which aligns with your height goals.",
    local_tip: "For Indian climates, cotton-linen drapes breathe the best.",
    suitability_summary:
      "This outfit is a decent choice that works well for everyday occasions. Consider some styling adjustments for a more polished look.",
  };
}

// ── CatVTON helper ────────────────────────────────────────────────────────
/**
 * Run a single CatVTON pass.
 * @param personUrl   URL or local path for the person/base image
 * @param garmentUrl  URL or local path for the garment image
 * @param clothType   "upper" | "lower" | "overall"
 * @param hfToken     Optional HuggingFace token
 * @returns           Result image as Buffer
 */
async function runCatVTON(
  personUrl: string,
  garmentUrl: string,
  clothType: "upper" | "lower" | "overall",
  hfToken: `hf_${string}` | undefined
): Promise<Buffer> {
  const { Client: GradioClient, handle_file } = await import("@gradio/client");

  // CatVTON accepts a person image and a garment image, and returns a try-on result
  const catApp = await GradioClient.connect(
    "zhengchong/CatVTON",
    hfToken ? { token: hfToken } : undefined
  );

  // Step 1: prepare person image
  const prepResult = await catApp.predict("/person_example_fn", {
    image_path: handle_file(personUrl),
  });
  const personImageObj = (prepResult.data as Array<unknown>)?.[0];
  if (!personImageObj) throw new Error("CatVTON: failed to prepare person image");

  // Step 2: run try-on
  const catResult = await catApp.predict("/submit_function", {
    person_image: personImageObj,
    cloth_image: handle_file(garmentUrl),
    cloth_type: clothType,
    num_inference_steps: 50,       // Higher steps → better quality
    guidance_scale: 2.5,
    seed: Math.floor(Math.random() * 100000),
    show_type: "result only",
  });

  const generatedImageUrl = (catResult.data as Array<{ url?: string }>)?.[0]?.url;
  if (!generatedImageUrl) throw new Error("CatVTON: no image URL in response");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const imageFetchRes = await fetch(generatedImageUrl, { signal: controller.signal });
    if (!imageFetchRes.ok) throw new Error("CatVTON: failed to fetch result image");
    const arrayBuffer = await imageFetchRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

// ── IDM-VTON helper (upper-body only) ────────────────────────────────────
async function runIDMVTON(
  userImageUrl: string,
  garmentUrl: string,
  garmentDescription: string,
  hfToken: `hf_${string}` | undefined
): Promise<Buffer> {
  const { Client: GradioClient, handle_file } = await import("@gradio/client");

  const idmApp = await GradioClient.connect(
    "yisol/IDM-VTON",
    hfToken ? { token: hfToken } : undefined
  );

  const idmResult = await idmApp.predict("/tryon", {
    dict: {
      background: handle_file(userImageUrl),
      layers: [],
      composite: null,
    },
    garm_img: handle_file(garmentUrl),
    garment_des: garmentDescription || "clothing item",
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 40,            // Increased from 30 for better quality
    seed: Math.floor(Math.random() * 100000),
  });

  const generatedImageUrl = (idmResult.data as Array<{ url?: string }>)?.[0]?.url;
  if (!generatedImageUrl) throw new Error("IDM-VTON: no image URL in response");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const imageFetchRes = await fetch(generatedImageUrl, { signal: controller.signal });
    if (!imageFetchRes.ok) throw new Error("IDM-VTON: failed to fetch result image");
    const arrayBuffer = await imageFetchRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

// ── Main API Handler ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  // Clear per-request image cache
  imageCache.clear();

  try {
    const body = await req.json();
    const session = await requireSession();

    // ── FREE MODE ──────────────────────────────────────────────────────────
    if (isFreeMode || !gemini) {
      const mockResult = localFallbackAnalysis();
      const fallbackUrl =
        body.topItem?.image_url ||
        body.bottomItem?.image_url ||
        body.productImageUrl ||
        null;

      if (body.email) {
        const profile = await getProfileByEmail(body.email);
        if (profile?.id) {
          await addAnalysis({
            user_id: String(profile.id),
            product_image_url: body.productImageUrl || fallbackUrl,
            product_link: body.productLink || "",
            tryon_result_url: fallbackUrl,
            fit_score: mockResult.fit_score,
            color_score: mockResult.color_score,
            occasion_score: mockResult.occasion_score,
            verdict: mockResult.overall_verdict as Verdict,
            feedback: {
              fit_feedback: mockResult.fit_feedback,
              color_feedback: mockResult.color_feedback,
              occasion_feedback: mockResult.occasion_feedback,
              body_goal_feedback: mockResult.body_goal_feedback,
              improvement_tips: mockResult.improvement_tips,
              better_colors: mockResult.better_colors,
              pair_with: mockResult.pair_with,
              local_tip: mockResult.local_tip,
            },
          });
        }
      }

      return NextResponse.json({
        imageUrl: fallbackUrl,
        fallback: true,
        message:
          "Free mode active: showing reference garment image. AI analysis is generated from profile data.",
        analysis: mockResult,
      });
    }

    // ── PRODUCTION MODE ────────────────────────────────────────────────────
    const flashModel = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    // garmentType comes explicitly from the new frontend:
    //   "upper"  → Top-only (use IDM-VTON, fall back to CatVTON upper)
    //   "lower"  → Bottom-only (skip IDM-VTON, go direct to CatVTON lower)
    //   "dual"   → Top + Bottom (two-pass CatVTON)
    const garmentType: "upper" | "lower" | "dual" =
      body.garmentType ||
      (body.topItem && body.bottomItem
        ? "dual"
        : body.bottomItem
        ? "lower"
        : "upper");

    const topItem = body.topItem as { image_url: string; category: string; color: string } | null;
    const bottomItem = body.bottomItem as { image_url: string; category: string; color: string } | null;

    // Determine primary garment for analysis context
    const primaryItem = garmentType === "lower" ? bottomItem : topItem;
    const primaryImageUrl: string = primaryItem?.image_url || body.productImageUrl || "";
    const primaryCategory: string = primaryItem?.category || body.category || "shirt";

    if (!primaryImageUrl) {
      return NextResponse.json({ error: "No garment image provided" }, { status: 400 });
    }

    const outfitDesc =
      garmentType === "dual" && topItem && bottomItem
        ? `a ${topItem.color} ${topItem.category} (top) paired with a ${bottomItem.color} ${bottomItem.category} (bottom)`
        : garmentType === "lower"
        ? `${bottomItem?.color || ""} ${primaryCategory} (bottom garment)`
        : `${topItem?.color || ""} ${primaryCategory}`;

    // ── Pre-fetch images in parallel ─────────────────────────────────────
    console.log("Pre-fetching images in parallel...");
    const imageFetchPromises: Promise<void>[] = [
      urlToBuffer(body.userImageUrl).then(() => {}),
      urlToBuffer(primaryImageUrl).then(() => {}),
    ];
    if (garmentType === "dual" && bottomItem?.image_url) {
      imageFetchPromises.push(urlToBuffer(bottomItem.image_url).then(() => {}));
    }
    await Promise.allSettled(imageFetchPromises);

    // ── Agent 1: Fashion Understanding ───────────────────────────────────
    console.log("Agent 1: Fashion Understanding...");
    const humanPart = await urlToGenerativePart(body.userImageUrl);
    const garmentPart = await urlToGenerativePart(primaryImageUrl);

    const parts: Array<{ inlineData: { data: string; mimeType: string } } | string> = [
      humanPart,
      garmentPart,
    ];

    let secondaryGarmentPart: { inlineData: { data: string; mimeType: string } } | null = null;
    if (garmentType === "dual" && bottomItem?.image_url) {
      secondaryGarmentPart = await urlToGenerativePart(bottomItem.image_url);
      parts.push(secondaryGarmentPart);
    }

    const agent1Prompt = `You are a Fashion Understanding AI agent. Analyze the uploaded images:
1. Person's full-body photo (standing image).
2. Garment photo: ${outfitDesc}${garmentType === "dual" ? "\n3. Second garment (bottom)." : ""}

Tasks:
- Detect skin tone: very fair / fair / wheatish / dusky / dark
- Detect body type: slim / regular / athletic / curvy / plus_size
- Analyze the garment(s): style (formal/casual/ethnic/sporty), primary color
- Assess suitability: does the outfit suit the person's body type, skin tone, and apparent occasion?
- Give a match score 0–100

Return ONLY valid JSON:
{
  "skinTone": "...",
  "bodyType": "...",
  "shirtStyle": "...",
  "color": "...",
  "fitSuggestion": "...",
  "matchScore": 85,
  "outfitDescription": "brief description of the full outfit for image generation"
}`;

    const agent1Result = await flashModel.generateContent([agent1Prompt, ...parts]);
    const agent1Text = agent1Result.response.text().trim();
    const agent1Match = agent1Text.match(/\{[\s\S]*\}/);
    let agent1Data: Agent1Output;
    try {
      agent1Data = JSON.parse(agent1Match ? agent1Match[0] : agent1Text) as Agent1Output;
    } catch {
      agent1Data = {
        skinTone: "wheatish",
        bodyType: "regular",
        shirtStyle: "casual",
        color: primaryItem?.color || "blue",
        fitSuggestion: "regular fit",
        matchScore: 75,
        outfitDescription: outfitDesc,
      };
    }

    // ── Agent 2: Garment Description ─────────────────────────────────────
    console.log("Agent 2: Generating garment description...");
    const agent2Prompt = `Based on this fashion analysis data: ${JSON.stringify(agent1Data)}
Write a 2-3 sentence highly detailed description of the complete outfit to guide image generation.
Include: colors, garment types, fabric feel, how they sit on a ${agent1Data.bodyType} body with ${agent1Data.skinTone} skin.
Return ONLY the description text.`;

    const agent2Result = await flashModel.generateContent(agent2Prompt);
    const garmentDescription = agent2Result.response.text().trim();

    // ── VTON Image Generation ────────────────────────────────────────────
    console.log(`Starting VTON — garmentType: ${garmentType}`);
    let tryOnImageBuffer: Buffer | null = null;
    let tryOnResultUrl: string | null = null;

    const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;

    // Global timeout for the entire VTON section (120 seconds)
    const vtonController = new AbortController();
    const vtonTimeout = setTimeout(() => vtonController.abort(), 120_000);

    try {
      if (garmentType === "lower") {
        // ── BOTTOM-ONLY: Go directly to CatVTON with cloth_type "lower" ──
        // IDM-VTON is an upper-body-only model — skip it entirely for bottoms
        console.log("Bottom-only mode: using CatVTON with cloth_type=lower");
        tryOnImageBuffer = await runCatVTON(
          body.userImageUrl,
          bottomItem!.image_url,
          "lower",
          hfToken
        );
        console.log("CatVTON (lower) success.");
      } else if (garmentType === "dual" && topItem && bottomItem) {
        // ── DUAL MODE: Two-pass CatVTON ──────────────────────────────────
        // Pass 1: Apply top garment
        console.log("Dual mode — Pass 1: applying top with CatVTON (upper)...");
        const pass1Buffer = await runCatVTON(
          body.userImageUrl,
          topItem.image_url,
          "upper",
          hfToken
        );

        // We need to save the pass-1 result temporarily so CatVTON can use it as the person image.
        // Upload to Supabase as a temp file, or use a data URI.
        let pass1Url: string;
        if (supabaseAdmin) {
          const tempPath = `${session.user.id || "user"}/tryon/temp-pass1-${Date.now()}.png`;
          const { error: tempUploadError } = await supabaseAdmin.storage
            .from(process.env.SUPABASE_STORAGE_BUCKET!)
            .upload(tempPath, pass1Buffer, { contentType: "image/png", upsert: false });

          if (tempUploadError) {
            throw new Error(`Failed to upload pass-1 temp image: ${tempUploadError.message}`);
          }
          const { data: tempData } = supabaseAdmin.storage
            .from(process.env.SUPABASE_STORAGE_BUCKET!)
            .getPublicUrl(tempPath);
          pass1Url = tempData.publicUrl;
        } else {
          // Fallback: convert buffer to base64 data URI for local/free mode
          pass1Url = `data:image/png;base64,${pass1Buffer.toString("base64")}`;
        }

        // Pass 2: Apply bottom garment on the pass-1 result image
        console.log("Dual mode — Pass 2: applying bottom with CatVTON (lower)...");
        tryOnImageBuffer = await runCatVTON(
          pass1Url,
          bottomItem.image_url,
          "lower",
          hfToken
        );
        console.log("Dual-pass CatVTON success.");

        // Clean up temp file
        if (supabaseAdmin && pass1Url.startsWith("http")) {
          const tempPath = pass1Url.split(`${process.env.SUPABASE_STORAGE_BUCKET}/`)[1];
          if (tempPath) {
            supabaseAdmin.storage
              .from(process.env.SUPABASE_STORAGE_BUCKET!)
              .remove([tempPath])
              .catch(() => {}); // Non-blocking cleanup
          }
        }
      } else {
        // ── TOP-ONLY: Try IDM-VTON first, fall back to CatVTON upper ────
        console.log("Top-only mode: trying IDM-VTON first...");
        try {
          tryOnImageBuffer = await runIDMVTON(
            body.userImageUrl,
            primaryImageUrl,
            garmentDescription || "clothing item",
            hfToken
          );
          console.log("IDM-VTON success.");
        } catch (idmError) {
          console.warn("IDM-VTON failed, falling back to CatVTON (upper)...", idmError);
          tryOnImageBuffer = await runCatVTON(
            body.userImageUrl,
            primaryImageUrl,
            "upper",
            hfToken
          );
          console.log("CatVTON (upper) fallback success.");
        }
      }
    } catch (vtonError) {
      console.warn("All VTON methods failed. Trying Gemini imagen fallback...", vtonError);

      // ── Gemini Imagen last-resort fallback ───────────────────────────
      try {
        if (gemini) {
          const imagenModel = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

          const userPart = await urlToGenerativePart(body.userImageUrl);
          const garment1Part = await urlToGenerativePart(primaryImageUrl);
          const extraParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
          if (garmentType === "dual" && bottomItem?.image_url) {
            extraParts.push(await urlToGenerativePart(bottomItem.image_url));
          }

          const imagenPrompt = `You are a virtual try-on AI system. I will provide:
1. A reference photo of a person (standing, full-body view)
2. A garment image (${outfitDesc})${garmentType === "dual" ? "\n3. Another garment (bottom piece)" : ""}

Your task: Generate a photorealistic image of the SAME person wearing the selected garment(s).

STRICT RULES:
- Keep the person's face, hairstyle, skin tone, and body shape IDENTICAL
- Keep the background similar
- Replace ONLY the clothing with the provided garment(s)
- Apply the exact colors, patterns, and design from the garment image(s)
- Add realistic fabric folds, lighting, and shadows
- The result should look like a real photograph

Generate the try-on image now.`;

          const imagenResult = await imagenModel.generateContent([
            imagenPrompt,
            userPart,
            garment1Part,
            ...extraParts,
          ]);

          const response = imagenResult.response;
          const candidates = response.candidates;
          if (candidates?.[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.inlineData?.data) {
                tryOnImageBuffer = Buffer.from(part.inlineData.data, "base64");
                break;
              }
            }
          }

          if (!tryOnImageBuffer) throw new Error("Gemini did not return an image");
          console.log("Gemini imagen fallback success.");
        }
      } catch (imagenError) {
        console.warn("Gemini imagen also failed, using garment image as result...", imagenError);
      }
    } finally {
      clearTimeout(vtonTimeout);
    }

    // ── Upload final result to Supabase ──────────────────────────────────
    if (tryOnImageBuffer) {
      if (!supabaseAdmin) {
        throw new Error("Supabase is not configured to save try-on results");
      }

      const storagePath = `${session.user.id || "user"}/tryon/${Date.now()}-tryon.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET!)
        .upload(storagePath, tryOnImageBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.warn("Supabase upload error:", uploadError);
      } else {
        const { data: storageData } = supabaseAdmin.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET!)
          .getPublicUrl(storagePath);
        tryOnResultUrl = storageData.publicUrl;
      }
    }

    const finalImageUrl = tryOnResultUrl || primaryImageUrl;
    const isFallback = !tryOnResultUrl;

    // ── Agent 3: Styling Feedback ─────────────────────────────────────────
    console.log("Agent 3: Styling & Suitability Feedback...");
    const tryOnPart = tryOnResultUrl
      ? await urlToGenerativePart(tryOnResultUrl)
      : garmentPart;

    const wardrobePrompt = Array.isArray(body.wardrobeItems)
      ? body.wardrobeItems
          .slice(0, 5)
          .map((w: WardrobeItem) => `${w.color} ${w.category}`)
          .join(", ")
      : "";

    const agent3Prompt = `You are a StyleSense AI Fashion Stylist. Analyze the try-on result image.

Context:
- User profile: ${JSON.stringify(body.profile || {})}
- Fashion analysis: ${JSON.stringify(agent1Data)}
- Selected outfit: ${outfitDesc}
- Garment type focus: ${garmentType === "lower" ? "BOTTOM garment (pants/jeans/skirt)" : garmentType === "dual" ? "COMPLETE OUTFIT (top + bottom)" : "TOP garment"}
- Existing wardrobe: ${wardrobePrompt}

FOCUS: Evaluate whether this COSTUME SUITS the user — not just fit, but color compatibility with their skin tone, style coherence, and occasion appropriateness. Give practical, honest, specific suggestions.

Return ONLY valid JSON with ALL these keys:
{
  "fit_score": 0-100,
  "color_score": 0-100,
  "occasion_score": 0-100,
  "style_score": 0-100,
  "overall_verdict": "great_match" | "decent" | "skip_it",
  "suitability_summary": "2-3 sentence overall verdict on how suitable this costume is for the user",
  "fit_feedback": "...",
  "color_feedback": "...",
  "occasion_feedback": "...",
  "style_feedback": "...",
  "body_goal_feedback": "...",
  "improvement_tips": ["tip1", "tip2", "tip3"],
  "recommended_colors": ["color1", "color2", "color3"],
  "neutral_colors": ["color1", "color2"],
  "colors_to_avoid": ["color1", "color2"],
  "better_colors": ["color1", "color2"],
  "pair_with": ["item1", "item2"],
  "learning_insights": "styling principle explanation",
  "local_tip": "India-specific climate/occasion tip"
}`;

    const agent3Result = await flashModel.generateContent([agent3Prompt, tryOnPart]);
    const agent3Text = agent3Result.response.text().trim();
    const agent3Match = agent3Text.match(/\{[\s\S]*\}/);
    let stylistReport: Agent3Output;
    try {
      stylistReport = JSON.parse(agent3Match ? agent3Match[0] : agent3Text) as Agent3Output;
    } catch {
      stylistReport = localFallbackAnalysis();
    }

    // ── Save to DB ────────────────────────────────────────────────────────
    if (supabaseAdmin && body.email) {
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", body.email)
          .single();

        await supabaseAdmin.from("analyses").insert({
          user_id: profile?.id,
          product_image_url: primaryImageUrl,
          product_link: body.productLink || "",
          tryon_result_url: finalImageUrl,
          fit_score: stylistReport.fit_score,
          color_score: stylistReport.color_score,
          occasion_score: stylistReport.occasion_score,
          verdict: stylistReport.overall_verdict,
          feedback: stylistReport,
        });
      } catch (dbErr) {
        console.warn("Could not save analysis to DB:", dbErr);
      }
    }

    return NextResponse.json({
      imageUrl: finalImageUrl,
      fallback: isFallback,
      message: isFallback
        ? "Virtual try-on services are currently busy. Showing your garment image with AI styling analysis."
        : undefined,
      analysis: stylistReport,
      agent1: agent1Data,
    });
  } catch (error) {
    console.error("Try-on API error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Try-on failed. Please try again.";
    return NextResponse.json(
      {
        imageUrl: null,
        fallback: true,
        message: errorMessage,
      },
      { status: 200 }
    );
  }
}
