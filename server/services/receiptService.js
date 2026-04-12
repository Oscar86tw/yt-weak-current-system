export async function createReceipt(client, quote, amount) {
  const receiptNo = 'YR' + Date.now();
  const result = await client.query(
    `INSERT INTO receipts (receipt_no, quote_id, amount_received, auto_match)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [receiptNo, quote.id, amount]
  );
  return result.rows[0];
}
