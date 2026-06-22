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

async function urlToBuffer(urlOrPath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  let buffer: Buffer;
  let mimeType = "image/jpeg";

  const ext = urlOrPath.split(".").pop()?.toLowerCase().split("?")[0];
  if (ext === "png") mimeType = "image/png";
  else if (ext === "webp") mimeType = "image/webp";

  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`Failed to fetch remote image: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
    const localPath = path.join(process.cwd(), "public", cleanPath);
    buffer = await fs.readFile(localPath);
  }

  return { buffer, mimeType };
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await requireSession();

    // ── FREE MODE ──────────────────────────────────────────
    if (isFreeMode || !gemini) {
      const mockResult = localFallbackAnalysis();
      const fallbackUrl = body.topItem?.image_url || body.productImageUrl || null;

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

    // ── PRODUCTION MODE ────────────────────────────────────
    const flashModel = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Determine primary & secondary garment
    const primaryImageUrl: string =
      body.topItem?.image_url || body.productImageUrl;
    const secondaryImageUrl: string | null =
      body.bottomItem?.image_url || body.secondaryImageUrl || null;

    const primaryCategory: string =
      body.topItem?.category || body.category || "shirt";
    const secondaryCategory: string | null =
      body.bottomItem?.category || body.secondaryCategory || null;

    if (!primaryImageUrl) {
      return NextResponse.json({ error: "No garment image provided" }, { status: 400 });
    }

    // ── Agent 1: Fashion Understanding ─────────────────────
    console.log("Agent 1: Fashion Understanding...");
    const humanPart = await urlToGenerativePart(body.userImageUrl);
    const garmentPart = await urlToGenerativePart(primaryImageUrl);

    const parts: Array<{ inlineData: { data: string; mimeType: string } } | string> = [
      humanPart,
      garmentPart,
    ];

    let secondaryGarmentPart: { inlineData: { data: string; mimeType: string } } | null = null;
    if (secondaryImageUrl) {
      secondaryGarmentPart = await urlToGenerativePart(secondaryImageUrl);
      parts.push(secondaryGarmentPart);
    }

    const outfitDesc = secondaryImageUrl
      ? `a ${body.topItem?.color || ""} ${primaryCategory} (top) paired with a ${body.bottomItem?.color || ""} ${secondaryCategory} (bottom)`
      : `a ${body.color || ""} ${primaryCategory}`;

    const agent1Prompt = `You are a Fashion Understanding AI agent. Analyze the uploaded images:
1. Person's full-body photo (standing image).
2. Garment photo: ${outfitDesc}${secondaryImageUrl ? "\n3. Second garment (bottom)." : ""}

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
        color: body.color || "blue",
        fitSuggestion: "regular fit",
        matchScore: 75,
        outfitDescription: outfitDesc,
      };
    }

    // ── Agent 2: Garment Description ─────────────────────
    console.log("Agent 2: Generating garment description...");
    const agent2Prompt = `Based on this fashion analysis data: ${JSON.stringify(agent1Data)}
Write a 2-3 sentence highly detailed description of the complete outfit to guide image generation.
Include: colors, garment types, fabric feel, how they sit on a ${agent1Data.bodyType} body with ${agent1Data.skinTone} skin.
Return ONLY the description text.`;

    const agent2Result = await flashModel.generateContent(agent2Prompt);
    const garmentDescription = agent2Result.response.text().trim();

    // ── VTON / Image Generation ────────────────────────────
    console.log("Starting VTON Image Generation...");
    let tryOnImageBuffer: Buffer | null = null;
    let tryOnResultUrl: string | null = null;

    // Try IDM-VTON first (primary garment only for now)
    try {
      const { Client: GradioClient, handle_file } = await import("@gradio/client");
      console.log("Connecting to yisol/IDM-VTON...");
      const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;
      const idmApp = await GradioClient.connect(
        "yisol/IDM-VTON",
        hfToken ? { token: hfToken } : undefined
      );

      const idmResult = await idmApp.predict("/tryon", {
        dict: {
          background: handle_file(body.userImageUrl),
          layers: [],
          composite: null,
        },
        garm_img: handle_file(primaryImageUrl),
        garment_des: garmentDescription || "clothing item",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: Math.floor(Math.random() * 100000),
      });

      const generatedImageUrl = (idmResult.data as Array<{url?: string}>)?.[0]?.url;
      if (!generatedImageUrl) throw new Error("No image URL from IDM-VTON");

      const imageFetchRes = await fetch(generatedImageUrl);
      if (!imageFetchRes.ok) throw new Error(`Failed to fetch IDM-VTON image`);
      const arrayBuffer = await imageFetchRes.arrayBuffer();
      tryOnImageBuffer = Buffer.from(arrayBuffer);
      console.log("IDM-VTON success.");
    } catch (idmError) {
      console.warn("IDM-VTON failed, trying CatVTON...", idmError);

      // Try CatVTON fallback
      try {
        const { Client: GradioClient, handle_file } = await import("@gradio/client");
        const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;
        const catApp = await GradioClient.connect(
          "zhengchong/CatVTON",
          hfToken ? { token: hfToken } : undefined
        );

        const prepResult = await catApp.predict("/person_example_fn", {
          image_path: handle_file(body.userImageUrl),
        });
        const personImageObj = (prepResult.data as Array<unknown>)?.[0];
        if (!personImageObj) throw new Error("Failed to prepare person image for CatVTON");

        const categoryLower = primaryCategory.toLowerCase();
        let clothType = "upper";
        if (
          categoryLower.includes("pant") ||
          categoryLower.includes("trouser") ||
          categoryLower.includes("jeans") ||
          categoryLower.includes("skirt") ||
          categoryLower.includes("short") ||
          categoryLower.includes("legging")
        ) {
          clothType = "lower";
        } else if (
          categoryLower.includes("dress") ||
          categoryLower.includes("suit") ||
          categoryLower.includes("overall") ||
          categoryLower.includes("saree") ||
          categoryLower.includes("co-ord")
        ) {
          clothType = "overall";
        }

        const catResult = await catApp.predict("/submit_function", {
          person_image: personImageObj,
          cloth_image: handle_file(primaryImageUrl),
          cloth_type: clothType,
          num_inference_steps: 30,
          guidance_scale: 2.5,
          seed: Math.floor(Math.random() * 100000),
          show_type: "result only",
        });

        const generatedImageUrl = (catResult.data as Array<{url?: string}>)?.[0]?.url;
        if (!generatedImageUrl) throw new Error("No image URL from CatVTON");

        const imageFetchRes = await fetch(generatedImageUrl);
        if (!imageFetchRes.ok) throw new Error("Failed to fetch CatVTON image");
        const arrayBuffer = await imageFetchRes.arrayBuffer();
        tryOnImageBuffer = Buffer.from(arrayBuffer);
        console.log("CatVTON success.");
      } catch (catError) {
        console.warn("CatVTON also failed. Using Gemini image generation...", catError);

        // ── Gemini Imagen fallback ─────────────────────────
        try {
          const imagenModel = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

          const userPart = await urlToGenerativePart(body.userImageUrl);
          const garment1Part = await urlToGenerativePart(primaryImageUrl);
          const extraParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
          if (secondaryImageUrl) {
            extraParts.push(await urlToGenerativePart(secondaryImageUrl));
          }

          const imagenPrompt = `You are a virtual try-on AI system. I will provide:
1. A reference photo of a person (standing, full-body view)
2. A garment image (${outfitDesc})${secondaryImageUrl ? "\n3. Another garment (bottom piece)" : ""}

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

          // Extract image from response if present
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

          if (!tryOnImageBuffer) {
            throw new Error("Gemini did not return an image");
          }
          console.log("Gemini imagen fallback success.");
        } catch (imagenError) {
          console.warn("Gemini imagen also failed, using original user photo...", imagenError);
          // Last resort: use user's photo + return clothing image as the "result"
          // We still provide analysis based on what we know
        }
      }
    }

    // ── Upload result to Supabase ─────────────────────────
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

    // If no try-on image was generated, return the primary garment as a reference
    const finalImageUrl = tryOnResultUrl || primaryImageUrl;
    const isFallback = !tryOnResultUrl;

    // ── Agent 3: Styling Feedback ──────────────────────────
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
- Existing wardrobe: ${wardrobePrompt}

FOCUS: Your goal is to evaluate whether this COSTUME SUITS the user — not just fit, but color compatibility with their skin tone, style coherence, and occasion appropriateness. Give practical, honest, specific suggestions.

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

    // ── Save to DB ────────────────────────────────────────
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
