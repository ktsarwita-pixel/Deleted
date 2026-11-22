/**
 * Formats a number into Indonesian Rupiah currency format with ",00" suffix
 * e.g. 12000 -> "Rp 12.000,00"
 */
export function formatRupiah(amount: number): string {
  const rounded = Math.max(0, Math.floor(amount));
  const formattedNumber = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formattedNumber},00`;
}
