/**
 * Hilo Party: a standalone ticket page at /hilo, running on the generic event
 * ticketing (Event / TicketType / Order / Ticket). Which event it sells is set
 * by the HILO_EVENT_ID environment variable, so local development can point
 * at an unpublished test event while the live site points at the real one.
 */

export function hiloEventId(): string | null {
  return process.env.HILO_EVENT_ID?.trim() || null;
}

/**
 * Draft (unpublished) events are shown on /hilo in local development and on
 * Vercel preview deployments, where the test event is tried out. On the
 * production site the event must be published.
 */
export function hiloShowsDrafts(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
}

/** Added to Hilo Party's ticket confirmation email (sendConfirmation in ticketing/webhook.ts). */
export const HILO_EMAIL_NOTES = {
  title: "BEFORE YOU ARRIVE",
  items: [
    "This is a strictly 19+ event. Valid government-issued photo ID is required for entry.",
    "Please have your ticket or confirmation QR code ready at the door.",
    "Tickets include admission only. Drinks are available for purchase separately.",
    "All ticket sales are final and non-refundable.",
    "Entry is subject to venue policies and security checks.",
    "We recommend arriving early to avoid long lines!",
  ],
};
