import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { extractRecipients } from "../../lib/csv";

export function RecipientsField({
  raw,
  onRawChange,
  recipients,
  onRecipientsChange,
  invalidCount,
  onInvalidCountChange,
}: {
  raw: string;
  onRawChange: (v: string) => void;
  recipients: string[];
  onRecipientsChange: (list: string[]) => void;
  invalidCount: number;
  onInvalidCountChange: (n: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleRawChange(value: string) {
    onRawChange(value);
    const { valid, invalid } = extractRecipients(value);
    onRecipientsChange(valid);
    onInvalidCountChange(invalid.length);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      handleRawChange(content);
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-400">Recipients</label>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="text-emerald-600">{recipients.length} valid</span>
          {invalidCount > 0 && <span className="text-rose-500">{invalidCount} invalid</span>}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-ink-600 hover:text-ink-900"
          >
            <Upload className="h-3.5 w-3.5" /> Upload CSV
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (e.target) e.target.value = "";
        }}
      />
      <textarea
        value={raw}
        onChange={(e) => handleRawChange(e.target.value)}
        placeholder="paste emails separated by commas, semicolons, or new lines..."
        rows={3}
        className="w-full resize-none rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 placeholder-ink-400 focus:border-ink-400 focus:outline-none"
      />
      {recipients.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipients.slice(0, 6).map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-700"
            >
              {r}
            </span>
          ))}
          {recipients.length > 6 && (
            <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-500">
              +{recipients.length - 6} more
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onRawChange("");
              onRecipientsChange([]);
              onInvalidCountChange(0);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50"
          >
            <X className="h-3 w-3" /> clear
          </button>
        </div>
      )}
    </div>
  );
}
