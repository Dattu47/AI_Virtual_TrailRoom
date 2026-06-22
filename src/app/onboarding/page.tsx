"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const tones = ["fair", "wheatish", "dusky", "dark"];
const undertones = ["warm", "cool", "neutral"];
const occasions = ["casual", "office", "college", "wedding", "date", "interview", "party", "festival"];

const bodyGoals = [
  { id: "look_taller", label: "Look Taller 📏", desc: "Elongate silhouette" },
  { id: "look_slimmer", label: "Look Slimmer 👗", desc: "Create vertical flow" },
  { id: "look_broader", label: "Look Broader 👕", desc: "Build shoulder width" },
  { id: "hide_belly", label: "Hide Belly Area 🪵", desc: "Use soft structures" },
  { id: "highlight_shoulders", label: "Highlight Shoulders 📐", desc: "Focus attention up" }
];

const colorPalette = [
  { name: "Navy", hex: "#1e3a8a", text: "text-white" },
  { name: "Black", hex: "#000000", text: "text-white" },
  { name: "Olive", hex: "#3f6212", text: "text-white" },
  { name: "White", hex: "#ffffff", text: "text-black border border-black/20" },
  { name: "Burgundy", hex: "#701a75", text: "text-white" },
  { name: "Mustard", hex: "#ca8a04", text: "text-white" },
  { name: "Charcoal", hex: "#374151", text: "text-white" },
  { name: "Beige", hex: "#d6d3d1", text: "text-black" },
  { name: "Emerald", hex: "#065f46", text: "text-white" },
  { name: "Grey", hex: "#6b7280", text: "text-white" }
];

