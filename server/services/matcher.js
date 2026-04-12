export async function autoMatch(client, amount, orderId) {
  const result = await client.query(
    'SELECT * FROM quotes WHERE quote_no = $1 LIMIT 1',
    [orderId]
  );

  if (!result.rows.length) return null;

  const quote = result.rows[0];
  const remaining = Number(quote.total || 0) - Number(quote.paid || 0);

  if (amount <= 0) return null;
  if (amount > remaining) return null;

  return quote;
}
