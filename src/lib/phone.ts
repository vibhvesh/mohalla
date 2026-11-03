/** Store mobiles as E.164. 10-digit Indian numbers are assumed to be +91. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`
  return null
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  if (phone.startsWith("+91") && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`
  }
  return phone
}
