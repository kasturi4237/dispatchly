import { MessageRecord } from "../types";
import { StatusPill } from "./StatusPill";
import { formatTimestamp, formatRelativeCountdown } from "../lib/dates";

export function MessageList({
  items,
  mode,
  onSelect,
}: {
  items: MessageRecord[];
  mode: "upcoming" | "delivered";
  onSelect: (m: MessageRecord) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-panel">
      <div className="divide-y divide-ink-50">
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-ink-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
              {m.recipient.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-ink-900">{m.recipient}</span>
                <StatusPill status={m.status} />
              </div>
              <p className="truncate text-xs text-ink-500">
                <span className="font-medium text-ink-700">{m.subject}</span>
                <span className="text-ink-400"> — {m.body.replace(/\s+/g, " ")}</span>
              </p>
            </div>

            <div className="hidden shrink-0 text-right text-xs text-ink-400 sm:block">
              {mode === "upcoming" ? (
                <span className="font-medium text-ink-600">{formatRelativeCountdown(m.scheduledFor)}</span>
              ) : (
                <span>{formatTimestamp(m.deliveredAt)}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
