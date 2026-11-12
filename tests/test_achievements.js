const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const ctx = { console, module: { exports: {} }, exports: {} };
ctx.globalThis = ctx;
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(path.join(root, "js/calc.js"), "utf8"), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, "js/achievements.js"), "utf8"), ctx);
const C = ctx.PPCalc;
const A = ctx.PPAchievements;
assert.ok(A && C, "loaded");

const today = "2026-11-12";
function emptyDay() {
  return { breakfast: [], lunch: [], dinner: [], snack: [], note: "", hunger: "", mood: "", felt: "" };
}
function entry(i) {
  return { id: "e" + i, name: "Oats", grams: 100, kcal: 100, protein: 30, carbs: 20, fat: 2, meal: "breakfast" };
}

// Empty state: nothing unlocked
const empty = { profile: { age: 35, sex: "male", units: "us", weight: 200, height: 70, goalWeight: 180, activity: "moderate", startedOn: today }, logs: {}, weights: [], recipes: [], plan: null };
const snap0 = A.compute(empty, { today, targets: C.computeTargets(empty.profile) });
assert.strictEqual(snap0.badges.filter((b) => b.unlocked).length, 0, "no badges on empty");
assert.strictEqual(snap0.streaks.logging.current, 0);
assert.ok(snap0.xp === 0, "no xp " + snap0.xp);

// First log + note, no recipe
const d0 = emptyDay();
d0.breakfast = [entry(1)];
d0.note = "Felt good";
const s1 = {
  profile: empty.profile,
  logs: { [today]: d0 },
  weights: [{ date: today, weight: 200 }],
  recipes: [],
  plan: null,
};
const t = C.computeTargets(empty.profile);
const snap1 = A.compute(s1, { today, targets: t });
const ids1 = snap1.badges.filter((b) => b.unlocked).map((b) => b.id);
assert.ok(ids1.includes("first_log"), "first log " + ids1);
assert.ok(ids1.includes("journal_note"), "note");
assert.ok(!ids1.includes("first_recipe"));
assert.ok(!ids1.includes("foods_100"));
assert.ok(snap1.streaks.logging.current === 1);
assert.ok(snap1.xp > 0, "xp from log");

// 7-day logging streak ending today
const logs7 = {};
for (let i = 0; i < 7; i++) {
  const iso = C.addDaysISO(today, -i);
  const d = emptyDay();
  d.breakfast = [entry(i)];
  d.lunch = [entry("l" + i)];
  d.dinner = [entry("d" + i)];
  logs7[iso] = d;
}
const s7 = { profile: empty.profile, logs: logs7, weights: [], recipes: [{ id: "r1", name: "Chili", servings: 4, items: [{ kcal: 100, protein: 10, carbs: 10, fat: 2, grams: 100, name: "x" }], createdOn: today }], plan: null };
const snap7 = A.compute(s7, { today, targets: t });
const ids7 = snap7.badges.filter((b) => b.unlocked).map((b) => b.id);
assert.ok(ids7.includes("streak_7"), "7 streak " + ids7 + " best " + snap7.streaks.logging.best);
assert.ok(!ids7.includes("streak_30"));
assert.ok(ids7.includes("first_recipe"));
assert.strictEqual(snap7.streaks.logging.current, 7);

// Historical unlocks should not celebrate
const syncHist = A.sync(s1, { today: "2026-12-01", targets: t });
assert.strictEqual(syncHist.justUnlocked.length, 0, "no celebrate for past dates " + JSON.stringify(syncHist.justUnlocked));
assert.ok(syncHist.achievements.unlocked.first_log);

// New unlock today does celebrate
const syncNew = A.sync(s1, { today, targets: t });
assert.ok(syncNew.justUnlocked.find((b) => b.id === "first_log"), "celebrate today");
// Second sync should not re-celebrate
s1.achievements = syncNew.achievements;
const sync2 = A.sync(s1, { today, targets: t });
assert.strictEqual(sync2.justUnlocked.length, 0, "no re-toast");

