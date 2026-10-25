import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/services/api";
import { QueryError } from "./QueryError";
import { ConfirmWithReason } from "./ConfirmWithReason";
import { ErrorReference } from "./ErrorReference";

describe("error reference", () => {
  it("a failed list shows the id support can quote, next to the reason", () => {
    render(<QueryError error={new ApiError(500, "db is down", "internal_error", "req_abc123def4567890")} what="orders" />);
    expect(screen.getByRole("alert")).toHaveTextContent("db is down");
    expect(screen.getByText("req_abc123def4567890")).toBeInTheDocument();
  });

  it("shows nothing when the request never reached the API, or the error is not the API's", () => {
    const { container, rerender } = render(<ErrorReference error={new ApiError(0, "Network error", "network_error")} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ErrorReference error={new Error("boom")} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ErrorReference error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("copies the id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ErrorReference error={new ApiError(500, "x", "internal_error", "req_abc123def4567890")} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("req_abc123def4567890"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("when copying is not allowed the id is still on screen to select", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    render(<ErrorReference error={new ApiError(500, "x", "internal_error", "req_abc123def4567890")} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument());
    expect(screen.getByText("req_abc123def4567890")).toBeInTheDocument();
  });

  it("a refused change in a dialog shows the reason and the id", async () => {
    render(<ConfirmWithReason open onOpenChange={() => {}} title="Suspend" description="d" confirmLabel="Suspend" onConfirm={() => Promise.reject(new ApiError(409, "Already suspended", "conflict", "req_1234567890abcdef"))} />);
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "because it is needed" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Already suspended");
    expect(screen.getByText("req_1234567890abcdef")).toBeInTheDocument();
  });
});
