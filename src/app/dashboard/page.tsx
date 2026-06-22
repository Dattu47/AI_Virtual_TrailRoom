import Link from "next/link";

const cards = [
  {
    href: "/onboarding",
    title: "Profile Setup",
    emoji: "🧵",
    desc: "Set your measurements, body goals & upload your standing photo for try-on",
    gradient: "from-blue-500/10 to-indigo-500/10",
    border: "hover:border-blue-400",
    tag: "Step 1",
  },
  {
    href: "/wardrobe",
    title: "My Wardrobe",
    emoji: "👔",
    desc: "Upload shirts, pants, dresses & more to create your digital wardrobe",
    gradient: "from-purple-500/10 to-pink-500/10",
    border: "hover:border-purple-400",
    tag: "Step 2",
  },
  {
    href: "/compare",
    title: "Try-On Studio",
    emoji: "🪞",
    desc: "Select 1 or 2 items (top + bottom), generate try-on & get AI styling feedback",
    gradient: "from-accent/10 to-orange-400/10",
    border: "hover:border-accent",
    tag: "Step 3",
    featured: true,
  },
  {
    href: "/history",
    title: "Results History",
    emoji: "📊",
    desc: "Review your past AI outfit scores and styling recommendations",
    gradient: "from-green-500/10 to-teal-500/10",
    border: "hover:border-green-400",
    tag: "View all",
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-8 py-6">
      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-accent/10 via-orange-50/50 to-transparent dark:from-accent/5 dark:via-transparent border border-accent/10 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Welcome to StyleSense AI
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-lg">
              Your personal AI fashion stylist. Upload your photo, add clothes to your wardrobe, and 
              see how any outfit looks on you — with expert styling advice.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-white shadow-lg hover:bg-accent/90 shadow-accent/25 transition"
            >
              🪞 Start Try-On
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">How it works</p>
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              "1. Upload your full-body photo",
              "2. Add clothes to your wardrobe",
              "3. Select items to try on",
              "4. Get AI-generated try-on + styling advice",
            ].map((step) => (
              <span
                key={step}
                className="bg-white/60 dark:bg-white/10 rounded-full px-3 py-1.5 font-medium border border-black/5 dark:border-white/10"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative rounded-3xl border border-black/10 bg-gradient-to-br ${card.gradient} p-6 backdrop-blur-sm transition hover:shadow-md dark:border-white/10 ${card.border} ${
              card.featured ? "ring-2 ring-accent/20" : ""
            }`}
          >
            {card.featured && (
              <span className="absolute top-4 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Main Feature
              </span>
            )}
            <div className="flex items-start gap-4">
              <span className="text-4xl">{card.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">{card.title}</h2>
                  <span className="text-[10px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-semibold text-neutral-500">
                    {card.tag}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition">
              Open {card.title} →
            </div>
          </Link>
        ))}
      </div>

      {/* Tip */}
      <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 text-xs text-blue-800 dark:text-blue-300">
        <strong>💡 Tip:</strong> For the best try-on results, upload a clear front-facing full-body photo with good lighting and a simple background.
      </div>
    </section>
  );
}
