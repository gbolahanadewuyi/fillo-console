/** The API refuses a larger image or another type, so say so before the upload, not after it. */
export const MAX_LOGO_BYTES = 700_000;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Why this file cannot be a company logo, in words, or null when it can. */
export function logoProblem(file: Pick<File, "type" | "size">): string | null {
  if (!LOGO_TYPES.includes(file.type)) return "Use a PNG, JPG, WebP or SVG image.";
  if (file.size > MAX_LOGO_BYTES) return "That image is too large. Use one under 700 KB.";
  return null;
}
