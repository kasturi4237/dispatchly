import { useCallback, useEffect, useRef, useState } from "react";
import { campaignApi } from "../lib/api";
import { MessageRecord } from "../types";

const PAGE_SIZE = 25;
const POLL_MS = 4000;

export function useMessageFeed(kind: "upcoming" | "delivered", search: string, page: number) {
  const [items, setItems] = useState<MessageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (inflight.current) return;
      inflight.current = true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const fetcher = kind === "upcoming" ? campaignApi.upcoming : campaignApi.delivered;
        const res = await fetcher(PAGE_SIZE, (page - 1) * PAGE_SIZE, search || undefined);
        setItems(res.items);
        setTotal(res.total);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Failed to load messages");
        }
      } finally {
        inflight.current = false;
        if (!silent) setLoading(false);
      }
    },
    [kind, search, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { items, total, loading, error, pageSize: PAGE_SIZE, reload: () => load(false) };
}
