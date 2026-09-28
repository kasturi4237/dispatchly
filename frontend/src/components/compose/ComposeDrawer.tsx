import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { RecipientsField } from "./RecipientsField";
import { ScheduleFields } from "./ScheduleFields";
import { campaignApi, ApiError } from "../../lib/api";
import { defaultLocalStartTime, localInputToIso } from "../../lib/dates";

export function ComposeDrawer({ onClose, onLaunched }: { onClose: () => void; onLaunched: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [raw, setRaw] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [startAt, setStartAt] = useState(defaultLocalStartTime());
  const [spacingMs, setSpacingMs] = useState(2000);
  const [hourlyCap, setHourlyCap] = useState(100);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ messageCount: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!subject.trim() || !body.trim()) {
      setError("Subject and message body are both required");
      return;
    }
    if (recipients.length === 0) {
      setError("Add at least one valid recipient");
      return;
    }

    setSubmitting(true);
    try {
      const result = await campaignApi.launch({
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        startAt: localInputToIso(startAt),
        spacingMs,
        hourlyCap,
      });
      setSuccess({ messageCount: result.messageCount });
      onLaunched();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to launch campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-900/30" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl sm:rounded-l-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink-900">New campaign</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <RecipientsField
            raw={raw}
            onRawChange={setRaw}
            recipients={recipients}
            onRecipientsChange={setRecipients}
            invalidCount={invalidCount}
            onInvalidCountChange={setInvalidCount}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 placeholder-ink-400 focus:border-ink-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-400">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder="Write your message..."
              className="w-full resize-none rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 placeholder-ink-400 focus:border-ink-400 focus:outline-none"
            />
          </div>

          <ScheduleFields
            startAt={startAt}
            onStartAtChange={setStartAt}
            spacingMs={spacingMs}
            onSpacingMsChange={setSpacingMs}
            hourlyCap={hourlyCap}
            onHourlyCapChange={setHourlyCap}
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Launched — {success.messageCount} messages scheduled.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-ink-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Launching..." : "Schedule campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
