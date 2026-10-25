import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useControlCompany } from "@/hooks/useControlApi";

/** `?companyId=` narrows a records page to one company (linked from the company page); this shows and clears it. */
export function useCompanyScope() {
  const [params, setParams] = useSearchParams();
  const companyId = params.get("companyId") ?? undefined;
  return {
    companyId,
    clear: () => {
      const next = new URLSearchParams(params);
      next.delete("companyId");
      next.delete("page");
      setParams(next, { replace: true });
    },
  };
}

export function CompanyScope({ companyId, onClear }: { companyId?: string; onClear: () => void }) {
  const { data } = useControlCompany(companyId ?? "");
  if (!companyId) return null;
  return (
    <Button variant="secondary" size="sm" className="self-start" onClick={onClear} aria-label={`Showing ${data?.name ?? "one company"} only. Clear`}>
      {data?.name ?? "One company"} <X className="ml-1 h-3 w-3" />
    </Button>
  );
}
