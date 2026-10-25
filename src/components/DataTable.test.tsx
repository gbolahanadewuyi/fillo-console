import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/services/api";
import { DataTable, SearchBox, type Column } from "./DataTable";

interface Row { id: string; name: string; note: string }
const cols: Column<Row>[] = [
  { key: "name", header: "Name", sortKey: "name", cell: (r) => r.name },
  { key: "note", header: "Note", secondary: true, cell: (r) => r.note },
  { key: "plain", header: "Plain", cell: () => "x" },
];
const rows: Row[] = [{ id: "1", name: "Alpha", note: "first" }, { id: "2", name: "Beta", note: "second" }];
const base = { columns: cols, rows, rowKey: (r: Row) => r.id, what: "things" };

describe("DataTable", () => {
  it("shows the rows, and hides secondary columns on narrow screens", () => {
    render(<DataTable {...base} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("first").closest("td")).toHaveClass("hidden", "md:table-cell");
    expect(screen.getByText("Alpha").closest("td")).not.toHaveClass("hidden");
  });

  it("only columns with a sortKey are sortable, and clicking cycles asc, desc, then back to the list's own order", () => {
    const onSort = vi.fn();
    const { rerender } = render(<DataTable {...base} onSortChange={onSort} />);
    expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Plain" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith("name:asc");
    rerender(<DataTable {...base} sort="name:asc" onSortChange={onSort} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith("name:desc");
    rerender(<DataTable {...base} sort="name:desc" onSortChange={onSort} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith(undefined);
  });

  it("with no sort handler nothing is a button", () => {
    render(<DataTable {...base} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says it is loading, says it is empty, and never shows rows while loading", () => {
    const { rerender } = render(<DataTable {...base} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    rerender(<DataTable {...base} rows={[]} />);
    expect(screen.getByText("No things.")).toBeInTheDocument();
    rerender(<DataTable {...base} rows={[]} empty="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("on an error it shows the error with Retry, not rows and not an 'empty' claim", () => {
    const onRetry = vi.fn();
    render(<DataTable {...base} rows={undefined} error={new ApiError(500, "db is down")} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("db is down");
    expect(screen.queryByText("No things.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("pages through the server's pagination, and hides it when the list failed", () => {
    const onPage = vi.fn();
    const pagination = { page: 1, pageSize: 20, total: 45, totalPages: 3 };
    const { rerender } = render(<DataTable {...base} pagination={pagination} onPageChange={onPage} />);
    expect(screen.getByText(/1–20 of 45/)).toBeInTheDocument();
    rerender(<DataTable {...base} rows={undefined} error={new Error("x")} pagination={pagination} onPageChange={onPage} />);
    expect(screen.queryByText(/of 45/)).not.toBeInTheDocument();
  });
});

describe("SearchBox", () => {
  it("tells the page once typing pauses, trimmed, not on every keystroke", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} placeholder="Search…" />);
    const input = screen.getByLabelText("Search…");
    fireEvent.change(input, { target: { value: " ga" } });
    fireEvent.change(input, { target: { value: " gas " } });
    expect(onChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(350);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("gas");
    vi.useRealTimers();
  });

  it("follows the address when it changes from elsewhere", () => {
    const { rerender } = render(<SearchBox value="a" onChange={() => {}} placeholder="Search…" />);
    rerender(<SearchBox value="b" onChange={() => {}} placeholder="Search…" />);
    expect(screen.getByLabelText("Search…")).toHaveValue("b");
  });
});
