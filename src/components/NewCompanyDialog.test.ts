import { describe, expect, it } from "vitest";
import { slugFromName } from "./NewCompanyDialog";
import { can } from "@/lib/permissions";

describe("an address suggested from the company name", () => {
  it("is lowercase letters, numbers and single hyphens, at most 32 long", () => {
    expect(slugFromName("Seegas Energy Ltd")).toBe("seegas-energy-ltd");
    expect(slugFromName("  Mama's  Gas & Co. ")).toBe("mama-s-gas-co");
    expect(slugFromName("A".repeat(50))).toHaveLength(32);
    expect(slugFromName("!!!")).toBe("");
  });
});

describe("who can create a company", () => {
  it("is admins and the owner, not support or finance", () => {
    expect(can("platform_owner", "company.create")).toBe(true);
    expect(can("platform_admin", "company.create")).toBe(true);
    expect(can("platform_support", "company.create")).toBe(false);
    expect(can("platform_finance", "company.create")).toBe(false);
  });
});
