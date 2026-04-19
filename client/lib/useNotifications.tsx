"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { consumeSseResponse, sleep } from "@/lib/events";
import type { AppNotification } from "@/types/models";

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Fired when a notification concerns this field id (delete / merged-away source). */
  subscribeFieldRemoval: (fieldId: number, onRemove: () => void) => () => void;
  markRead: (ids?: number[]) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, refreshSession } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const removalListeners = useRef(new Map<number, Set<() => void>>());

  const notifyRemoval = useCallback((n: AppNotification) => {
    const id = n.related_field_id;
    if (id == null) return;
    removalListeners.current.get(id)?.forEach((cb) => {
      try {
        cb();
      } catch {
        /* ignore */
      }
    });
  }, []);

  const subscribeFieldRemoval = useCallback((fieldId: number, onRemove: () => void) => {
    let set = removalListeners.current.get(fieldId);
    if (!set) {
      set = new Set();
      removalListeners.current.set(fieldId, set);
    }
    set.add(onRemove);
    return () => {
      set?.delete(onRemove);
      if (set && set.size === 0) removalListeners.current.delete(fieldId);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const list = await api.notifications();
    setItems(list);
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Keyed by `user?.id` only so `refresh` / `setUser` churn does not restart the loop every SSE retry.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const ac = new AbortController();

    const loop = async () => {
      let attempt = 0;
      while (!cancelled && !ac.signal.aborted) {
        try {
          let token = getAccessToken();
          if (!token) {
            await refreshSession().catch(() => null);
            token = getAccessToken();
          }
          if (!token) {
            await sleep(1500);
            continue;
          }
          const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
          const url = `${base}/mavuno/api/events/stream`;
          const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            credentials: "include",
            signal: ac.signal,
          });
          if (res.status === 401) {
            await refreshSession().catch(() => null);
            attempt += 1;
            await sleep(Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)));
            continue;
          }
          if (!res.ok || !res.body) {
            attempt += 1;
            await sleep(Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)));
            continue;
          }
          attempt = 0;
          await consumeSseResponse(res, ac.signal, (data) => {
            if (data.type !== "notification" || !data.notification || typeof data.notification !== "object") return;
            const n = data.notification as AppNotification;
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 50));
            toast.message(n.title, { description: n.body || undefined, duration: 4000 });
            notifyRemoval(n);
          });
        } catch {
          if (cancelled || ac.signal.aborted) break;
          attempt += 1;
          await sleep(Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)));
        }
      }
    };

    void loop();

    const onVis = () => {
      if (document.visibilityState === "visible") void refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      ac.abort();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, refreshSession, notifyRemoval]);

  const unreadCount = useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const markRead = useCallback(
    async (ids?: number[]) => {
      await api.markNotificationsRead(ids);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      refresh,
      subscribeFieldRemoval,
      markRead,
    }),
    [items, unreadCount, refresh, subscribeFieldRemoval, markRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
