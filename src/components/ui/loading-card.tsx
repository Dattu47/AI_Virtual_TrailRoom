export function LoadingCard() {
  const steps = [
    { icon: "🔍", label: "Analyzing your body type & skin tone..." },
    { icon: "👗", label: "Understanding the garment design..." },
    { icon: "🪞", label: "Generating virtual try-on image..." },
    { icon: "💡", label: "Running AI styling evaluation..." },
  ];

  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold">Virtual Try-On in Progress</h3>
          <p className="text-xs text-neutral-500">This may take 30–90 seconds. Please wait...</p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl bg-white/40 dark:bg-neutral-800/40 p-3"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            <span className="text-lg">{step.icon}</span>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-accent animate-pulse"
                  style={{ width: `${25 + i * 25}%`, animationDelay: `${i * 0.5}s` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">{step.label}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-center text-neutral-400">
        Powered by IDM-VTON + Gemini AI Stylist
      </p>
    </div>
  );
}
