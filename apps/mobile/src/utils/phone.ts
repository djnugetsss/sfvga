/** Strip formatting and coerce a US number to E.164 (+1XXXXXXXXXX). */
export function toE164UsPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+1${digits}`;
}

/** Basic US phone validity check (10 digits, or 11 starting with 1). */
export function isValidUsPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}
