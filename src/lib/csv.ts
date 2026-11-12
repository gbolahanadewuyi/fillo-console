/** A small CSV reader for the sheets clients send: quoted cells (commas and line breaks inside them, "" for a quote), CRLF or LF, a leading byte-order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type ImportKind = "customers" | "suppliers" | "riders";

export const KIND_COLUMNS: Record<ImportKind, string[]> = {
  customers: ["name", "phone", "email", "address", "notes"],
  suppliers: ["name", "phone", "email", "address", "notes"],
  riders: ["name", "phone"],
};

/** The headings clients actually use, mapped to the column each means. */
const ALIASES: Record<string, string> = {
  name: "name", "full name": "name", fullname: "name", customer: "name", "customer name": "name", supplier: "name", "supplier name": "name", rider: "name", "rider name": "name", "contact name": "name", company: "name",
  phone: "phone", "phone number": "phone", "phone no": "phone", mobile: "phone", "mobile number": "phone", tel: "phone", telephone: "phone", whatsapp: "phone", contact: "phone", "phone numbers": "phone",
  email: "email", "email address": "email", "e-mail": "email",
  address: "address", location: "address",
  notes: "notes", note: "notes", remarks: "notes", comment: "notes", comments: "notes",
};

export interface Sheet {
  rows: Record<string, string>[];
  /** Headings the record has no use for, so staff can see what was left out. */
  ignored: string[];
  /** Columns the record needs that no heading matched. */
  missing: string[];
}

/** The first line is the headings. Each later line becomes a record keyed by the column each heading means. */
export function sheetFromCsv(text: string, kind: ImportKind): Sheet {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], ignored: [], missing: kind === "riders" ? ["name", "phone"] : ["phone"] };
  const columns = KIND_COLUMNS[kind];
  const headings = table[0]!.map((h) => h.trim());
  const map = headings.map((h) => {
    const column = ALIASES[h.toLowerCase()];
    return column && columns.includes(column) ? column : null;
  });
  const used = new Set(map.filter((c): c is string => c !== null));
  const ignored = headings.filter((_, i) => map[i] === null && headings[i] !== "");
  const required = kind === "customers" ? ["phone"] : kind === "suppliers" ? ["name"] : ["name", "phone"];
  const missing = required.filter((c) => !used.has(c));
  const rows = table.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    map.forEach((column, i) => {
      if (column && !(column in record)) record[column] = (cells[i] ?? "").trim();
    });
    return record;
  });
  return { rows, ignored, missing };
}

/** The sheet clients fill in: just the headings, and one example row to show the shape. */
export function templateCsv(kind: ImportKind): string {
  const columns = KIND_COLUMNS[kind];
  const example: Record<string, string> = { name: "Mama Put", phone: "08011112222", email: "mama@example.com", address: "12 Allen Avenue", notes: "" };
  return `${columns.join(",")}\n${columns.map((c) => example[c] ?? "").join(",")}\n`;
}
