export async function updateFinance(client, receipt) {
  await client.query(
    'UPDATE quotes SET paid = COALESCE(paid, 0) + $1 WHERE id = $2',
    [receipt.amount_received, receipt.quote_id]
  );
}
