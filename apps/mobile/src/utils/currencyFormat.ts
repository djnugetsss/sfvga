/** Format cents or dollars as USD currency string. */
export function formatCurrency(amount: number, inCents = false): string {
  const dollars = inCents ? amount / 100 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}
