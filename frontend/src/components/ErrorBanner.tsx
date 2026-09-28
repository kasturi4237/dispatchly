export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 py-14 text-center">
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
