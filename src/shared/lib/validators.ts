export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const SLUG_RE = /^[a-z0-9-]+$/
export const E164_RE = /^\+[1-9]\d{7,14}$/

export function isEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

export function isSlug(v: string): boolean {
  return SLUG_RE.test(v.trim())
}

export function isE164(v: string): boolean {
  return E164_RE.test(v.trim())
}

export function required(v: string | undefined | null): string | undefined {
  return v === undefined || v === null || String(v).trim() === ''
    ? 'Campo requerido'
    : undefined
}
