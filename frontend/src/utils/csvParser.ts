/**
 * parseCSV
 * - Accepts CSV text with optional header containing name,quantity,price
 * - Supports quoted fields with commas
 * - Returns array of items { name, quantity, price } or throws on errors
 */
export function parseCSV(
  text: string
): Array<{ name: string; quantity: number; price: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("CSV is empty");

  const firstCols = lines[0]
    .split(",")
    .map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
  const hasHeader =
    firstCols.includes("name") ||
    firstCols.includes("quantity") ||
    firstCols.includes("price");
  const header = hasHeader ? firstCols : [];

  const items: Array<{ name: string; quantity: number; price: number }> = [];

  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const row = lines[i];
    // basic tokenization supporting quoted fields with commas
    const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const vals = cols.map((c) => c.replace(/^"|"$/g, "").trim());

    let name = "";
    let quantity = 1;
    let price = 0;

    if (hasHeader) {
      for (let j = 0; j < header.length; j++) {
        const key = header[j];
        const val = vals[j] ?? "";
        if (key === "name") name = val;
        if (key === "quantity") quantity = parseInt(val) || 1;
        if (key === "price") price = parseFloat(val) || 0;
      }
    } else {
      // assume order: name,quantity,price
      name = vals[0] ?? "";
      quantity = parseInt(vals[1]) || 1;
      price = parseFloat(vals[2]) || 0;
    }

    if (!name) throw new Error(`Missing item name on CSV line ${i + 1}`);
    items.push({ name, quantity, price });
  }

  return items;
}
