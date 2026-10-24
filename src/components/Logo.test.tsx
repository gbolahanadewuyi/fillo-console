import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("on a dark surface shows only the reversed art", () => {
    render(<Logo size={36} onDark />);
    const imgs = screen.getAllByAltText("Fillo");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/fillo-lockup-horizontal-reversed.png");
  });

  it("on a light page shows the dark art, and swaps to the reversed art in dark mode", () => {
    const { container } = render(<Logo size={64} />);
    const [light, dark] = Array.from(container.querySelectorAll("img"));
    expect(light!).toHaveAttribute("src", "/fillo-lockup-horizontal.png");
    expect(light!).toHaveClass("dark:hidden");
    expect(dark!).toHaveAttribute("src", "/fillo-lockup-horizontal-reversed.png");
    expect(dark!).toHaveClass("hidden", "dark:block");
  });

  it("keeps the real proportions: the lockup is wider than tall, the mark is square", () => {
    const { unmount } = render(<Logo size={40} onDark />);
    expect(screen.getByAltText("Fillo")).toHaveAttribute("width", "72");
    unmount();
    render(<Logo size={40} variant="mark" onDark />);
    expect(screen.getByAltText("Fillo")).toHaveAttribute("width", "40");
  });
});
