export function money(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(cents) / 100);
}
export function quantity(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 }).format(Number(value));
}
export function dayInManila(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function time(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export function friendlyStatus(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
export function purchaseTotal(p: { packs: number; pack_price: number; delivery_fee: number }) {
  return p.packs * p.pack_price + p.delivery_fee;
}
export function centavos(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) throw new Error("Enter a valid amount");
  return Math.round(n * 100);
}
