import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiRequest, ApiError } from "@/services/api";
import * as ownAuth from "@/lib/own-auth";

export type PlatformRole = "platform_owner" | "platform_admin" | "platform_support" | "platform_finance";

export interface PlatformUser {
  uid: string;
  email: string;
  displayName: string;
  platformRole: PlatformRole;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: PlatformUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** A convenience filter for the sign-in form only. The API is the authority: it resolves the platform role
 *  from its own allowlist or staff table and refuses everyone else, so this is never what grants access. */
function isAllowedControlEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.endsWith("@fillo.cloud") ||
    lower.endsWith("@fillo.africa") ||
    lower.endsWith("@fillo.io") ||
    lower.endsWith("@fillo-demo.local")
  );
}

/** The platform profile comes from the API and nowhere else: if it cannot be loaded there is no session,
 *  never a role guessed from the email address. */
async function loadPlatformProfile(): Promise<PlatformUser> {
  try {
    return await apiRequest<PlatformUser>("GET", "/control/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      throw new ApiError(403, "This account does not have access to the console.");
    }
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      throw new ApiError(503, "The control plane is not available right now. Try again shortly.");
    }
    throw err;
  }
}

function messageFor(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ownAuth.OwnAuthError) return new ApiError(err.status, err.message);
  return new ApiError(0, "Network error. Check your connection and try again.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the session from the refresh cookie, then follow later session loss.
    let cancelled = false;
    (async () => {
      try {
        if (await ownAuth.refresh()) {
          let profile: PlatformUser;
          try {
            profile = await loadPlatformProfile();
          } catch (err) {
            // A session that cannot become a platform profile is ended, not left half signed in.
            await ownAuth.logout();
            throw err;
          }
          if (!cancelled) setUser(profile);
        } else if (!cancelled) {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const stop = ownAuth.onSessionLost(() => setUser(null));
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const GENERIC = new ApiError(401, "Invalid email or password.");
    if (!isAllowedControlEmail(email.toLowerCase())) throw GENERIC;
    try {
      await ownAuth.login(email, password);
    } catch (err) {
      throw messageFor(err);
    }
    try {
      setUser(await loadPlatformProfile());
    } catch (err) {
      await ownAuth.logout();
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await ownAuth.logout();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await ownAuth.forgotPassword(email);
    } catch (err) {
      throw messageFor(err);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
