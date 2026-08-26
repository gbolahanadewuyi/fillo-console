import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, onIdTokenChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "energyops-504210",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

if (
  import.meta.env.VITE_USE_EMULATORS === "true" &&
  typeof window !== "undefined" &&
  !("_filloEmulatorConnected" in globalThis)
) {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  (globalThis as Record<string, unknown>)._filloEmulatorConnected = true;
}

let _currentToken: string | null = null;
onIdTokenChanged(firebaseAuth, async (user) => {
  try {
    _currentToken = user ? await user.getIdToken() : null;
  } catch {
    _currentToken = null;
  }
});
export const getAuthToken = () => _currentToken;
export const primeAuthToken = (token: string) => {
  _currentToken = token;
};

export async function getFcmToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator)) {
      console.warn("[FCM] Service workers not supported.");
      return null;
    }
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) console.warn("[FCM] getToken empty — VAPID key may be missing.");
    return token || null;
  } catch (err) {
    console.warn("[FCM] getToken failed:", err);
    return null;
  }
}

type ForegroundMessageHandler = (payload: { title: string; body: string; data?: Record<string, string> }) => void;
let foregroundHandler: ForegroundMessageHandler | null = null;
let foregroundListenerAttached = false;

export function setForegroundMessageHandler(handler: ForegroundMessageHandler) {
  foregroundHandler = handler;
}

export async function initForegroundMessaging(): Promise<void> {
  if (foregroundListenerAttached) return;
  try {
    if (!("serviceWorker" in navigator)) return;
    const { getMessaging, onMessage } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? payload.data?.title ?? "";
      const body = payload.notification?.body ?? payload.data?.body ?? "";
      if (title && foregroundHandler) foregroundHandler({ title, body, data: payload.data as Record<string, string> | undefined });
    });
    foregroundListenerAttached = true;
  } catch (err) {
    console.warn("[FCM] onMessage setup failed:", err);
  }
}

export default app;
