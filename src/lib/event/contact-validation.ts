/**
 * contact-validation.ts — checks for the ticket form's email and phone,
 * so bad values are caught before Stripe rejects them.
 */

// Same shape Stripe accepts for customer_email: name@domain.tld, ASCII,
// no spaces, no leading/trailing/double dots, a real-looking TLD.
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/**
 * Accepts a North American number (10 digits, optional leading 1) or an
 * international number written with "+" and the country code (8–15 digits).
 * Spaces, dashes, dots and brackets are ignored.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15;
  }

  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}