const styleTypes = ["Casual", "Formal", "Streetwear", "Ethnic", "Smart Casual", "Partywear"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    gender: "male",
    age: 25,
    height: 170,
    weight: 65,
    chest: 36,
    waist: 32,
    hip: 38,
    preferred_size: "M",
    skin_tone: "wheatish",
    undertone: "warm",
    body_goal: "look_taller",
    occasion: "casual",
    favorite_colors: [] as string[],
    preferred_styles: [] as string[],
    body_photo_url: ""
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.email) {
          // Filter out null or undefined values to avoid overwriting default state strings/numbers
          const cleanData: Record<string, unknown> = {};
          Object.keys(data).forEach((key) => {
            const val = (data as Record<string, unknown>)[key];
            if (val !== null && val !== undefined) {
              cleanData[key] = val;
            }
          });

          setForm((p) => ({
            ...p,
            ...cleanData,
            favorite_colors: Array.isArray(data.favorite_colors) ? data.favorite_colors : p.favorite_colors,
            preferred_styles: Array.isArray(data.preferred_styles) ? data.preferred_styles : p.preferred_styles
          }));
        }
      })
      .catch(() => {});
  }, []);

  async function uploadBodyPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "body");
    const toastId = toast.loading("Uploading body photo...");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        setForm((p) => ({ ...p, body_photo_url: json.url }));
        toast.success("Body photo uploaded successfully", { id: toastId });
      } else {
        toast.error("Upload failed: " + (json.error || "Unknown error"), { id: toastId });
      }
    } catch {
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!(form.name || "").trim()) {
      return toast.error("Please enter your name");
    }
    if (!form.body_photo_url) {
      return toast.error("Please upload a full-body photo for styling analysis");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success("Fashion profile saved successfully!");
        router.push("/dashboard");
      } else {
        toast.error("Could not save profile");
      }
    } catch {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  const toggleColor = (color: string) => {
    setForm((p) => {
      const colors = p.favorite_colors.includes(color)
        ? p.favorite_colors.filter((c) => c !== color)
        : [...p.favorite_colors, color];
      return { ...p, favorite_colors: colors };
    });
  };

  const toggleStyle = (style: string) => {
    setForm((p) => {
      const styles = p.preferred_styles.includes(style)
        ? p.preferred_styles.filter((s) => s !== style)
        : [...p.preferred_styles, style];
      return { ...p, preferred_styles: styles };
    });
  };

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Build Your Fashion Identity
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Provide your styling preferences and measurements to initialize your personal advisor.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="mb-10 flex items-center justify-between px-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <button
              onClick={() => step > s && setStep(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition ${
                step === s
                  ? "bg-accent text-white shadow-lg shadow-accent/30"
                  : step > s
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black"
                  : "bg-white/40 border border-black/10 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-400"
              }`}
            >
              {s}
            </button>
            {s < 3 && (
              <div
                className={`mx-4 h-1 flex-1 rounded-full transition ${
                  step > s ? "bg-accent" : "bg-black/10 dark:bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 md:p-10">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 1: Personal Details</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Your Name</span>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full"
                />
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Age</span>
                <input
                  type="number"
                  placeholder="Enter age"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Gender</span>
                <div className="grid grid-cols-3 gap-3">
                  {["male", "female", "unisex"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm((p) => ({ ...p, gender: g }))}
                      className={`rounded-xl border py-3 capitalize transition text-center ${
                        form.gender === g
                          ? "border-accent bg-accent/10 text-accent font-semibold"
                          : "border-black/10 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!(form.name || "").trim()}
                className="rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 2: Fit & Measurements</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Height (cm)</span>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm((p) => ({ ...p, height: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Weight (kg)</span>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Chest (inches)</span>
                <input
                  type="number"
                  value={form.chest}
                  onChange={(e) => setForm((p) => ({ ...p, chest: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Waist (inches)</span>
                <input
                  type="number"
                  value={form.waist}
                  onChange={(e) => setForm((p) => ({ ...p, waist: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Hip (inches)</span>
                <input
                  type="number"
                  value={form.hip}
                  onChange={(e) => setForm((p) => ({ ...p, hip: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>

              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Preferred Clothing Size</span>
                <select
                  value={form.preferred_size}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_size: e.target.value }))}
                  className="w-full"
                >
                  {["S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-black/10 px-6 py-3 font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 3: Fashion Identity & Photo</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Skin Tone</span>
                <select
                  value={form.skin_tone}
                  onChange={(e) => setForm((p) => ({ ...p, skin_tone: e.target.value }))}
                  className="w-full capitalize"
                >
                  {tones.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Undertone</span>
                <select
                  value={form.undertone}
                  onChange={(e) => setForm((p) => ({ ...p, undertone: e.target.value }))}
                  className="w-full capitalize"
                >
                  {undertones.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Primary Styling Goal</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {bodyGoals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setForm((p) => ({ ...p, body_goal: g.id }))}
                      className={`flex flex-col rounded-xl border p-4 text-left transition ${
                        form.body_goal === g.id
                          ? "border-accent bg-accent/5 text-accent"
                          : "border-black/10 bg-white/40 dark:border-white/10 dark:bg-neutral-900/40"
                      }`}
                    >
                      <span className="font-semibold">{g.label}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {g.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Favorite Colors</span>
                <div className="flex flex-wrap gap-3 py-1">
                  {colorPalette.map((color) => {
                    const isSelected = form.favorite_colors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => toggleColor(color.name)}
                        style={{ backgroundColor: color.hex }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold shadow-sm transition-transform hover:scale-110 active:scale-95 ${
                          color.text
                        } ${isSelected ? "ring-4 ring-accent ring-offset-2 dark:ring-offset-black" : ""}`}
                        title={color.name}
                      >
                        {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Preferred Styles</span>
                <div className="flex flex-wrap gap-2">
                  {styleTypes.map((style) => {
                    const isSelected = form.preferred_styles.includes(style);
                    return (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        className={`rounded-full px-4 py-2 text-xs font-medium border transition ${
                          isSelected
                            ? "border-accent bg-accent text-white"
                            : "border-black/10 bg-white/40 hover:bg-black/5 dark:border-white/10 dark:bg-neutral-900/40 dark:hover:bg-white/5"
                        }`}
                      >
                        {style} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col space-y-2">
                <span className="text-sm font-medium">Occasion Priority</span>
                <select
                  value={form.occasion}
                  onChange={(e) => setForm((p) => ({ ...p, occasion: e.target.value }))}
                  className="w-full capitalize"
                >
                  {occasions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Upload Full-Body Photo</span>
                <div className="mt-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-white/30 p-6 text-center dark:border-white/10 dark:bg-neutral-900/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadBodyPhoto(e.target.files[0])}
                    className="hidden"
                    id="body-photo-upload"
                    disabled={uploading}
                  />
                  {form.body_photo_url ? (
                    <div className="relative group">
                      <img
                        src={form.body_photo_url}
                        alt="Uploaded Body Preview"
                        className="h-44 w-auto rounded-lg object-cover shadow-md"
                      />
                      <label
                        htmlFor="body-photo-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        Change Photo
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="body-photo-upload"
                      className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                    >
                      <span className="text-3xl">📸</span>
                      <span className="text-sm font-medium text-accent">
                        {uploading ? "Uploading..." : "Click to upload body photo"}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Upload a front-view, well-lit full-body photo for realistic try-on results.
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-black/10 px-6 py-3 font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                Back
              </button>
              <button
                disabled={saving || uploading}
                onClick={saveProfile}
                className="rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 shadow-accent/30"
              >
                {saving ? "Saving..." : "Save Profile & Start Styling"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
