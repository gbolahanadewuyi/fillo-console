import { useState } from "react";
import { useControlSearch } from "@/hooks/useControlApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Support() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data, isFetching } = useControlSearch(debounced);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">Read-heavy support tools. Search companies, users, orders, phones, refs. No unrestricted business-data editing.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" /> Global search
          </CardTitle>
          <CardDescription>Search by company, station, user, order, phone, email, reference. Fast and obvious — ⌘K in header.</CardDescription>
          <div className="relative mt-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Try “Seegas” or “+234…”"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setDebounced(q)}
              onKeyDown={(e) => e.key === "Enter" && setDebounced(q)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {!isFetching && debounced && (data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No results for “{debounced}”.</p>}
          <div className="space-y-2">
            {(data ?? []).map((r) => (
              <Link key={`${r.type}-${r.id}`} to={r.url} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
                </div>
                <Badge variant="outline">{r.type}</Badge>
              </Link>
            ))}
          </div>
          {!debounced && <p className="text-sm text-muted-foreground">Enter at least 2 characters to search.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Support guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• All searches and views are logged to the audit trail.</p>
          <p>• Do not edit orders/payments directly — use the tenant app or an audited control action.</p>
          <p>• Integration failures: see Integrations for webhook last-failure timestamps.</p>
        </CardContent>
      </Card>
    </div>
  );
}
