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
/** Staff (complimentary) codes continue after the imported 1001–1072. */
export const STAFF_MEMBER_CODE_START = 1001;
export const STAFF_MEMBER_CODE_END = 1999;

export type CodeRange = { start: number; end: number };
export const MEMBER_RANGE: CodeRange = { start: ONLINE_MEMBER_CODE_START, end: ONLINE_MEMBER_CODE_END };
export const STAFF_RANGE: CodeRange = { start: STAFF_MEMBER_CODE_START, end: STAFF_MEMBER_CODE_END };

/** How long a membership checkout stays open before Stripe expires it. */
export const MEMBERSHIP_CHECKOUT_MINUTES = 30;
