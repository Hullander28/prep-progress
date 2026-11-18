const assert = require("assert");
const R = require("../js/recents.js");

const state = {
  logs: {
    "2026-11-16": {
      breakfast: [{ id: "a", foodId: "f1", name: "Oats", grams: 40, portionName: "1/2 cup", kcal: 150, protein: 5, carbs: 27, fat: 3, loggedAt: "2026-11-16T12:00:00.000Z" }],
      lunch: [{ id: "b", foodId: "r1", name: "McDONALD'S, BIG MAC", grams: 219, kcal: 563, protein: 26, carbs: 44, fat: 33, loggedAt: "2026-11-16T17:00:00.000Z" }],
      dinner: [], snack: [],
    },
    "2026-11-17": {
      breakfast: [{ id: "c", foodId: "f1", name: "Oats", grams: 80, portionName: "1 cup", kcal: 300, protein: 10, carbs: 54, fat: 6, loggedAt: "2026-11-17T12:00:00.000Z" }],
      lunch: [], dinner: [{ id: "d", kind: "recipe", recipeId: "rc1", name: "Chili", servings: 2, portionName: "2 servings", kcal: 800, protein: 60, carbs: 70, fat: 30, time: "19:00" }],
      snack: [{ id: "e", foodId: "off:123", name: "Protein Bar", grams: 60, kcal: 210, protein: 20, carbs: 22, fat: 7, loggedAt: "2026-11-17T21:00:00.000Z" },
              { id: "g", name: "Mystery snack", grams: 50, kcal: 100, protein: 1, carbs: 20, fat: 2 }],
    },
  },
};

let list = R.compute(state, { limit: 20 });
const keys = list.map((r) => r.key);
assert.deepStrictEqual(keys, ["food:off:123", "recipe:rc1", "food:f1", "name:mystery snack", "food:r1"], keys.join());
const oats = list.find((r) => r.key === "food:f1");
assert.strictEqual(oats.grams, 80, "keeps most recent portion");
assert.strictEqual(oats.portionName, "1 cup");
assert.strictEqual(oats.meal, "breakfast");
assert.strictEqual(list.find((r) => r.key === "recipe:rc1").kind, "recipe");
assert.strictEqual(R.compute(state, { limit: 2 }).length, 2);

// Filter
assert.deepStrictEqual(R.filter(list, "big mac").map((r) => r.key), ["food:r1"]);

// Hide then re-log brings it back
R.hide(state, "food:f1", "2026-11-18T00:00:00.000Z");
assert.ok(!R.compute(state).some((r) => r.key === "food:f1"), "hidden");
state.logs["2026-11-18"] = { breakfast: [{ id: "h", foodId: "f1", name: "Oats", grams: 40, kcal: 150, loggedAt: "2026-11-18T13:00:00.000Z" }], lunch: [], dinner: [], snack: [] };
list = R.compute(state);
assert.strictEqual(list[0].key, "food:f1", "re-logged food returns to top");

// Clone
const c = R.cloneForRelog(list[0].entry, () => "new", "08:00", "2026-11-18T14:00:00.000Z");
assert.strictEqual(c.id, "new");
assert.strictEqual(c.grams, 40);
assert.strictEqual(c.note, "");
assert.notStrictEqual(c, list[0].entry);

// Empty / bad state
assert.deepStrictEqual(R.compute({}), []);
assert.deepStrictEqual(R.compute({ logs: { x: { breakfast: [null, {}] } } }), []);
console.log("recents tests passed", { count: list.length });
