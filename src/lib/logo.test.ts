import { describe, expect, it } from "vitest";
import { logoProblem, MAX_LOGO_BYTES } from "./logo";

describe("which files can be a company logo", () => {
  it("accepts PNG, JPG, WebP and SVG within the size limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]) expect(logoProblem({ type, size: 50_000 })).toBeNull();
    expect(logoProblem({ type: "image/png", size: MAX_LOGO_BYTES })).toBeNull();
  });

  it("refuses other types and anything over 700 KB, saying why", () => {
    expect(logoProblem({ type: "application/pdf", size: 1000 })).toMatch(/PNG, JPG, WebP or SVG/);
    expect(logoProblem({ type: "image/gif", size: 1000 })).toMatch(/PNG, JPG, WebP or SVG/);
    expect(logoProblem({ type: "image/png", size: MAX_LOGO_BYTES + 1 })).toMatch(/under 700 KB/);
  });
});
