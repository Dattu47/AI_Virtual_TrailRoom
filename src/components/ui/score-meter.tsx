import { cn } from "@/lib/utils";

export function ScoreMeter({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10">
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
