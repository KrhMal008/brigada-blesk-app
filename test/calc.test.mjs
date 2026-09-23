// Формула мини-приложения должна совпадать с ботом. Ожидания посчитаны app/pricing.py (без промокода).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate, roundRub } from "../calc.js";

const catalog = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url)));
const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url)));

test("roundRub как round_rub в Python", () => {
  assert.equal(roundRub(2.5), 3);
  assert.equal(roundRub(2.4), 2);
});

for (const c of cases) {
  test(`service ${c.service_id}, area ${c.area}, addons ${JSON.stringify(c.addons)}`, () => {
    const q = calculate(catalog, c.service_id, c.area, c.addons);
    assert.equal(q.subtotal, c.subtotal);
    assert.equal(q.total, c.total);
  });
}
