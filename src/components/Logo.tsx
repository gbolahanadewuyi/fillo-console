import { cn } from "@/lib/utils";

// Real pixel size of the lockup PNGs (public/fillo-lockup-horizontal*.png): 1600 x 885.
const RATIO = 1600 / 885;

interface Props {
  /** Height in px. */
  size: number;
  /** "mark" is the cylinders alone, for tight spaces. */
  variant?: "lockup" | "mark";
  /** Use on a dark surface (the sidebar). Otherwise the light-surface art is used, and the dark-mode art in dark mode. */
  onDark?: boolean;
  className?: string;
}

/** The Fillo logo: the one place the console picks which of the supplied images to show. */
export function Logo({ size, variant = "lockup", onDark = false, className }: Props) {
  const width = variant === "mark" ? size : Math.round(size * RATIO);
  const [light, dark] =
    variant === "mark" ? ["/fillo-mark-transparent.png", "/fillo-mark-reversed-transparent.png"] : ["/fillo-lockup-horizontal.png", "/fillo-lockup-horizontal-reversed.png"];
  const img = (src: string, extra: string) => <img src={src} alt="Fillo" width={width} height={size} className={cn("select-none", extra, className)} draggable={false} />;
  if (onDark) return img(dark, "");
  return (
    <>
      {img(light, "dark:hidden")}
      {img(dark, "hidden dark:block")}
    </>
  );
}
