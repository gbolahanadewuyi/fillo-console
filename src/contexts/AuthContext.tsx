import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth, primeAuthToken, getFcmToken } from "@/lib/firebase";
import { apiRequest, ApiError } from "@/services/api";
import { findMockPlatformUserByEmail, MOCK_PLATFORM_PASSWORD } from "@/lib/mock/users";

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

let _fcmToken: string | null = null;

async function registerFcm() {
  try {
    const token = await getFcmToken();
    if (!token) return;
    _fcmToken = token;
    // best-effort: control plane topic registration (optional, not blocking)
    await apiRequest("POST", "/control/fcm-topic", { token }).catch(() => {});
  } catch {
    // non-critical
  }
}

async function unregisterFcm() {
  const token = _fcmToken;
  if (!token) return;
  _fcmToken = null;
  try {
    await apiRequest("DELETE", "/control/fcm-topic", { token }).catch(() => {});
  } catch {
    // non-critical
  }
}

function platformRoleFromEmail(email: string): PlatformRole {
  const lower = email.toLowerCase();
  if (lower.startsWith("owner@")) return "platform_owner";
  if (lower.startsWith("support@")) return "platform_support";
  if (lower.startsWith("finance@")) return "platform_finance";
  return "platform_admin";
}

function isAllowedControlEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    import.meta.env.DEV ||
    lower.endsWith("@fillo.cloud") ||
    lower.endsWith("@fillo.africa") ||
    lower.endsWith("@fillo.io") ||
    lower.endsWith("@fillo-demo.local")
  );
}

// Dev fallback: when /control/me is not yet deployed, treat @fillo.cloud users as platform_admin
async function fetchPlatformProfile(): Promise<PlatformUser | null> {
  try {
    const profile = await apiRequest<PlatformUser>("GET", "/control/me");
    return profile;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      // control plane not yet available — fall back to dev mode
      return null;
    }
    throw err;
  }
}

const MOCK_STORAGE_KEY = "fillo_mock_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(() => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(MOCK_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as PlatformUser;
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const registeredRef = useRef(false);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() ?? "";
        if (!isAllowedControlEmail(email)) {
          try {
            await firebaseSignOut(firebaseAuth);
          } catch {}
          setUser(null);
        } else {
          try {
            const token = await firebaseUser.getIdToken();
            primeAuthToken(token);
            const platformProfile = await fetchPlatformProfile();
            if (platformProfile) {
              setUser(platformProfile);
            } else {
              // dev fallback: synthesize profile from firebase user
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email ?? "",
                displayName: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "Admin",
                platformRole: platformRoleFromEmail(email),
              });
            }
            if (!registeredRef.current) {
              registeredRef.current = true;
              registerFcm();
            }
          } catch {
            setUser(null);
          }
        }
      } else {
        // Check mock fallback persistence (offline demo)
        if (import.meta.env.DEV && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(MOCK_STORAGE_KEY);
            if (raw) {
              const mock = JSON.parse(raw) as PlatformUser;
              // no real token — control hooks fall back to mock data via safeRequest
              primeAuthToken("");
              setUser(mock);
              setLoading(false);
              return;
            }
          } catch {}
        }
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const GENERIC = new ApiError(401, "Invalid email or password.");
    const lower = email.toLowerCase();
    if (!isAllowedControlEmail(lower)) throw GENERIC;
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await cred.user.getIdToken();
      primeAuthToken(token);
      const platformProfile = await fetchPlatformProfile();
      if (platformProfile) {
        setUser(platformProfile);
      } else {
        setUser({
          uid: cred.user.uid,
          email: cred.user.email ?? email,
          displayName: cred.user.displayName ?? email.split("@")[0],
          platformRole: platformRoleFromEmail(lower),
        });
      }
      registeredRef.current = true;
      registerFcm();
    } catch (err) {
      // ── Mock fallback for DEMO without emulator ───────────────────────────
      // If emulator is not running (network failures) or the Firebase user
      // hasn't been seeded yet (user-not-found/invalid-credential), but the
      // email belongs to a mockPlatformUser and the password is correct, treat
      // it as a successful mock login in DEV. This mirrors EOP's seeded demo
      // experience and lets the console be demoed offline (all control hooks
      // already fall back to mock data via safeRequest).
      if (import.meta.env.DEV) {
        const mock = findMockPlatformUserByEmail(lower);
        if (mock && password === MOCK_PLATFORM_PASSWORD) {
          const code = err instanceof Error && "code" in err ? (err as { code: string }).code : "";
          const isAuthMissing =
            err instanceof ApiError
              ? err.status === 0
              : typeof code === "string" &&
                (code.includes("network") ||
                  code === "auth/user-not-found" ||
                  code === "auth/wrong-password" ||
                  code === "auth/invalid-credential" ||
                  code === "auth/invalid-email");
          if (isAuthMissing) {
            const mockUser: PlatformUser = {
              uid: mock.id,
              email: mock.email,
              displayName: mock.name,
              platformRole: mock.platformRole,
            };
            try {
              localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
            } catch {}
            primeAuthToken("");
            setUser(mockUser);
            registeredRef.current = true;
            // no FCM in mock mode
            return;
          }
        }
      }
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && "code" in err && typeof (err as { code: string }).code === "string") {
        const code = (err as { code: string }).code;
        if (code.includes("network-request-failed")) throw new ApiError(0, "Network error. Check your connection and try again.");
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
          throw new ApiError(401, "Invalid email or password. If using emulator, run: npm run emulators && npm run seed:emulator");
        if (code === "auth/too-many-requests") throw new ApiError(429, "Too many attempts. Try again later.");
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await unregisterFcm();
    registeredRef.current = false;
    try {
      localStorage.removeItem(MOCK_STORAGE_KEY);
    } catch {}
    primeAuthToken("");
    await firebaseSignOut(firebaseAuth);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(firebaseAuth, email);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
