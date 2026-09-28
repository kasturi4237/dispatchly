import { Send, Clock, Gauge, ShieldCheck } from "lucide-react";
import { authApi } from "../lib/api";

export function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const errorMessage = params.get("error");

  return (
    <div className="flex min-h-screen bg-ink-900">
      <div className="hidden flex-1 flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Send className="h-4 w-4" />
          </div>
          <span className="font-display text-xl font-bold">Dispatchly</span>
        </div>

        <div className="max-w-md space-y-8">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Schedule campaigns that land on time, every time.
          </h1>
          <div className="space-y-5 text-sm text-ink-200">
            <Feature icon={<Clock className="h-4 w-4" />} text="Delayed-job scheduling — no cron, no polling loops." />
            <Feature icon={<Gauge className="h-4 w-4" />} text="Per-account spacing and hourly caps, enforced atomically." />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Idempotent delivery survives crashes and restarts." />
          </div>
        </div>

        <p className="text-xs text-ink-400">© {new Date().getFullYear()} Dispatchly</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm rounded-3xl border border-ink-100 bg-white p-8 shadow-panel">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-900 text-white">
              <Send className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">Dispatchly</span>
          </div>

          <h2 className="font-display text-xl font-bold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-400">Sign in to manage your scheduled campaigns.</p>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {decodeURIComponent(errorMessage)}
            </div>
          )}

          <a
            href={authApi.googleLoginUrl()}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-100 bg-white py-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:bg-ink-50"
          >
            <GoogleMark />
            Continue with Google
          </a>

          <p className="mt-6 text-center text-[11px] text-ink-400">
            By continuing you agree this is a demo app sending only to Ethereal test inboxes.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z"
      />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4c-2 1.4-4.6 2.5-7.6 2.5-5.2 0-9.6-3.4-11.3-8.1l-6.6 5C9.5 40.5 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.4C41.5 36 44 30.5 44 24c0-1.4-.1-2.5-.4-3.5z" />
    </svg>
  );
}
