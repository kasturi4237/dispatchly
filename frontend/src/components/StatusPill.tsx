import { MessageStatus } from "../types";

const STYLE: Record<MessageStatus, string> = {
  QUEUED: "bg-ink-100 text-ink-600",
  CLAIMED: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
};

const LABEL: Record<MessageStatus, string> = {
  QUEUED: "Queued",
  CLAIMED: "Sending",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

export function StatusPill({ status }: { status: MessageStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
