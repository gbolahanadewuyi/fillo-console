import { useState } from "react";
import { useControlSearch } from "@/hooks/useControlApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QueryError } from "@/components/QueryError";
import { pageForPath } from "@/lib/permissions";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Support() {
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim());
  const { data, isFetching, error, refetch } = useControlSearch(term);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Find a company, a person or an order. This is read-only: nothing here changes a client's data.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" /> Global search
          </CardTitle>
          <CardDescription>Companies by name, people by name, email or phone, and orders by number.</CardDescription>
          <div className="relative mt-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search" placeholder="Try “Seegas”, an email, or an order number" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <QueryError error={error} onRetry={() => void refetch()} what="search results" />
          ) : (
            <>
              {isFetching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              )}
              {!isFetching && term.length >= 2 && (data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No results for “{term}”.</p>}
              <div className="space-y-2">
                {(data ?? []).map((r) => {
                  const row = (
                    <>
                      <div>
                        <div className="text-sm font-medium">{r.label}</div>
                        {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
                      </div>
                      <Badge variant="outline">{r.type}</Badge>
                    </>
                  );
                  // Orders have no page in the console yet: show them, but don't link to a screen that doesn't exist.
                  return pageForPath(r.url) ? (
                    <Link key={`${r.type}-${r.id}`} to={r.url} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/50">
                      {row}
                    </Link>
                  ) : (
                    <div key={`${r.type}-${r.id}`} className="flex items-center justify-between rounded border px-3 py-2">
                      {row}
                    </div>
                  );
                })}
              </div>
              {term.length < 2 && <p className="text-sm text-muted-foreground">Enter at least 2 characters to search.</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
