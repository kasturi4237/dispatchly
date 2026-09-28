import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white/60 py-20 text-center">
      {icon && <div className="mb-1 text-ink-400">{icon}</div>}
      <p className="font-display text-base font-semibold text-ink-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-400">{description}</p>}
      {action}
    </div>
  );
}
