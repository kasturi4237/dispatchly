export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-400">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-ink-200 border-t-ink-600" />
      {label && <p className="text-xs font-medium tracking-wide">{label}</p>}
    </div>
  );
}
