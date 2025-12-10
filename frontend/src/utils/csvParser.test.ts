import { parseCSV } from "./csvParser";

test("parses CSV with header", () => {
  const csv = `name,quantity,price
"Laptop Computer",2,999.99
"Wireless Mouse",1,25.5
`;
  const items = parseCSV(csv);
  expect(items).toHaveLength(2);
  expect(items[0].name).toBe("Laptop Computer");
  expect(items[0].quantity).toBe(2);
  expect(items[0].price).toBeCloseTo(999.99);
});

test("parses CSV without header (name,quantity,price)", () => {
  const csv = `"Desk Lamp",3,45.0
"Notebook",1,5.25
`;
  const items = parseCSV(csv);
  expect(items).toHaveLength(2);
  expect(items[1].name).toBe("Notebook");
  expect(items[1].quantity).toBe(1);
  expect(items[1].price).toBeCloseTo(5.25);
});

test("throws on missing name", () => {
  const csv = `,2,10.0
`;
  expect(() => parseCSV(csv)).toThrow(/Missing item name/);
});
