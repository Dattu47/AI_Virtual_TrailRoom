"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { LoadingCard } from "@/components/ui/loading-card";
import { ScoreMeter } from "@/components/ui/score-meter";
import { Profile, WardrobeItem } from "@/types";

interface AnalysisResult {
  fit_score: number;
  color_score: number;
  occasion_score: number;
  style_score: number;
  overall_verdict: "great_match" | "decent" | "skip_it";
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
  suitability_summary?: string;
}

// Three distinct try-on modes
type SelectionMode = "top" | "bottom" | "dual";

const CATEGORY_TYPES: Record<string, "top" | "bottom" | "full"> = {
  shirt: "top", "t-shirt": "top", kurta: "top", jacket: "top", blazer: "top", sweater: "top",
  pant: "bottom", jeans: "bottom", shorts: "bottom", skirt: "bottom", leggings: "bottom",
  dress: "full", saree: "full", suit: "full", "co-ord set": "full",
};

function getCategoryType(category: string): "top" | "bottom" | "full" {
  return CATEGORY_TYPES[category.toLowerCase()] || "top";
}

const MODE_CONFIG = {
  top: {
    label: "👕 Top Only",
    desc: "Try on a shirt, kurta, jacket, or any top garment",
    color: "blue",
    ringClass: "ring-blue-400 border-blue-400 bg-blue-500 text-white",
    inactiveClass: "border-black/10 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40 hover:border-blue-300",
  },
  bottom: {
    label: "👖 Bottom Only",
    desc: "Try on pants, jeans, shorts, skirts or leggings",
    color: "purple",
    ringClass: "ring-purple-400 border-purple-400 bg-purple-500 text-white",
    inactiveClass: "border-black/10 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40 hover:border-purple-300",
  },
  dual: {
    label: "🧍 Top + Bottom",
    desc: "Try a complete outfit — top and bottom together",
    color: "accent",
    ringClass: "ring-accent border-accent bg-accent text-white",
    inactiveClass: "border-black/10 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40 hover:border-accent/50",
  },
};

