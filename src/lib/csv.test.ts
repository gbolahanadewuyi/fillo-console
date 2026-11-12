import { describe, expect, it } from "vitest";
import { parseCsv, sheetFromCsv, templateCsv } from "./csv";

describe("reading a CSV", () => {
  it("reads plain rows, with CRLF or LF, and skips blank lines", () => {
    expect(parseCsv("a,b\r\n1,2\n\n3,4\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("reads quoted cells: commas, doubled quotes and line breaks inside", () => {
    expect(parseCsv('name,address\n"Mama Put, Wuse","12 ""Allen"" Ave\nAbuja"')).toEqual([["name", "address"], ["Mama Put, Wuse", '12 "Allen" Ave\nAbuja']]);
  });

  it("ignores a byte-order mark and keeps empty cells", () => {
    expect(parseCsv("﻿name,phone\nAda,\n")).toEqual([["name", "phone"], ["Ada", ""]]);
  });
});

describe("a sheet of customers", () => {
  it("matches the headings clients use, in any order and case", () => {
    const sheet = sheetFromCsv("Phone Number,Full Name,Address\n08011112222,Mama Put,12 Allen Avenue\n", "customers");
    expect(sheet.rows).toEqual([{ phone: "08011112222", name: "Mama Put", address: "12 Allen Avenue" }]);
    expect(sheet.missing).toEqual([]);
    expect(sheet.ignored).toEqual([]);
  });

  it("reports the columns it leaves out and the ones it needs but cannot find", () => {
    const sheet = sheetFromCsv("S/N,Name,Vehicle\n1,Ali,Bike\n", "riders");
    expect(sheet.ignored).toEqual(["S/N", "Vehicle"]);
    expect(sheet.missing).toEqual(["phone"]);
  });

  it("a supplier sheet needs only a name; a rider sheet needs both", () => {
    expect(sheetFromCsv("Supplier\nNipco\n", "suppliers").missing).toEqual([]);
    expect(sheetFromCsv("Name\nAli\n", "riders").missing).toEqual(["phone"]);
  });

  it("an empty file reports what is missing", () => {
    expect(sheetFromCsv("", "customers")).toEqual({ rows: [], ignored: [], missing: ["phone"] });
  });
});

describe("the template", () => {
  it("has the headings for that kind and one example row", () => {
    expect(templateCsv("riders")).toBe("name,phone\nMama Put,08011112222\n");
    expect(templateCsv("customers").split("\n")[0]).toBe("name,phone,email,address,notes");
  });
});
