// Interpretação de códigos lidos e dos dados da Open Food Facts (puro, testável).

// Texto lido → código numérico (EAN/UPC) ou alimento pronto (QR com JSON).
export function parseScan(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t);
      if (j && j.name && (j.kcal != null || j.p != null)) return { food: { name: j.name, kcal: num(j.kcal), p: num(j.p), c: num(j.c), f: num(j.f), fiber: num(j.fiber) ?? 0, sodium: num(j.sodium) ?? 0 } };
    } catch { /* não é JSON */ }
  }
  const digits = t.match(/(?:^|\D)(\d{8,14})(?:\D|$)/);
  if (digits) return { code: digits[1] };
  return null;
}
const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// Open Food Facts → valores por 100 g.
export function fromOpenFoodFacts(code, json) {
  const pr = json?.product;
  if (!pr || json.status === 0) return null;
  const n = pr.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n.energy_100g) != null ? Math.round(n.energy_100g / 4.184) : null);
  const name = [pr.product_name_pt || pr.product_name, pr.brands?.split(',')[0]].filter(Boolean).join(' — ');
  if (!name && kcal == null) return null;
  return {
    name: name || `Produto ${code}`,
    kcal: kcal != null ? Math.round(kcal) : null,
    p: round1(n.proteins_100g), c: round1(n.carbohydrates_100g), f: round1(n.fat_100g),
    fiber: round1(n.fiber_100g) ?? 0,
    sodium: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : 0,
    barcode: code,
    serving: num(pr.serving_quantity) || null,
  };
}
const round1 = (v) => (num(v) == null ? null : Math.round(Number(v) * 10) / 10);
