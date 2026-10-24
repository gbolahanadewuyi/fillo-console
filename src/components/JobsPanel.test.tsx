import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlatformRole } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/services/api", async () => ({ ...(await vi.importActual<typeof import("@/services/api")>("@/services/api")), apiRequest }));
let role: PlatformRole = "platform_admin";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { platformRole: role } }) }));

import { JobsPanel } from "./JobsPanel";

const overview = (stuck: number) => ({
  jobs: [
    { job: "notify-sweep", schedule: "every 5 minutes", status: "failed", lastRunAt: "2026-10-24T10:00:00Z", lastSuccessAt: "2026-10-24T09:00:00Z", lastError: "database is on fire" },
    { job: "reminder-sweep", schedule: "hourly", status: "stale", lastRunAt: "2026-10-23T10:00:00Z", lastSuccessAt: "2026-10-23T10:00:00Z", lastError: null },
  ],
  recentFailures: [{ id: "r1", job: "notify-sweep", startedAt: "2026-10-24T10:00:00Z", error: "database is on fire" }],
  outbox: { pending: stuck, stuck, oldestAt: null, lastError: stuck ? "subscriber exploded" : null },
});

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <JobsPanel />
    </QueryClientProvider>,
  );
}
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  role = "platform_admin";
});

describe("JobsPanel", () => {
  it("shows each job's state and the real error, and what failed recently", async () => {
    apiRequest.mockResolvedValue(overview(0));
    show();
    expect(await screen.findByText("notify-sweep", { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument(); // a job that stopped being scheduled is not "failed"
    expect(screen.getAllByText("database is on fire").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0 waiting")).toBeInTheDocument();
  });

  it("offers the retry only to admin and above, and only when events are stuck", async () => {
    apiRequest.mockResolvedValue(overview(3));
    show();
    expect(await screen.findByRole("button", { name: "Retry stuck events" })).toBeInTheDocument();
  });
  it("hides the retry from support", async () => {
    role = "platform_support";
    apiRequest.mockResolvedValue(overview(3));
    show();
    await screen.findByText("3 waiting, 3 stuck for over 15 minutes");
    expect(screen.queryByRole("button", { name: "Retry stuck events" })).not.toBeInTheDocument();
  });
  it("hides the retry when nothing is stuck", async () => {
    apiRequest.mockResolvedValue(overview(0));
    show();
    await screen.findByText("0 waiting");
    expect(screen.queryByRole("button", { name: "Retry stuck events" })).not.toBeInTheDocument();
  });

  it("retrying needs a reason, then calls the API with it", async () => {
    apiRequest.mockImplementation(async (method: string, path: string) => (method === "POST" ? { retried: 3 } : overview(3)));
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Retry stuck events" }));
    const confirm = await screen.findByRole("button", { name: "Retry now" });
    expect(confirm).toBeDisabled();
    type(screen.getByLabelText(/reason/i), "events stuck after restart");
    fireEvent.click(confirm);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("POST", "/control/outbox/retry", { reason: "events stuck after restart" }));
  });

  it("says so when the jobs cannot be loaded", async () => {
    apiRequest.mockImplementation(() => Promise.reject(new ApiError(500, "jobs are down")));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("jobs are down");
  });
});
