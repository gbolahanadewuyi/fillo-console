import { useCallback, useSyncExternalStore } from "react";

/** How many rows a table may show at once. 100 is the ceiling (the API refuses more). */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
const STORAGE_KEY = "fillo-console.pageSize";

export function normalisePageSize(value: unknown): number {
  const n = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

const listeners = new Set<() => void>();
function read(): number {
  try {
    return normalisePageSize(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** One choice for every table, remembered on this device. */
export function usePageSize(): number {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PAGE_SIZE);
}

export function useSetPageSize(): (size: number) => void {
  return useCallback((size: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(normalisePageSize(size)));
    } catch {
      /* the choice just lasts until the next reload */
    }
    listeners.forEach((l) => l());
  }, []);
}
