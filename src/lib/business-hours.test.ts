import { describe, expect, it } from "vitest";
import { hoursFromWeek, summariseWeek, weekOf, type BusinessHours, type DayHours } from "./business-hours";

const day = (open: string, close: string): DayHours => ({ open, close });
const seegasWeek = { mon: day("07:00", "18:00"), tue: day("07:00", "18:00"), wed: day("07:00", "18:00"), thu: day("07:00", "18:00"), fri: day("07:00", "18:00"), sat: day("07:00", "17:00"), sun: null };

describe("the week from a saved setting", () => {
  it("with only the everyday hours, every day is open at them", () => {
    const week = weekOf({ open: "08:00", close: "18:00" });
    expect(Object.values(week).every((h) => h?.open === "08:00" && h.close === "18:00")).toBe(true);
  });

  it("with days saved, each keeps its own hours and a closed day stays closed", () => {
    const week = weekOf({ open: "07:00", close: "18:00", days: seegasWeek });
    expect(week.sat).toEqual({ open: "07:00", close: "17:00" });
    expect(week.sun).toBeNull();
  });
});

describe("saving the week", () => {
  it("keeps the first open day's hours as the everyday hours, for anything that reads only those", () => {
    const saved: BusinessHours = hoursFromWeek({ ...seegasWeek, mon: null });
    expect(saved).toMatchObject({ open: "07:00", close: "18:00" });
    expect(saved.days?.mon).toBeNull();
  });

  it("falls back to the default when every day is closed", () => {
    const closed = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };
    expect(hoursFromWeek(closed)).toMatchObject({ open: "08:00", close: "18:00" });
  });
});

describe("the summary", () => {
  it("joins days with the same hours", () => {
    expect(summariseWeek(seegasWeek)).toBe("Mon to Fri 07:00 to 18:00, Sat 07:00 to 17:00, Sun closed");
  });
  it("says so when every day is the same", () => {
    expect(summariseWeek(weekOf({ open: "08:00", close: "18:00" }))).toBe("Mon to Sun 08:00 to 18:00");
  });
});
