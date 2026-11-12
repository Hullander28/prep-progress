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

// --- Pace / intensity ---
const C2 = C;
const loss16 = C.weeklyFromWeeks(200, 180, 16);
// 20 lb / 16 wk = 1.25 lb/wk, rounded to 1 decimal (-1.2 or -1.3)
assert.ok(Math.abs(Math.abs(loss16) - 1.25) < 0.06, "16 weeks 20 lb " + loss16);
const pct16 = C.pctBodyPerWeek(200, loss16);
assert.ok(pct16 >= 0.6 && pct16 < 0.7, "pct " + pct16);
assert.strictEqual(C.intensityFromWeekly(200, loss16, "lose"), "moderate");

assert.strictEqual(C.intensityFromWeekly(200, -1, "lose"), "gentle"); // 0.5%
assert.strictEqual(C.intensityFromWeekly(200, -1.2, "lose"), "moderate"); // 0.6%
assert.strictEqual(C.intensityFromWeekly(200, -1.8, "lose"), "aggressive"); // 0.9%
assert.strictEqual(C.intensityFromWeekly(200, -2.2, "lose"), "too_fast"); // 1.1%

assert.strictEqual(C.intensityFromWeekly(200, 0.4, "gain"), "gentle"); // 0.2%
assert.strictEqual(C.intensityFromWeekly(200, 0.6, "gain"), "moderate"); // 0.3%
assert.strictEqual(C.intensityFromWeekly(200, 0.9, "gain"), "aggressive"); // 0.45%
assert.strictEqual(C.intensityFromWeekly(200, 1.2, "gain"), "too_fast"); // 0.6%

assert.strictEqual(C.directionOf(200, 200), "maintain");
assert.strictEqual(C.weeklyFromWeeks(200, 200, 12), 0);
assert.strictEqual(C.intensityFromWeekly(200, 0, "maintain"), "maintain");

const gent = C.weeklyFromIntensity(200, 180, "gentle");
assert.ok(Math.abs(Math.abs(gent) - 1) < 0.05, "gentle lose ~1 lb " + gent);
const weeksG = C.weeksFromWeekly(200, 180, gent);
assert.ok(weeksG >= 16 && weeksG <= 24, "gentle weeks " + weeksG);

const rec = C.earliestSafeWeeks(200, 160, 2865, 1500);
// 40 lb at max 1% of 200 = 2 lb/wk => 20 weeks; floor allows (2865-1500)*7/3500=2.73, so 1% cap = 2 lb, 20 weeks
assert.strictEqual(rec, 20, "safe weeks " + rec);

// Floor makes a short frame too fast
const aggressiveShort = C.computeTargets({
  sex: "female", age: 30, units: "us", weight: 140, height: 64,
  goalWeight: 110, activity: "sedentary", goalWeeks: 8, paceMode: "timeframe",
});
assert.ok(aggressiveShort.intensity === "too_fast" || aggressiveShort.floored, "short frame should be flagged " + aggressiveShort.intensity + " cal " + aggressiveShort.calorieTarget);
assert.ok(aggressiveShort.safeWeeks > 8, "safe weeks " + aggressiveShort.safeWeeks);
assert.ok(aggressiveShort.calorieTarget >= 1200);

// Metric weekly from weeks
const met = C.computeTargets({
  sex: "male", age: 35, units: "metric",
  weight: C.round1(C.lbToKg(200)), height: C.round1(C.inToCm(70)),
  goalWeight: C.round1(C.lbToKg(180)), activity: "moderate",
  goalWeeks: 20, paceMode: "timeframe",
});
assert.ok(met.valid);
assert.ok(Math.abs(met.weeklyLb - -1) < 0.05, "metric 20w " + met.weeklyLb);

// Validation
assert.ok(C.validateStats({ age: 12, weight: 200, height: 70, units: "us" }));
assert.ok(!C.validateStats({ age: 35, weight: 200, height: 70, goalWeight: 180, units: "us" }));
assert.ok(C.validateStats({ age: 35, weight: 10, height: 70, units: "us" }));
assert.ok(C.validateStats({ age: 35, weight: 80, height: 50, units: "metric" })); // 80 kg is ok actually
assert.ok(!C.validateStats({ age: 35, weight: 80, height: 175, goalWeight: 75, units: "metric" }));

// Month overflow: Jan 31 + 1 month => Feb 28/29, not March
const feb = C.addMonthsISO("2026-01-31", 1);
assert.ok(feb.startsWith("2026-02-"), "jan31+1mo " + feb);
const dec = C.addMonthsISO("2026-12-15", 1);
assert.strictEqual(dec, "2027-01-15");

// Recipe zero servings
const bad = C.recipePerServing([{ kcal: 400, protein: 10, carbs: 10, fat: 10 }], 0);
assert.ok(bad.invalid);

console.log("pace/validation tests passed");
