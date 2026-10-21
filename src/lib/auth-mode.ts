/**
 * Which sign-in system this build uses, chosen at build time by VITE_AUTH_PROVIDER:
 *   local     our own accounts (API /v1/auth/*): access token in memory, refresh token in an httpOnly cookie
 *   firebase  Firebase Auth (the default, and what production uses until the cutover)
 * Keeping both lets us cut over deliberately, and roll back by rebuilding with the other value.
 */
export const AUTH_MODE: "local" | "firebase" = import.meta.env.VITE_AUTH_PROVIDER === "local" ? "local" : "firebase";
export const isLocalAuth = AUTH_MODE === "local";
