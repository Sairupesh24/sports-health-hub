import { apiFetch } from "@/utils/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error("[Push] Service Worker registration failed:", err);
    return null;
  }
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const data = await apiFetch<{ publicKey: string }>("/messenger/push/vapid-public-key");
    return data?.publicKey || null;
  } catch (err) {
    console.error("[Push] Error fetching VAPID public key:", err);
    return null;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error("[Push] Error retrieving existing push subscription:", err);
    return null;
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications are not supported by this browser." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Notification permission was denied." };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: "Failed to initialize Service Worker." };
    }

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: "Failed to obtain VAPID public key from server." };
    }

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe with PushManager
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey.buffer as ArrayBuffer,
    });

    await apiFetch("/messenger/push/subscribe", {
      method: "POST",
      data: {
        subscription: subscription.toJSON(),
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[Push] Failed to subscribe to push notifications:", err);
    return { success: false, error: err.message || "Failed to subscribe" };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await apiFetch("/messenger/push/unsubscribe", {
        method: "POST",
        data: { endpoint: sub.endpoint },
      }).catch(() => {});
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Push] Error unsubscribing from push:", err);
    return { success: false, error: err.message || "Failed to unsubscribe" };
  }
}

export async function checkPushSubscriptionStatus(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }
  const sub = await getPushSubscription();
  return Boolean(sub);
}

export async function sendTestPush(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; message?: string }>("/messenger/push/test", {
      method: "POST",
    });
    return { success: res?.success || false, message: res?.message };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to send test push" };
  }
}
