const fs = require("fs");
const path = require("path");
const assert = require("assert");
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/foods.json"), "utf8"));
assert.ok(data.meta && data.meta.count === data.foods.length, "count matches");
assert.ok(data.foods.length >= 7000, "thousands of foods, got " + data.foods.length);
const chicken = data.foods.filter((f) => /chicken/i.test(f[1]));
assert.ok(chicken.length > 20, "chicken search corpus " + chicken.length);
const rice = data.foods.find((f) => /rice, white, long-grain, regular, cooked/i.test(f[1]));
assert.ok(rice, "cooked white rice present");
assert.ok(Array.isArray(rice[6]) && rice[6].length, "portions present");
// no fabricated required keys
for (const f of data.foods) {
  assert.ok(typeof f[1] === "string" && f[1].length);
  assert.ok(typeof f[2] === "number");
  assert.ok(typeof f[3] === "number");
  assert.ok(typeof f[4] === "number");
  assert.ok(typeof f[5] === "number");
}
const size = fs.statSync(path.join(__dirname, "../data/foods.json")).size;
assert.ok(size < 4 * 1024 * 1024, "file size " + size);
console.log("food db tests passed", { count: data.foods.length, size, chicken: chicken.length });
