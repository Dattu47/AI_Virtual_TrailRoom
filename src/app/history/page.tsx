"use client";

import { useEffect, useState } from "react";
import { Analysis } from "@/types";
import Link from "next/link";

function verdictLabel(verdict: string) {
  if (verdict === "great_match") return { text: "🌟 Great Match", cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (verdict === "skip_it") return { text: "❌ Skip It", cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  return { text: "👍 Decent", cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 text-neutral-500 font-medium shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] w-6 text-right font-bold">{score}</span>
    </div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-6 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Try-On History</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-3xl border border-black/5 p-4 animate-pulse space-y-3 dark:border-white/10">
              <div className="h-48 w-full rounded-2xl bg-black/5 dark:bg-white/5" />
              <div className="h-4 w-2/3 rounded bg-black/5 dark:bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 py-6">
      <div className="flex items-center justify-between border-b border-black/5 pb-5 dark:border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Try-On History</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Your past virtual try-on sessions and AI styling evaluations.
          </p>
        </div>
        <Link
          href="/compare"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-accent/90 shadow-accent/20"
        >
          🪞 New Try-On
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/10 py-20 text-center dark:border-white/10 space-y-4">
          <span className="text-6xl">📁</span>
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
            No Try-On Sessions Yet
          </h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            Head to the Try-On Studio and run your first virtual fitting to see results here.
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90 shadow-accent/20"
          >
            🪞 Start First Try-On
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => {
            const v = verdictLabel(item.verdict);
            return (
              <div
                key={item.id}
                className="rounded-3xl border border-black/5 bg-white/70 overflow-hidden shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 hover:shadow-md transition"
              >
                <div className="aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.tryon_result_url || item.product_image_url}
                    alt="Try-on result"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${v.cls}`}>
                      {v.text}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <ScoreBar score={item.fit_score} label="Fit" />
                    <ScoreBar score={item.color_score} label="Color" />
                    <ScoreBar score={item.occasion_score} label="Occasion" />
                  </div>

                  {item.feedback?.fit_feedback && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {item.feedback.fit_feedback}
                    </p>
                  )}

                  {item.feedback?.local_tip && (
                    <div className="rounded-xl bg-accent/5 border border-accent/10 px-3 py-2">
                      <p className="text-[11px] text-accent font-semibold">💡 Tip</p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {item.feedback.local_tip}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