export default function ComparePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  const [mode, setMode] = useState<SelectionMode>("top");

  // Top-only / dual top selection
  const [selectedTop, setSelectedTop] = useState<WardrobeItem | null>(null);
  // Bottom-only / dual bottom selection
  const [selectedBottom, setSelectedBottom] = useState<WardrobeItem | null>(null);

  const [resultImage, setResultImage] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => { if (data?.email) setProfile(data); })
      .catch(() => {});
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWardrobe(data); })
      .catch(() => {});
  }, []);

  const tops = wardrobe.filter((i) => {
    const t = getCategoryType(i.category);
    return t === "top" || t === "full";
  });
  const bottoms = wardrobe.filter((i) => getCategoryType(i.category) === "bottom");

  function resetResults() {
    setResultImage("");
    setAnalysis(null);
  }

  function switchMode(newMode: SelectionMode) {
    setMode(newMode);
    resetResults();
    // Don't reset selections — user may want to keep their picks when switching modes
  }

  // Derive the active garment item for single-garment display
  const activeItem = mode === "top" ? selectedTop : mode === "bottom" ? selectedBottom : null;

  // Is the user ready to run try-on?
  const isReadyToTryOn =
    profile?.body_photo_url &&
    (mode === "top"
      ? !!selectedTop
      : mode === "bottom"
      ? !!selectedBottom
      : !!(selectedTop || selectedBottom));

  async function runTryOn() {
    if (mode === "top" && !selectedTop) {
      return toast.error("Please select a top garment from your wardrobe");
    }
    if (mode === "bottom" && !selectedBottom) {
      return toast.error("Please select a bottom garment from your wardrobe");
    }
    if (mode === "dual" && !selectedTop && !selectedBottom) {
      return toast.error("Please select at least one garment (top or bottom)");
    }
    if (!profile?.body_photo_url) {
      return toast.error("Please complete onboarding and upload your body photo first");
    }

    setLoading(true);
    setAnalysis(null);
    setResultImage("");

    try {
      // Build the payload with explicit garmentType so the API can route correctly
      let garmentType: "upper" | "lower" | "dual";
      if (mode === "top") garmentType = "upper";
      else if (mode === "bottom") garmentType = "lower";
      else garmentType = "dual";

      setLoadingStep("Analyzing your body and outfit...");

      const payload = {
        userImageUrl: profile.body_photo_url,
        garmentType,
        // Primary garment (top-only or whichever is selected in dual)
        topItem: selectedTop
          ? { image_url: selectedTop.image_url, category: selectedTop.category, color: selectedTop.color }
          : null,
        bottomItem: selectedBottom
          ? { image_url: selectedBottom.image_url, category: selectedBottom.category, color: selectedBottom.color }
          : null,
        // Legacy fields for backwards-compat with Agent prompts
        productImageUrl: selectedTop?.image_url || selectedBottom?.image_url || "",
        category: selectedTop?.category || selectedBottom?.category || "",
        color: selectedTop?.color || selectedBottom?.color || "",
        profile,
        wardrobeItems: wardrobe,
        email: profile.email,
        productLink: "",
        selectionMode: mode,
      };

      setLoadingStep(
        mode === "dual"
          ? "Generating try-on image (top first, then bottom)..."
          : mode === "bottom"
          ? "Generating try-on image for bottom garment..."
          : "Generating try-on image..."
      );

      const tryRes = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const tryJson = await tryRes.json();

      if (tryJson.fallback && tryJson.message) {
        toast.info(tryJson.message, { duration: 5000 });
      }

      const primaryUrl =
        selectedTop?.image_url || selectedBottom?.image_url || "";
      const finalTryOn = tryJson.imageUrl || primaryUrl;
      setResultImage(finalTryOn);
      setLoadingStep("Running AI styling analysis...");

      if (tryJson.analysis) {
        setAnalysis(tryJson.analysis as AnalysisResult);
        toast.success("Virtual try-on complete! Check your AI stylist feedback. 🎉");
      } else {
        toast.error("Style analysis failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during try-on. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  const getMatchingWardrobeItems = (suggestions: string[]) => {
    if (!suggestions?.length) return [];
    const currentIds = new Set(
      [selectedTop?.id, selectedBottom?.id].filter(Boolean)
    );
    return wardrobe.filter((item) => {
      if (currentIds.has(item.id)) return false;
      const cat = item.category.toLowerCase();
      const col = item.color.toLowerCase();
      return suggestions.some((s) => {
        const sl = s.toLowerCase();
        return sl.includes(cat) || cat.includes(sl) || sl.includes(col) || col.includes(sl);
      });
    });
  };

  const matchingItems = analysis ? getMatchingWardrobeItems(analysis.pair_with) : [];

  const verdictConfig = {
    great_match: { label: "🌟 Great Match!", cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    decent: { label: "👍 Decent Choice", cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    skip_it: { label: "❌ Skip This Outfit", cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  return (
    <section className="space-y-8 py-6">
      {/* Page Header */}
      <div className="border-b border-black/5 pb-5 dark:border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Try-On Studio</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Choose a mode, pick garments from your wardrobe, and get a photorealistic AI try-on with styling advice.
            </p>
          </div>
          <Link
            href="/wardrobe"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 transition"
          >
            👔 Manage Wardrobe
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ─── Left Panel: Selection ─── */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 space-y-5">
            <h2 className="text-lg font-bold">1. Choose Mode</h2>

            {/* 3-Mode Selector */}
            <div className="grid grid-cols-1 gap-2">
              {(["top", "bottom", "dual"] as SelectionMode[]).map((m) => {
                const cfg = MODE_CONFIG[m];
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                      isActive
                        ? cfg.ringClass + " ring-2 shadow-md"
                        : cfg.inactiveClass
                    }`}
                  >
                    <span className="text-xl">{cfg.label.split(" ")[0]}</span>
                    <div>
                      <p className={`text-sm font-bold ${isActive ? "text-white" : ""}`}>
                        {cfg.label.split(" ").slice(1).join(" ")}
                      </p>
                      <p className={`text-[10px] leading-tight mt-0.5 ${isActive ? "text-white/80" : "text-neutral-400"}`}>
                        {cfg.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Garment Picker ── */}
            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <h2 className="text-base font-bold mb-3">2. Select Garment{mode === "dual" ? "s" : ""}</h2>

              {wardrobe.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6 text-center space-y-3">
                  <p className="text-sm text-neutral-500">Your wardrobe is empty.</p>
                  <Link
                    href="/wardrobe"
                    className="inline-block rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90"
                  >
                    Add Costumes First
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* TOP picker — show in "top" mode and "dual" mode */}
                  {(mode === "top" || mode === "dual") && (
                    <div>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                        👕 {mode === "dual" ? "Top (optional)" : "Select Top"}
                      </p>
                      {tops.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic">No tops in wardrobe yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {tops.map((item) => {
                            const isSelected = selectedTop?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { setSelectedTop(isSelected ? null : item); resetResults(); }}
                                className={`relative flex flex-col rounded-xl border p-1.5 text-left transition ${
                                  isSelected
                                    ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400"
                                    : "border-black/5 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40 hover:border-blue-300"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.image_url} alt={item.category} className="h-20 w-full rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800" />
                                <p className="mt-1 text-[10px] font-semibold capitalize truncate">{item.color} {item.category}</p>
                                {isSelected && (
                                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] text-white font-bold">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTTOM picker — show in "bottom" mode and "dual" mode */}
                  {(mode === "bottom" || mode === "dual") && (
                    <div>
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                        👖 {mode === "dual" ? "Bottom (optional)" : "Select Bottom"}
                      </p>
                      {bottoms.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-neutral-400 italic">No bottoms in wardrobe yet.</p>
                          <Link
                            href="/wardrobe"
                            className="inline-block text-xs font-semibold text-purple-500 underline"
                          >
                            Add pants/jeans to wardrobe →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {bottoms.map((item) => {
                            const isSelected = selectedBottom?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { setSelectedBottom(isSelected ? null : item); resetResults(); }}
                                className={`relative flex flex-col rounded-xl border p-1.5 text-left transition ${
                                  isSelected
                                    ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 ring-2 ring-purple-400"
                                    : "border-black/5 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40 hover:border-purple-300"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.image_url} alt={item.category} className="h-20 w-full rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800" />
                                <p className="mt-1 text-[10px] font-semibold capitalize truncate">{item.color} {item.category}</p>
                                {isSelected && (
                                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] text-white font-bold">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual mode selection summary */}
                  {mode === "dual" && (selectedTop || selectedBottom) && (
                    <div className="rounded-xl bg-accent/5 border border-accent/15 p-3 space-y-1">
                      <p className="text-[11px] font-bold text-accent uppercase tracking-wider">Selected outfit:</p>
                      {selectedTop && <p className="text-xs">👕 {selectedTop.color} {selectedTop.category}</p>}
                      {selectedBottom && <p className="text-xs">👖 {selectedBottom.color} {selectedBottom.category}</p>}
                      {selectedTop && selectedBottom && (
                        <p className="text-[10px] text-neutral-400 mt-1">
                          ✓ Two-pass try-on: top applied first, then bottom layered on result
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body photo warning / Run button */}
            <div className="border-t border-black/5 pt-4 dark:border-white/5">
              {!profile?.body_photo_url ? (
                <div className="rounded-xl bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 space-y-2">
                  <p>⚠️ Upload your full-body photo in Onboarding to use Try-On.</p>
                  <Link href="/onboarding" className="inline-block font-bold underline">
                    Go to Profile Setup →
                  </Link>
                </div>
              ) : (
                <button
                  onClick={runTryOn}
                  disabled={!isReadyToTryOn || loading}
                  className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 shadow-accent/20 transition"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {loadingStep || "Processing..."}
                    </span>
                  ) : (
                    `🪞 Run Virtual Try-On${mode === "dual" ? " (Top + Bottom)" : ""}`
                  )}
                </button>
              )}
            </div>

            {/* Mode hint card */}
            {mode === "bottom" && (
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-3 text-xs text-purple-700 dark:text-purple-300">
                <strong>💡 Bottom mode:</strong> Uses CatVTON model which specialises in lower-body garments. Works best with clear, front-facing garment photos on a light background.
              </div>
            )}
            {mode === "dual" && (
              <div className="rounded-xl bg-accent/5 border border-accent/15 p-3 text-xs text-neutral-600 dark:text-neutral-300">
                <strong>💡 Dual mode:</strong> Applies top first, then layers the bottom onto that result — two AI passes for a complete outfit try-on.
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Result & Analysis ─── */}
        <div className="lg:col-span-2 space-y-6">
          {loading && <LoadingCard />}

          {/* Before / After Images */}
          {resultImage && !loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Before */}
              <div className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60">
                <span className="inline-block rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold dark:bg-neutral-800 mb-3">
                  📸 Your Photo
                </span>
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile?.body_photo_url} alt="Your body photo" className="h-full w-full object-cover" />
                </div>
              </div>

              {/* After */}
              <div className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60">
                <span className="inline-block rounded-full bg-accent/20 text-accent px-3 py-1 text-xs font-semibold mb-3">
                  ✨ Try-On Result
                </span>
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultImage} alt="Virtual try-on result" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          )}

          {/* Selected items preview (before running) */}
          {!resultImage && !loading && (
            <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 p-8 text-center space-y-4">
              {mode === "top" && selectedTop ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-neutral-500">Selected top garment:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedTop.image_url} alt={selectedTop.category} className="h-36 rounded-xl object-contain shadow" />
                  <p className="font-semibold capitalize">{selectedTop.color} {selectedTop.category}</p>
                  <p className="text-xs text-neutral-400">Click &quot;Run Virtual Try-On&quot; to see how it looks on you</p>
                </div>
              ) : mode === "bottom" && selectedBottom ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-purple-500">Selected bottom garment:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedBottom.image_url} alt={selectedBottom.category} className="h-36 rounded-xl object-contain shadow" />
                  <p className="font-semibold capitalize">{selectedBottom.color} {selectedBottom.category}</p>
                  <p className="text-xs text-neutral-400">Click &quot;Run Virtual Try-On&quot; to see how it looks on you</p>
                </div>
              ) : mode === "dual" && (selectedTop || selectedBottom) ? (
                <div className="flex items-center justify-center gap-6">
                  {selectedTop && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs font-semibold text-blue-500">Top</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedTop.image_url} alt={selectedTop.category} className="h-28 rounded-xl object-contain shadow" />
                    </div>
                  )}
                  {selectedTop && selectedBottom && <span className="text-2xl">+</span>}
                  {selectedBottom && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs font-semibold text-purple-500">Bottom</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedBottom.image_url} alt={selectedBottom.category} className="h-28 rounded-xl object-contain shadow" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-5xl">🪞</span>
                  <p className="text-sm text-neutral-500">
                    {mode === "top"
                      ? "Select a top garment on the left, then run the virtual try-on."
                      : mode === "bottom"
                      ? "Select a bottom garment (pants/jeans/shorts) on the left, then run the virtual try-on."
                      : "Select top and/or bottom garments on the left, then run the virtual try-on."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Styling Evaluation Dashboard */}
          {analysis && !loading && (
            <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 space-y-6">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-black/5 pb-4 dark:border-white/5 gap-2">
                <div>
                  <h3 className="text-xl font-bold">AI Stylist Report</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Generated by StyleSense AI — costume suitability analysis</p>
                </div>
                <span
                  className={`inline-block rounded-full px-4 py-1.5 text-sm font-extrabold tracking-wide capitalize ${
                    verdictConfig[analysis.overall_verdict]?.cls
                  }`}
                >
                  {verdictConfig[analysis.overall_verdict]?.label}
                </span>
              </div>

              {/* Suitability Summary */}
              {analysis.suitability_summary && (
                <div className="rounded-2xl bg-accent/5 border border-accent/15 p-4">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
                    <span className="font-bold text-accent">Suitability: </span>
                    {analysis.suitability_summary}
                  </p>
                </div>
              )}

              {/* Score Meters */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: "Fit Rating", score: analysis.fit_score },
                  { label: "Color Rating", score: analysis.color_score },
                  { label: "Style Rating", score: analysis.style_score || 75 },
                  { label: "Occasion Fit", score: analysis.occasion_score },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/40 p-4 border border-black/5 dark:bg-neutral-800/40 dark:border-white/5 text-center"
                  >
                    <span className="text-xs font-semibold text-neutral-500 block mb-2">{item.label}</span>
                    <ScoreMeter label="" score={item.score} />
                  </div>
                ))}
              </div>

              {/* Detailed Feedback */}
              <div className="space-y-4">
                <h4 className="text-md font-bold tracking-wide border-l-4 border-accent pl-3">
                  Stylist Feedback
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Fit Compatibility", value: analysis.fit_feedback },
                    { label: "Color Compatibility", value: analysis.color_feedback },
                    { label: "Occasion Suitability", value: analysis.occasion_feedback },
                    { label: "Personal Style Match", value: analysis.style_feedback || "Matches your style profile." },
                    {
                      label: `Body Goal (${profile?.body_goal?.replace(/_/g, " ") || "Not set"})`,
                      value: analysis.body_goal_feedback,
                    },
                    { label: "Local Climate Tip", value: analysis.local_tip },
                  ].map(
                    (item) =>
                      item.value && (
                        <div key={item.label} className="space-y-1">
                          <strong className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                            {item.label}:
                          </strong>
                          <p className="text-sm leading-relaxed">{item.value}</p>
                        </div>
                      )
                  )}
                </div>
              </div>

              {/* Improvement Tips */}
              {analysis.improvement_tips?.length > 0 && (
                <div className="rounded-2xl border border-black/5 bg-white/40 p-4 dark:border-white/5 dark:bg-neutral-800/40">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                    💡 Improvement Tips
                  </h4>
                  <ul className="space-y-2">
                    {analysis.improvement_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Color Suggestions */}
              {analysis.recommended_colors?.length > 0 && (
                <div className="rounded-2xl border border-black/5 bg-white/40 p-4 dark:border-white/5 dark:bg-neutral-800/40">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                    🎨 Color Compatibility &amp; Suggestions
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <span className="text-xs font-bold text-green-600 block mb-1.5">✅ Recommended:</span>
                      <div className="flex flex-wrap gap-1">
                        {analysis.recommended_colors.map((c, i) => (
                          <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 dark:bg-green-950/20 dark:text-green-400">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    {analysis.neutral_colors?.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-neutral-500 block mb-1.5">⚪ Neutrals:</span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.neutral_colors.map((c, i) => (
                            <span key={i} className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded dark:bg-neutral-800 dark:text-neutral-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.colors_to_avoid?.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-red-500 block mb-1.5">❌ Avoid:</span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.colors_to_avoid.map((c, i) => (
                            <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 dark:bg-red-950/20 dark:text-red-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Smart Wardrobe Pairing */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                  🔗 Pair With Your Wardrobe
                </h4>
                {matchingItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 p-4 text-center text-xs text-neutral-500 dark:border-white/10 space-y-2">
                    <p>No wardrobe matches found for suggestions.</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      <span className="text-xs font-semibold">Try styling with: </span>
                      {analysis.pair_with?.map((p, i) => (
                        <span key={i} className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-500">Complete your look with these items from your wardrobe:</p>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {matchingItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/40 p-2 dark:border-white/5 dark:bg-neutral-800/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image_url} alt={item.category} className="h-12 w-12 rounded object-contain bg-neutral-50 dark:bg-neutral-800" />
                          <div>
                            <p className="text-xs font-semibold capitalize">{item.color} {item.category}</p>
                            <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded dark:bg-green-950/20 dark:text-green-400">
                              ✓ Good match!
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Learning Insights */}
              {analysis.learning_insights && (
                <div className="rounded-2xl bg-accent/5 p-4 border border-accent/10">
                  <h4 className="text-xs font-extrabold text-accent uppercase tracking-wider mb-1.5">
                    💡 Stylist Principle
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 italic leading-relaxed">
                    &quot;{analysis.learning_insights}&quot;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
