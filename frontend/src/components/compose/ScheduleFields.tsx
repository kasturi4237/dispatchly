export function ScheduleFields({
  startAt,
  onStartAtChange,
  spacingMs,
  onSpacingMsChange,
  hourlyCap,
  onHourlyCapChange,
}: {
  startAt: string;
  onStartAtChange: (v: string) => void;
  spacingMs: number;
  onSpacingMsChange: (v: number) => void;
  hourlyCap: number;
  onHourlyCapChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">
          Start sending
        </label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => onStartAtChange(e.target.value)}
          className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">
          Spacing (ms)
        </label>
        <input
          type="number"
          min={0}
          value={spacingMs}
          onChange={(e) => onSpacingMsChange(Number(e.target.value))}
          className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">
          Hourly cap / account
        </label>
        <input
          type="number"
          min={1}
          value={hourlyCap}
          onChange={(e) => onHourlyCapChange(Number(e.target.value))}
          className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
