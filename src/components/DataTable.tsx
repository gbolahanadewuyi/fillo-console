import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { QueryError } from "@/components/QueryError";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** The value sent as `sort=<sortKey>:asc|desc`. Without it the column is not sortable. */
  sortKey?: string;
  align?: "right";
  /** Hidden on narrow screens so the table fits; the primary columns stay. */
  secondary?: boolean;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  /** What is listed, for the error and the empty state: "orders" -> "Couldn't load orders" / "No orders." */
  what: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
  empty?: string;
}

/**
 * The one table every list uses: sortable headers, server pagination, and the three states (loading, failed,
 * empty) each said in words. It never invents rows: with an error it shows the error and no table body.
 */
export function DataTable<T>({ columns, rows, rowKey, what, loading, error, onRetry, pagination, onPageChange, sort, onSortChange, empty }: Props<T>) {
  const [sortKey, sortDir] = (sort ?? "").split(":");
  const hide = (c: Column<T>) => (c.secondary ? "hidden md:table-cell" : "");

  function toggle(key: string) {
    // asc -> desc -> back to the list's own order
    if (sortKey !== key) onSortChange?.(`${key}:asc`);
    else if (sortDir === "asc") onSortChange?.(`${key}:desc`);
    else onSortChange?.(undefined);
  }

  return (
    <div className="space-y-2">
      {!!error && <QueryError error={error as Error} onRetry={onRetry} what={what} />}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => {
                const active = !!c.sortKey && sortKey === c.sortKey;
                const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead key={c.key} className={cn(c.align === "right" && "text-right", hide(c), c.className)} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortKey && onSortChange ? (
                      <button type="button" onClick={() => toggle(c.sortKey!)} className={cn("inline-flex items-center gap-1 hover:text-foreground", c.align === "right" && "flex-row-reverse")}>
                        {c.header}
                        <Icon className={cn("h-3 w-3", !active && "opacity-40")} aria-hidden />
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground" role="status">
                  Loading…
                </TableCell>
              </TableRow>
            ) : error ? null : (rows?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                  {empty ?? `No ${what}.`}
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.align === "right" && "text-right tabular-nums", hide(c), c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && onPageChange && !error && <TablePagination {...pagination} onPageChange={onPageChange} />}
    </div>
  );
}

/** A search box that keeps what is being typed locally and tells the page once typing pauses. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]); // follows the address when it changes from elsewhere (back button, a link)
  useEffect(() => {
    const t = setTimeout(() => text.trim() !== value && onChange(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label={label ?? placeholder} placeholder={placeholder} className="pl-9" value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
