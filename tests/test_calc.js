const C = require("../js/calc.js");
const assert = require("assert");

// Male, 35, 200 lb, 70 in, moderate, goal 180
const kg = 200 / C.LB_PER_KG;
const cm = 70 * 2.54;
const bmr = C.bmr({ sex: "male", age: 35, weightKg: kg, heightCm: cm });
assert.ok(Math.abs(bmr - 1848.43474) < 0.02, "BMR " + bmr);

const t = C.computeTargets({
  sex: "male",
  age: 35,
  units: "us",
  weight: 200,
  height: 70,
  goalWeight: 180,
  activity: "moderate",
});
assert.strictEqual(t.weeklyLb, -1, "pace " + t.weeklyLb);
assert.ok(Math.abs(t.tdee - 2865) <= 1, "TDEE " + t.tdee);
assert.ok(Math.abs(t.calorieTarget - 2365) <= 1, "calories should be TDEE-500, got " + t.calorieTarget);
assert.ok(t.proteinG === 160, "protein " + t.proteinG);
assert.ok(t.fatG >= 64 && t.fatG <= 67, "fat " + t.fatG);
assert.ok(t.carbsG >= 270 && t.carbsG <= 290, "carbs " + t.carbsG);
assert.strictEqual(t.floored, false);

// Floor: small female, aggressive loss
const t2 = C.computeTargets({
  sex: "female",
  age: 30,
  units: "us",
  weight: 130,
  height: 64,
  goalWeight: 110,
  activity: "sedentary",
  weeklyLb: -2,
});
assert.ok(t2.calorieTarget >= 1200, "floor " + t2.calorieTarget);
assert.ok(t2.floored, "should hit floor");

// Macros for grams
const m = C.macrosForGrams({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, 200);
assert.ok(Math.abs(m.kcal - 330) < 0.01);
assert.ok(Math.abs(m.protein - 62) < 0.01);

// 7-day average
const avg = C.sevenDayAverage(
  [
    { date: "2026-11-10", weight: 200 },
    { date: "2026-11-11", weight: 199 },
    { date: "2026-11-12", weight: 198 },
  ],
  "2026-11-12"
);
assert.strictEqual(avg, 199);

// CSV parse
const rows = C.parseCSV('name,serving_name,serving_grams,kcal\n"Chili, spicy",1 bowl,350,420\n');
assert.strictEqual(rows[1][0], "Chili, spicy");
assert.strictEqual(rows[1][2], "350");

// Recipe per serving
const per = C.recipePerServing(
  [
    { kcal: 400, protein: 40, carbs: 20, fat: 16 },
    { kcal: 200, protein: 8, carbs: 40, fat: 2 },
  ],
  4
);
assert.ok(Math.abs(per.kcal - 150) < 0.01);

console.log("calc tests passed", { bmr: Math.round(bmr), tdee: t.tdee, cal: t.calorieTarget, p: t.proteinG, c: t.carbsG, f: t.fatG });
