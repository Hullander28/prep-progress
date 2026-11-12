const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const root = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(root, "js/catalog.js"), "utf8");
const sandbox = { console, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const C = sandbox.PPCatalog;
assert.ok(C, "PPCatalog loads");

assert.strictEqual(C.classifyKind("McDONALD'S, Big Mac"), "restaurant");
assert.strictEqual(C.classifyKind("BURGER KING, WHOPPER, with cheese"), "restaurant");
assert.strictEqual(C.classifyKind("Fast foods, cheeseburger, large"), "restaurant");
assert.strictEqual(C.classifyKind("Restaurant, Latino, tamale"), "restaurant");
assert.strictEqual(C.classifyKind("Chicken breast, raw"), "basic");
assert.strictEqual(C.classifyKind("Chickpeas (garbanzo beans, bengal gram), raw"), "basic");
assert.strictEqual(C.classifyKind("Chobani Greek Yogurt", "CHOBANI", "grocery"), "grocery");

const grocery = JSON.parse(fs.readFileSync(path.join(root, "data/grocery.json"), "utf8"));
assert.ok(grocery.meta && grocery.meta.source.includes("Branded"));
assert.strictEqual(grocery.meta.count, grocery.foods.length);
assert.ok(grocery.foods.length >= 5000, "grocery count " + grocery.foods.length);
assert.ok(grocery.foods.length <= 15000, "grocery should stay compact, got " + grocery.foods.length);
const gsize = fs.statSync(path.join(root, "data/grocery.json")).size;
assert.ok(gsize < 3 * 1024 * 1024, "grocery file size " + gsize);

let chobani = 0;
for (const row of grocery.foods) {
  assert.ok(typeof row[1] === "string" && row[1].length);
  assert.ok(typeof row[2] === "number" && row[2] >= 0 && row[2] <= 900);
  assert.ok([row[3], row[4], row[5]].every((n) => typeof n === "number" && n >= 0 && n <= 100));
  assert.strictEqual(row[8], "grocery");
  assert.strictEqual(row[9], "usda-branded");
  if (/chobani/i.test((row[7] || "") + " " + row[1])) chobani++;
}
assert.ok(chobani > 0, "Chobani grocery items present");

const restaurants = JSON.parse(fs.readFileSync(path.join(root, "data/restaurants.json"), "utf8"));
assert.ok(restaurants.meta && /FNDDS/i.test(restaurants.meta.source));
assert.strictEqual(restaurants.meta.count, restaurants.foods.length);
assert.ok(restaurants.foods.length >= 50, "fndds restaurant count " + restaurants.foods.length);
for (const row of restaurants.foods) {
  assert.strictEqual(row[8], "restaurant");
  assert.strictEqual(row[9], "usda-fndds");
  assert.ok(typeof row[2] === "number");
}
assert.ok(
  restaurants.foods.some((r) => /mcdonald/i.test(r[1]) || /burger king/i.test(r[1])),
  "FNDDS includes a named chain item"
);

const basics = JSON.parse(fs.readFileSync(path.join(root, "data/foods.json"), "utf8"));
const all = C.unpack(basics, { source: "usda-sr" }).concat(
  C.unpack(restaurants, { kind: "restaurant", source: "usda-fndds" }),
  C.unpack(grocery, { kind: "grocery", source: "usda-branded" })
);
const mcd = all.filter((f) => /mcdonald/i.test(C.haystack(f)));
assert.ok(mcd.length >= 20, "McDonald's items " + mcd.length);
assert.ok(mcd.every((f) => f.kind === "restaurant"), "McDonald's classified as restaurant");

const restOnly = C.search(all, "whopper", { kind: "restaurant", limit: 10 });
assert.ok(restOnly.length, "whopper in restaurants");
assert.ok(restOnly.every((f) => f.kind === "restaurant"));
const groceryHits = C.search(all, "chobani", { kind: "grocery", limit: 10 });
assert.ok(groceryHits.length, "chobani grocery search");
assert.ok(groceryHits.every((f) => f.kind === "grocery"));
const basicHits = C.search(all, "banana", { kind: "basic", limit: 10 });
assert.ok(basicHits.some((f) => /banana/i.test(f.name)));
assert.ok(basicHits.every((f) => f.kind === "basic"));

const branded = C.unpackRow([
  "b1",
  "Greek Yogurt Plain",
  59,
  10,
  3.3,
  0.7,
  [["1 container (150 g)", 150]],
  "CHOBANI",
  "grocery",
  "usda-branded",
  "894700010000",
]);
const serve = C.servingMacros(branded);
assert.ok(Math.abs(serve.grams - 150) < 0.01);
assert.ok(serve.kcal === Math.round(59 * 1.5));
assert.strictEqual(C.lookupBarcodeLocal([branded], "894700010000").id, "b1");
assert.ok(C.uniqueCodes("012345678905").includes("012345678905"));

const offOk = C.fromOpenFoodFacts({
  code: "1234567890123",
  product_name: "Test Yogurt",
  brands: "Example Brand",
  nutriments: { "energy-kcal_100g": 80, proteins_100g: 6, carbohydrates_100g: 8, fat_100g: 2 },
  serving_quantity: 150,
  serving_size: "150 g",
});
assert.ok(offOk && offOk.kcal === 80 && offOk.brand === "Example Brand");
assert.ok(offOk.portions[0].grams === 150);
assert.strictEqual(offOk.source, "openfoodfacts");
assert.strictEqual(offOk.kind, "grocery");

const offMissing = C.fromOpenFoodFacts({
  code: "1",
  product_name: "Incomplete",
  nutriments: { "energy-kcal_100g": 100 },
});
assert.strictEqual(offMissing, null, "incomplete OFF product rejected");

const offRest = C.fromOpenFoodFacts({
  code: "2",
  product_name: "Fries",
  brands: "McDonald's",
  categories_tags: ["en:fast-foods"],
  nutriments: { "energy-kcal_100g": 300, proteins_100g: 3, carbohydrates_100g: 40, fat_100g: 15 },
});
assert.strictEqual(offRest.kind, "restaurant");

console.log("catalog tests passed", {
  grocery: grocery.foods.length,
  groceryBytes: gsize,
  restaurants: restaurants.foods.length,
  mcdonalds: mcd.length,
  total: all.length,
});
