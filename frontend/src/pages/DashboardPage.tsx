import { useEffect, useState } from "react";
import { Plus, Clock, Send, AlertTriangle, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { TopNav, FeedTab } from "../components/TopNav";
import { StatCard } from "../components/StatCard";
import { MessageList } from "../components/MessageList";
import { MessageDetailDrawer } from "../components/MessageDetailDrawer";
import { ComposeDrawer } from "../components/compose/ComposeDrawer";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { useMessageFeed } from "../hooks/useMessageFeed";
import { campaignApi } from "../lib/api";
import { SessionUser, MessageRecord, StatsResponse } from "../types";

export function DashboardPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [tab, setTab] = useState<FeedTab>("upcoming");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selected, setSelected] = useState<MessageRecord | null>(null);
  const [stats, setStats] = useState<StatsResponse["stats"] | null>(null);

  const feed = useMessageFeed(tab, search, page);

  useEffect(() => {
    let cancelled = false;
    const load = () => campaignApi.stats().then((r) => !cancelled && setStats(r.stats));
    load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(feed.total / feed.pageSize));

  return (
    <div className="min-h-screen bg-ink-50 pb-20">
      <TopNav
        user={user}
        tab={tab}
        onTabChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap gap-3">
          <StatCard label="Queued" value={(stats?.QUEUED ?? 0) + (stats?.CLAIMED ?? 0)} icon={<Clock className="h-4 w-4" />} />
          <StatCard label="Delivered" value={stats?.DELIVERED ?? 0} icon={<Send className="h-4 w-4" />} tone="emerald" />
          <StatCard label="Failed" value={stats?.FAILED ?? 0} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" />
        </div>

        {feed.loading && feed.items.length === 0 ? (
          <Spinner label={`Loading ${tab} messages...`} />
        ) : feed.error ? (
          <ErrorBanner message={feed.error} onRetry={feed.reload} />
        ) : feed.items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title={tab === "upcoming" ? "Nothing scheduled" : "No delivery history yet"}
            description={
              tab === "upcoming"
                ? "Launch a campaign and it'll show up here until it's sent."
                : "Delivered and failed messages will appear here."
            }
            action={
              tab === "upcoming" ? (
                <button
                  onClick={() => setComposeOpen(true)}
                  className="mt-2 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-800"
                >
                  New campaign
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <MessageList items={feed.items} mode={tab} onSelect={setSelected} />
            {feed.total > feed.pageSize && (
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>{feed.total} total</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-ink-100 p-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-medium text-ink-600">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-full border border-ink-100 p-1.5 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <button
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3.5 text-sm font-semibold text-white shadow-panel transition hover:bg-ink-800"
      >
        <Plus className="h-4 w-4" /> New campaign
      </button>

      {composeOpen && (
        <ComposeDrawer
          onClose={() => setComposeOpen(false)}
          onLaunched={() => {
            setTab("upcoming");
            setPage(1);
            feed.reload();
          }}
        />
      )}

      {selected && <MessageDetailDrawer message={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
