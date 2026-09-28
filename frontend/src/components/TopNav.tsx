import { useState } from "react";
import { Search, ChevronDown, LogOut, Send } from "lucide-react";
import { SessionUser } from "../types";

export type FeedTab = "upcoming" | "delivered";

export function TopNav({
  user,
  tab,
  onTabChange,
  search,
  onSearchChange,
  onLogout,
}: {
  user: SessionUser;
  tab: FeedTab;
  onTabChange: (t: FeedTab) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-900 text-white">
              <Send className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">Dispatchly</span>
          </div>

          <div className="flex gap-1 rounded-full bg-ink-50 p-1 sm:hidden">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-ink-600"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="h-6 w-6 rounded-full" alt="" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-700 text-[10px] font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-full bg-ink-50 p-1 sm:order-none">
          {(["upcoming", "delivered"] as FeedTab[]).map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                tab === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-400 hover:text-ink-700"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex w-full items-center gap-2 rounded-full border border-ink-100 bg-ink-50 px-3 py-1.5 sm:w-64">
            <Search className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages"
              className="w-full bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
            />
          </div>

          <div className="relative hidden shrink-0 sm:block">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pl-1 pr-2.5 hover:bg-ink-50"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="h-7 w-7 rounded-full object-cover" alt="" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="max-w-[110px] truncate text-xs font-semibold text-ink-700">{user.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-ink-100 bg-white p-1 shadow-panel">
                <div className="px-3 py-2 text-xs text-ink-400">{user.email}</div>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
