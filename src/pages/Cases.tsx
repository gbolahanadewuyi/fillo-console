import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CasesPanel } from "@/components/CasesPanel";

/** `/cases?new=1&companyId=…&userId=…&orderId=…` opens the new-case dialog with those links filled in. */
export default function Cases() {
  const [params] = useSearchParams();
  const defaults = {
    companyId: params.get("companyId") ?? undefined,
    userId: params.get("userId") ?? undefined,
    orderId: params.get("orderId") ?? undefined,
    posTransactionId: params.get("posTransactionId") ?? undefined,
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
        <p className="text-sm text-muted-foreground">Staff-only notes on a customer's problem. Customers never see them.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CasesPanel startOpen={params.get("new") === "1"} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
