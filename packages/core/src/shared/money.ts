/** Integer Toman helpers — never use floats for storage. */

export function computeAmount(units: number, unitPrice: bigint): bigint {
  // Round half-up to nearest toman after multiplying decimal units
  return BigInt(Math.round(Number(units) * Number(unitPrice)));
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(input: string | number | bigint): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

export function formatToman(amount: bigint | number | null | undefined): string {
  if (amount == null) return "—";
  const n = typeof amount === "bigint" ? amount : BigInt(Math.round(amount));
  const withSep = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return `${toPersianDigits(withSep)} تومان`;
}

export function parseTomanInput(raw: string): bigint {
  const cleaned = raw
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, "");
  if (!cleaned) throw new Error("Invalid amount");
  return BigInt(cleaned);
}
