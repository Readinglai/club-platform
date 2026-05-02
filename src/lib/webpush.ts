import webpush from "web-push";

let initialized = false;

function init() {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:exec@rocsaut.ca";
  if (!publicKey || !privateKey) {
    console.warn("[webpush] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  init();
  if (!initialized) return;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    console.error("[webpush] Failed to send web push notification:", err);
  }
}

export async function sendExpoPushNotification(
  expoToken: string,
  payload: PushPayload
): Promise<void> {
  try {
    const message = {
      to: expoToken,
      sound: "default",
      title: payload.title,
      body: payload.body ?? "",
      data: payload.data ?? {},
    };
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      console.error("[webpush] Expo push failed:", await response.text());
    }
  } catch (err) {
    console.error("[webpush] Failed to send Expo push notification:", err);
  }
}

export async function sendPushNotification(
  subscription: {
    endpoint?: string | null;
    p256dh?: string | null;
    auth?: string | null;
    expoToken?: string | null;
  },
  payload: PushPayload
): Promise<void> {
  if (subscription.expoToken) {
    await sendExpoPushNotification(subscription.expoToken, payload);
  } else if (subscription.endpoint && subscription.p256dh && subscription.auth) {
    await sendWebPushNotification(
      { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
      payload
    );
  }
}
