"use client";

import { useState } from "react";

/**
 * Client-side "show N, Load More" pagination over an in-memory list. Resets to
 * the first page whenever `resetKey` changes (a window or filter change), using
 * the render-time previous-value pattern — no effect, so it never trips the
 * react-hooks/set-state-in-effect rule.
 */
export function usePagination<T>(
  items: T[],
  resetKey: string,
  pageSize = 20,
): {
  visible: T[];
  hasMore: boolean;
  shown: number;
  total: number;
  loadMore: () => void;
} {
  const [count, setCount] = useState(pageSize);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setCount(pageSize);
  }
  const visible = items.slice(0, count);
  return {
    visible,
    hasMore: count < items.length,
    shown: visible.length,
    total: items.length,
    loadMore: () => setCount((c) => c + pageSize),
  };
}
