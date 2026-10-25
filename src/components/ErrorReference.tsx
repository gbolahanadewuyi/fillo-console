import { useState } from "react";
import { ApiError } from "@/services/api";

/** "Reference req_…": the id support can quote to find what happened. Nothing is shown when the request never reached the API. */
export function ErrorReference({ error }: { error: unknown }) {
  const [copied, setCopied] = useState(false);
  const id = error instanceof ApiError ? error.requestId : undefined;
  if (!id) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(id!);
      setCopied(true);
    } catch {
      // Not allowed (an insecure page, a blocked permission): the id is on screen and can be selected.
    }
  }
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Reference <span className="select-all font-mono">{id}</span>{" "}
      <button type="button" onClick={() => void copy()} className="underline underline-offset-2 hover:text-foreground">
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}
