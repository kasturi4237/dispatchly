import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "default" | "amber" | "emerald" | "rose";
}) {
  const toneStyles = {
    default: "bg-ink-900 text-white",
    amber: "bg-amber-500 text-white",
    emerald: "bg-emerald-500 text-white",
    rose: "bg-rose-500 text-white",
  }[tone];

  return (
    <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 shadow-panel">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneStyles}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
        <p className="font-display text-xl font-bold text-ink-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
