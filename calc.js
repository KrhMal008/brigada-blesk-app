// Расчёт стоимости: та же формула, что app/pricing.py в боте (без промокода: его считает бот).
// Округление как round_rub в Python: половина вверх для неотрицательных сумм.
export const roundRub = (x) => Math.floor(x + 0.5);

export function calculate(catalog, serviceId, area, addons) {
  const service = catalog.services.find((s) => s.id === serviceId);
  if (!service) return { lines: [], subtotal: 0, total: 0, topUp: 0 };
  const lines = [];
  if (service.price_per_m2 != null && area > 0) {
    lines.push({ name: service.name, qty: area, unit: "м²", total: roundRub(area * service.price_per_m2) });
  }
  for (const groupId of service.addon_groups) {
    const group = catalog.addon_groups.find((g) => g.id === groupId);
    if (!group) continue;
    for (const item of group.items) {
      let qty = addons[item.id] || 0;
      if (qty <= 0) continue;
      if (item.unit === "count") qty = Math.trunc(qty);
      lines.push({ name: item.name, qty, unit: item.unit === "m2" ? "м²" : "шт", total: roundRub(qty * item.price) });
    }
  }
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const total = Math.max(subtotal, catalog.min_order_rub || 0);
  return { lines, subtotal, total, topUp: total - subtotal };
}
