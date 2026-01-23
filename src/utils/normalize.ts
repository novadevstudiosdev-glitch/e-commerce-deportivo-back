const NON_DIGITS = /[^0-9]/g;
const PHONE_TRIM = /[\s\-().]/g;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeDNI(value: string) {
  return value.replace(NON_DIGITS, '');
}

export function normalizePhone(value: string) {
  const trimmed = value.replace(PHONE_TRIM, '');
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(NON_DIGITS, '')}`;
  }
  return trimmed.replace(NON_DIGITS, '');
}

export function isValidDNI(value: string) {
  return /^[0-9]{7,8}$/.test(value);
}

export function isValidPhone(value: string) {
  if (value.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(value);
  }
  return /^(11|15)\d{8}$/.test(value);
}
