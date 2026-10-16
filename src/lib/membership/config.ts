/** Membership settings that change rarely; edited in code for now. */

export const MEMBERSHIP_PRICE_CAD = 5;
export const MEMBERSHIP_CURRENCY = "CAD";

export const MEMBER_CODE_PREFIX = "OTSA";

/**
 * Codes are OTSA-<term start year>-NNNN. Online sign-ups start at 0300 so
 * they never look like the imported members (0001–0071); staff use 1xxx.
 */
export const ONLINE_MEMBER_CODE_START = 300;
export const ONLINE_MEMBER_CODE_END = 999;

/** How long a membership checkout stays open before Stripe expires it. */
export const MEMBERSHIP_CHECKOUT_MINUTES = 30;