// Too-fast weight drop should NOT unlock progress badges
const crash = {
  profile: { age: 35, sex: "male", units: "us", weight: 200, height: 70, goalWeight: 160, activity: "moderate", startedOn: today },
  logs: {},
  weights: [
    { date: today, weight: 200 },
    { date: C.addDaysISO(today, 7), weight: 180 }, // 20 lb in 1 week = 10% — too fast
  ],
  recipes: [],
  plan: null,
};
const later = C.addDaysISO(today, 7);
const snapFast = A.compute(crash, { today: later, targets: C.computeTargets(crash.profile) });
const fastIds = snapFast.badges.filter((b) => b.unlocked).map((b) => b.id);
assert.ok(!fastIds.includes("progress_1"), "no reward too-fast 1% " + fastIds);
assert.ok(!fastIds.includes("progress_10"), "no reward too-fast 10%");
assert.ok(!fastIds.includes("goal_reached"));
// progress bar may still show raw progress in locked state
const p10 = snapFast.badges.find((b) => b.id === "progress_10");
assert.ok(p10 && !p10.unlocked);

// Slow, safe 10% should unlock
const safe = {
  profile: { age: 35, sex: "male", units: "us", weight: 200, height: 70, goalWeight: 180, activity: "moderate", startedOn: "2026-06-01" },
  logs: {},
  weights: [
    { date: "2026-06-01", weight: 200 },
    { date: today, weight: 198 }, // 2 lb of 20 = 10% over ~23 weeks — very safe
  ],
  recipes: [],
  plan: null,
};
const snapSafe = A.compute(safe, { today, targets: C.computeTargets(safe.profile) });
const safeIds = snapSafe.badges.filter((b) => b.unlocked).map((b) => b.id);
assert.ok(safeIds.includes("progress_1"), "safe 1% " + safeIds);
assert.ok(safeIds.includes("progress_10"), "safe 10%");
assert.ok(!safeIds.includes("halfway"));

// Too-fast plan does not award weekly milestone hits
const planFast = {
  profile: empty.profile,
  logs: {},
  weights: [
    { date: "2026-10-01", weight: 200 },
    { date: "2026-10-08", weight: 196 },
  ],
  recipes: [],
  plan: {
    weeklyLb: -4, // 2% / week, too fast
    weeks: [{ start: "2026-10-01", startWeight: 200, targetWeight: 196, checks: {} }],
  },
};
const snapPF = A.compute(planFast, { today, targets: t });
assert.ok(!snapPF.badges.find((b) => b.id === "first_week").unlocked, "no week award for too-fast plan");

// Gentle plan week hit
const planOk = {
  profile: empty.profile,
  logs: {},
  weights: [
    { date: "2026-10-01", weight: 200 },
    { date: "2026-10-08", weight: 199 },
  ],
  recipes: [],
  plan: {
    weeklyLb: -1,
    weeks: [{ start: "2026-10-01", startWeight: 200, targetWeight: 199, checks: {} }],
  },
};
const snapPO = A.compute(planOk, { today, targets: t });
assert.ok(snapPO.badges.find((b) => b.id === "first_week").unlocked, "week hit at gentle pace");

// Metric weights work for progress
const met = {
  profile: { age: 35, sex: "male", units: "metric", weight: 90, height: 178, goalWeight: 80, activity: "moderate", startedOn: "2026-06-01" },
  logs: {},
  weights: [
    { date: "2026-06-01", weight: 90 },
    { date: today, weight: 89 }, // ~1.1 kg of 10 kg = 11%
  ],
  recipes: [],
  plan: null,
};
const snapM = A.compute(met, { today, targets: C.computeTargets(met.profile) });
assert.ok(snapM.badges.find((b) => b.id === "progress_10").unlocked, "metric 10%");

// Goal = current: maintain, no goal badges
const same = {
  profile: { age: 35, sex: "male", units: "us", weight: 180, height: 70, goalWeight: 180, activity: "moderate", startedOn: today },
  logs: {},
  weights: [{ date: today, weight: 180 }],
  recipes: [],
  plan: null,
};
const snapS = A.compute(same, { today, targets: C.computeTargets(same.profile) });
assert.ok(!snapS.badges.find((b) => b.id === "goal_reached").unlocked, "maintain is not a goal award");
assert.ok(!snapS.badges.find((b) => b.id === "progress_1").unlocked);

// Level from XP
const lv = A.levelFromXp(0);
assert.strictEqual(lv.level, 1);
assert.ok(A.levelFromXp(100).level >= 2);
assert.ok(A.levelFromXp(5000).level >= 10);

// Backup-like recompute is deterministic
const a = A.compute(s7, { today, targets: t });
const b = A.compute(s7, { today, targets: t });
assert.strictEqual(a.xp, b.xp);
assert.deepStrictEqual(
  a.badges.map((x) => x.id + x.unlocked),
  b.badges.map((x) => x.id + x.unlocked)
);

console.log("achievement tests passed", { xp: snap7.xp, level: snap7.level, badges: ids7.length });
