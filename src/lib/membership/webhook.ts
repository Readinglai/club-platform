/**
 * Stripe webhook handling for membership checkouts (see purchase.ts).
 * Returns false for anything that is not a membership checkout.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendMembershipConfirmationEmail } from "@/lib/email";
import { activateMembership, cancelMembershipCheckout, MEMBERSHIP_CHECKOUT_KIND } from "./purchase";
import { createMemberPass, walletPassUrl } from "./wallet-pass";

export async function handleMembershipCheckoutEvent(event: Stripe.Event): Promise<boolean> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return false;
  }

  const session = event.data.object;
  const membershipId = session.metadata?.membershipId;
  if (session.metadata?.kind !== MEMBERSHIP_CHECKOUT_KIND || !membershipId) {
    return false;
  }

  if (event.type === "checkout.session.expired") {
    await cancelMembershipCheckout(membershipId);
    return true;
  }

  if (session.payment_status !== "paid") {
    return true;
  }

  const result = await activateMembership(membershipId, session.id, (session.amount_total ?? 0) / 100);
  if (!result.activated) {
    if (result.reason !== "already_active") {
      console.error(`Paid checkout ${session.id} could not activate membership ${membershipId}: ${result.reason}`);
    }
    return true;
  }

  const m = result.membership;

  // Wallet pass is best-effort: the membership is active either way, and
  // scripts/issue-wallet-passes.ts fills in any that failed.
  let walletUrl: string | null = null;
  try {
    // Test buyers use the reserved .invalid domain; never spend credits on them.
    const passId = m.email?.endsWith(".invalid") ? null : await createMemberPass(m);
    if (passId) {
      await db.membership.update({ where: { id: m.id }, data: { walletPassId: passId } });
      walletUrl = walletPassUrl(passId);
    }
  } catch (error) {
    console.error(`Wallet pass failed for membership ${membershipId}:`, error);
  }

  const origin = process.env.NEXTAUTH_URL;
  if (m.email && origin && !m.email.endsWith(".invalid")) {
    try {
      await sendMembershipConfirmationEmail({
        to: m.email,
        name: m.name ?? "",
        memberCode: m.memberCode,
        validUntil: m.termEnd.toLocaleDateString("en-CA", {
          timeZone: "America/Toronto",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        portalUrl: `${origin}/portal/membership`,
        walletUrl,
      });
    } catch (error) {
      console.error(`Failed to send membership email for ${membershipId}:`, error);
    }
  }
  return true;
}
