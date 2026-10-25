import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface Options {
  /** Sort when the URL names none, e.g. "createdAt:desc". */
  sort?: string;
  /** What each filter is when the URL names none. A filter at its default is left out of the URL. */
  filters?: Record<string, string>;
  /** Keep the state in the address (so a view can be shared, bookmarked and survives a reload). Off for a table embedded in a tab. */
  syncUrl?: boolean;
  /** Distinguishes two tables on one page: `inv_page`, `inv_sort`. */
  prefix?: string;
}

type Changes = Record<string, string | undefined>;

/**
 * The state of a list: page, sort and filters. Kept in the URL when `syncUrl` is on, otherwise in memory.
 * Changing a filter or the sort returns to page 1. "all" is a real value (it is how a filter says "no filter"
 * when its default is something narrower, like "open"); `apiValue` turns it into the empty string the API expects.
 */
export function useTableState({ sort: defaultSort, filters: defaults = {}, syncUrl = true, prefix = "" }: Options = {}) {
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState<Record<string, string>>({});
  const read = (key: string): string | undefined => (syncUrl ? (params.get(prefix + key) ?? undefined) : local[key]);

  const write = useCallback(
    (changes: Changes) => {
      if (syncUrl) {
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            for (const [key, value] of Object.entries(changes)) {
              if (value === undefined || value === "") next.delete(prefix + key);
              else next.set(prefix + key, value);
            }
            return next;
          },
          { replace: true },
        );
      } else {
        setLocal((current) => {
          const next = { ...current };
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === "") delete next[key];
            else next[key] = value;
          }
          return next;
        });
      }
    },
    [syncUrl, prefix, setParams],
  );

  const page = Math.max(1, Number(read("page")) || 1);
  const sort = read("sort") ?? defaultSort;
  const filter = (key: string): string => read(key) ?? defaults[key] ?? "";

  return {
    page,
    sort,
    filter,
    setPage: (p: number) => write({ page: p > 1 ? String(p) : undefined }),
    setSort: (s: string | undefined) => write({ sort: s === defaultSort ? undefined : s, page: undefined }),
    setFilter: (key: string, value: string) => {
      const fallback = defaults[key] ?? "";
      const v = value === "all" && fallback === "" ? "" : value; // "all" is only worth keeping in the address when the default is narrower
      write({ [key]: v === fallback ? undefined : v || "all", page: undefined });
    },
  };
}

/** "all" and "" both mean "no filter" to the API. */
export const apiValue = (v: string): string => (v === "all" ? "" : v);
