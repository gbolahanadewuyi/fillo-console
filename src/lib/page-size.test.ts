import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalisePageSize } from "./page-size";

describe("page size", () => {
  it("offers 10, 25, 50 and 100, with 100 the ceiling", () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 25, 50, 100]);
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });
  it("falls back to 25 for anything else", () => {
    expect(normalisePageSize("100")).toBe(100);
    expect(normalisePageSize("500")).toBe(25);
    expect(normalisePageSize(undefined)).toBe(25);
  });
});
