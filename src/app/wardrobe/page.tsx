"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WardrobeItem } from "@/types";
import Link from "next/link";

const CATEGORIES = [
  { id: "shirt", label: "👔 Shirt", type: "top" },
  { id: "t-shirt", label: "👕 T-Shirt", type: "top" },
  { id: "kurta", label: "🧥 Kurta", type: "top" },
  { id: "jacket", label: "🧣 Jacket", type: "top" },
  { id: "blazer", label: "💼 Blazer", type: "top" },
  { id: "sweater", label: "🧶 Sweater", type: "top" },
  { id: "pant", label: "👖 Pant", type: "bottom" },
  { id: "jeans", label: "🔵 Jeans", type: "bottom" },
  { id: "shorts", label: "🩲 Shorts", type: "bottom" },
  { id: "skirt", label: "🩱 Skirt", type: "bottom" },
  { id: "leggings", label: "👟 Leggings", type: "bottom" },
  { id: "dress", label: "👗 Dress", type: "full" },
  { id: "saree", label: "🥻 Saree", type: "full" },
  { id: "suit", label: "🤵 Suit", type: "full" },
  { id: "co-ord set", label: "✨ Co-ord Set", type: "full" },
];

const COLOR_PALETTE = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#f5f5f5", border: true },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Beige", hex: "#d4c4a8" },
  { name: "Olive", hex: "#3f6212" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Mustard", hex: "#ca8a04" },
  { name: "Sky Blue", hex: "#0ea5e9" },
  { name: "Emerald", hex: "#059669" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Brown", hex: "#92400e" },
  { name: "Red", hex: "#dc2626" },
  { name: "Teal", hex: "#0d9488" },
];

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [category, setCategory] = useState("shirt");
  const [color, setColor] = useState("Black");
  const [customColor, setCustomColor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "top" | "bottom" | "full">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWardrobe();
  }, []);

  async function loadWardrobe() {
    try {
      const data = await fetch("/api/wardrobe").then((r) => r.json());
      if (Array.isArray(data)) setItems(data);
    } catch {
      toast.error("Failed to load wardrobe");
    }
  }

  async function upload(file: File) {
    // Preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "wardrobe");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        setImageUrl(json.url);
        toast.success("Image uploaded! Now save to wardrobe.");
      } else {
        toast.error("Upload failed: " + (json.error || "Unknown error"));
        setPreviewUrl("");
      }
    } catch {
      toast.error("Upload failed");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  }

  async function addItem() {
    if (!imageUrl) return toast.error("Please upload an image of your garment first");
    const finalColor = customColor.trim() || color;
    if (!finalColor) return toast.error("Please select or enter a color");

    setSaving(true);
    try {
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, category, color: finalColor }),
      });
      if (!res.ok) throw new Error("Could not save wardrobe item");
      toast.success("Item added to wardrobe! 🎉");
      setImageUrl("");
      setPreviewUrl("");
      setCustomColor("");
      if (fileRef.current) fileRef.current.value = "";
      await loadWardrobe();
    } catch {
      toast.error("Could not save wardrobe item");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/wardrobe?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success("Item removed");
      } else {
        toast.error("Could not remove item");
      }
    } catch {
      toast.error("Could not remove item");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedCatInfo = CATEGORIES.find((c) => c.id === category);

  const filteredItems =
    filterType === "all"
      ? items
      : items.filter((item) => {
          const catInfo = CATEGORIES.find(
            (c) => c.id.toLowerCase() === item.category.toLowerCase()
          );
          return catInfo?.type === filterType;
        });

  return (
    <section className="space-y-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 pb-5 dark:border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Wardrobe</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Upload your clothing items to use in virtual try-on sessions.
          </p>
        </div>
        <Link
          href="/compare"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-accent/90 shadow-accent/20"
        >
          🪞 Try On Studio
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Upload Panel */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 space-y-5 sticky top-4">
            <h2 className="text-lg font-bold">Add New Item</h2>

            {/* Image Upload */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Garment Photo
              </p>
              <div
                className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-white/30 p-4 text-center cursor-pointer hover:border-accent/50 transition dark:border-white/10 dark:bg-neutral-900/30"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  disabled={uploading}
                />
                {previewUrl ? (
                  <div className="relative group w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-48 w-full rounded-xl object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition">
                      <span className="text-white text-xs font-semibold">Click to Change</span>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                        <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {imageUrl && !uploading && (
                      <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        ✓ Uploaded
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 py-4">
                    <span className="text-4xl">{uploading ? "⏳" : "👕"}</span>
                    <span className="text-sm font-medium text-accent">
                      {uploading ? "Uploading..." : "Click to upload garment"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      PNG, JPG, WEBP supported
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Category
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`rounded-xl border px-2 py-2 text-left text-xs font-medium transition ${
                      category === cat.id
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-black/10 bg-white/40 hover:border-accent/30 dark:border-white/10 dark:bg-neutral-900/40"
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`ml-1 text-[9px] uppercase ${
                        cat.type === "top"
                          ? "text-blue-500"
                          : cat.type === "bottom"
                          ? "text-purple-500"
                          : "text-pink-500"
                      }`}
                    >
                      ({cat.type})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Color
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setColor(c.name);
                      setCustomColor("");
                    }}
                    title={c.name}
                    style={{ backgroundColor: c.hex }}
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 active:scale-95 ${
                      c.border ? "border border-black/20" : ""
                    } ${
                      color === c.name && !customColor
                        ? "ring-4 ring-accent ring-offset-2 dark:ring-offset-neutral-900 scale-110"
                        : ""
                    }`}
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type custom color (e.g. pastel pink)"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-full text-xs"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Selected:{" "}
                <strong className="text-neutral-700 dark:text-neutral-300">
                  {customColor.trim() || color}
                </strong>
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={addItem}
              disabled={!imageUrl || saving || uploading}
              className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 shadow-accent/20 transition"
            >
              {saving ? "Saving..." : `Save to Wardrobe — ${selectedCatInfo?.label || category}`}
            </button>
          </div>
        </div>

        {/* Wardrobe Grid */}
        <div className="lg:col-span-2 space-y-5">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "top", "bottom", "full"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition capitalize ${
                  filterType === type
                    ? "bg-accent text-white shadow-sm shadow-accent/30"
                    : "bg-white/60 border border-black/10 hover:bg-black/5 dark:bg-neutral-800 dark:border-white/10"
                }`}
              >
                {type === "all" ? `All (${items.length})` : type === "top" ? `👕 Tops` : type === "bottom" ? `👖 Bottoms` : `👗 Full Outfits`}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/10 py-16 text-center dark:border-white/10 space-y-3">
              <span className="text-5xl">👚</span>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {filterType === "all"
                  ? "Your wardrobe is empty. Start adding clothes!"
                  : `No ${filterType} items yet.`}
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-accent/10 text-accent px-4 py-2 text-xs font-semibold hover:bg-accent/20 transition"
              >
                Upload your first item →
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredItems.map((item) => {
                const catInfo = CATEGORIES.find(
                  (c) => c.id.toLowerCase() === item.category.toLowerCase()
                );
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl border border-black/5 bg-white/70 overflow-hidden shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 transition hover:shadow-md hover:border-accent/20"
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt={item.category}
                        className="h-full w-full object-contain p-2 transition group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold capitalize">
                            {item.color} {item.category}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded mt-1 ${
                              catInfo?.type === "top"
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                : catInfo?.type === "bottom"
                                ? "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                                : "bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400"
                            }`}
                          >
                            {catInfo?.type || "item"}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-xs disabled:opacity-50 dark:bg-red-950/20 dark:text-red-400"
                          title="Remove item"
                        >
                          {deletingId === item.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex justify-center pt-2">
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90 shadow-accent/20"
              >
                🪞 Go to Try-On Studio
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
