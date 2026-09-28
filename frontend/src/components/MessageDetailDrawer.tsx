import { X, ExternalLink, Mail } from "lucide-react";
import { MessageRecord } from "../types";
import { StatusPill } from "./StatusPill";
import { formatTimestamp } from "../lib/dates";

export function MessageDetailDrawer({ message, onClose }: { message: MessageRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-900/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl sm:rounded-l-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink-900">Message details</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{message.recipient}</p>
              <p className="truncate text-xs text-ink-400">via {message.mailAccount.address}</p>
            </div>
            <div className="ml-auto">
              <StatusPill status={message.status} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Subject</p>
            <p className="text-sm font-semibold text-ink-800">{message.subject}</p>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Body</p>
            <p className="whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm text-ink-700">{message.body}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold uppercase tracking-wide text-ink-400">Scheduled for</p>
              <p className="mt-1 text-ink-700">{formatTimestamp(message.scheduledFor)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-ink-400">Delivered at</p>
              <p className="mt-1 text-ink-700">{formatTimestamp(message.deliveredAt)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-ink-400">Attempts</p>
              <p className="mt-1 text-ink-700">{message.attemptCount}</p>
            </div>
            {message.previewUrl && (
              <div>
                <p className="font-semibold uppercase tracking-wide text-ink-400">Ethereal preview</p>
                <a
                  href={message.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-ink-600 underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {message.failureReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <p className="mb-1 font-semibold">Failure reason</p>
              <p>{message.failureReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
