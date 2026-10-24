import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmWithReason } from "./ConfirmWithReason";

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const click = (el: HTMLElement) => fireEvent.click(el);

function setup(onConfirm: (reason: string) => Promise<unknown>) {
  const onOpenChange = vi.fn();
  render(<ConfirmWithReason open onOpenChange={onOpenChange} title="Suspend Seegas?" description="Everyone is blocked." confirmLabel="Suspend company" destructive onConfirm={onConfirm} />);
  return { onOpenChange, confirm: () => screen.getByRole("button", { name: "Suspend company" }), reason: () => screen.getByLabelText(/reason/i) };
}

describe("ConfirmWithReason", () => {
  it("cannot be confirmed without a real reason", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { confirm, reason } = setup(onConfirm);
    expect(confirm()).toBeDisabled();
    type(reason(), "no");
    expect(confirm()).toBeDisabled();
    type(reason(), "      ");
    expect(confirm()).toBeDisabled(); // spaces are not a reason
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends the trimmed reason and closes only after the change succeeded", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { confirm, reason, onOpenChange } = setup(onConfirm);
    type(reason(), "  unpaid invoice  ");
    click(confirm());
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("unpaid invoice"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("stays open and shows the error when the change fails", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Company already suspended"));
    const { confirm, reason, onOpenChange } = setup(onConfirm);
    type(reason(), "unpaid invoice");
    click(confirm());
    expect(await screen.findByRole("alert")).toHaveTextContent("Company already suspended");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(confirm()).toBeEnabled(); // can be retried
  });

  it("does nothing when cancelled", async () => {
    const onConfirm = vi.fn();
    const { onOpenChange } = setup(onConfirm);
    click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
