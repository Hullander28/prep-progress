/* Prep & Progress — nutrition and pacing math.
   Works in the browser and in Node tests. */
(function (root) {
  const LB_PER_KG = 2.2046226218;

  function round1(n) {
    return Math.round((Number(n) + Number.EPSILON) * 10) / 10;
  }
  function round0(n) {
    return Math.round(Number(n));
  }
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function lbToKg(lb) {
    return Number(lb) / LB_PER_KG;
  }
  function kgToLb(kg) {
    return Number(kg) * LB_PER_KG;
  }
  function inToCm(inches) {
    return Number(inches) * 2.54;
  }
  function cmToIn(cm) {
    return Number(cm) / 2.54;
  }

  const ACTIVITY = {
    sedentary: { factor: 1.2, label: "Sedentary", hint: "Mostly sitting, little formal exercise" },
    light: { factor: 1.375, label: "Light", hint: "Light walks or training 1–3 days a week" },
    moderate: { factor: 1.55, label: "Moderate", hint: "Exercise about 3–5 days a week" },
    active: { factor: 1.725, label: "Active", hint: "Hard training most days" },
    very_active: { factor: 1.9, label: "Very active", hint: "Physical job or twice-a-day training" },
  };

  function activityFactor(level) {
    return (ACTIVITY[level] || ACTIVITY.moderate).factor;
  }

  /**
   * Mifflin-St Jeor resting energy (kcal/day).
   * sex: 'male' | 'female' | 'other'
   * For 'other', the male and female results are averaged.
   */
  function bmr({ sex, age, weightKg, heightCm }) {
    const w = Number(weightKg);
    const h = Number(heightCm);
    const a = Number(age);
    const base = 10 * w + 6.25 * h - 5 * a;
    const male = base + 5;
    const female = base - 161;
    if (sex === "male") return male;
    if (sex === "female") return female;
    return (male + female) / 2;
  }

  function tdee(params) {
    return bmr(params) * activityFactor(params.activity);
  }

  function calorieFloor(sex) {
    if (sex === "male") return 1500;
    if (sex === "female") return 1200;
    return 1350;
  }

  /**
   * Default weekly change in pounds (signed).
   * About 0.5–1% of body weight, capped near 1 lb/week, never larger than the remaining distance.
   */
  function suggestedWeeklyLb(currentLb, goalLb) {
    const current = Number(currentLb);
    const goal = Number(goalLb);
    const rem = goal - current;
    if (!isFinite(current) || !isFinite(goal) || Math.abs(rem) < 0.25) return 0;
    const cap = Math.min(1, current * 0.01);
    const preferred = Math.min(cap, Math.max(current * 0.005, Math.min(1, current * 0.0075)));
    const weekly = Math.min(Math.abs(rem), Math.max(preferred, Math.min(0.5, Math.abs(rem))));
    return round1(weekly * Math.sign(rem));
  }

  function daysToGoal(currentLb, goalLb, weeklyLb) {
    const rem = Number(goalLb) - Number(currentLb);
    const w = Number(weeklyLb);
    if (w === 0 || Math.abs(rem) < 0.25) return 0;
    if (Math.sign(rem) !== Math.sign(w)) return null;
    return Math.ceil(Math.abs(rem) / Math.abs(w)) * 7;
  }

  /**
   * Build calorie and macro targets.
   * Optional overrides: calorieTarget, proteinG, carbsG, fatG, weeklyLb.
   */
  function computeTargets(profile) {
    const units = profile.units === "metric" ? "metric" : "us";
    const weightLb = units === "metric" ? kgToLb(profile.weight) : Number(profile.weight);
    const heightIn = units === "metric" ? cmToIn(profile.height) : Number(profile.height);
    const goalLb = units === "metric" ? kgToLb(profile.goalWeight) : Number(profile.goalWeight);
    const weightKg = lbToKg(weightLb);
    const heightCm = inToCm(heightIn);
    const sex = profile.sex || "other";
    const age = Number(profile.age);
    const activity = profile.activity || "moderate";

    const bmrKcal = bmr({ sex, age, weightKg, heightCm });
    const tdeeKcal = bmrKcal * activityFactor(activity);

    let weeklyLb = profile.weeklyLb;
    if (weeklyLb === undefined || weeklyLb === null || weeklyLb === "") {
      weeklyLb = suggestedWeeklyLb(weightLb, goalLb);
    } else {
      weeklyLb = Number(weeklyLb);
    }

    const rawCalorie = tdeeKcal + (weeklyLb * 3500) / 7;
    const floor = calorieFloor(sex);
    // A modest surplus cap (~1 lb/week) if someone enters an aggressive gain pace.
    const gainCap = tdeeKcal + 500;
    let calorieTarget = rawCalorie;
    let floored = false;
    let capped = false;
    if (calorieTarget < floor) {
      calorieTarget = floor;
      floored = true;
    }
    if (weeklyLb > 0 && calorieTarget > gainCap) {
      calorieTarget = gainCap;
      capped = true;
    }
    calorieTarget = round0(calorieTarget);

    const impliedWeekly = round1(((tdeeKcal - calorieTarget) * 7) / 3500) * -1;

    let proteinG, carbsG, fatG;
    if (profile.proteinG != null && profile.carbsG != null && profile.fatG != null && profile.manualMacros) {
      proteinG = round0(profile.proteinG);
      carbsG = round0(profile.carbsG);
      fatG = round0(profile.fatG);
    } else {
      const proteinCap = (calorieTarget * 0.4) / 4;
      proteinG = round0(Math.min(0.8 * weightLb, proteinCap));
      fatG = round0((calorieTarget * 0.25) / 9);
      const remaining = calorieTarget - proteinG * 4 - fatG * 9;
      carbsG = round0(Math.max(0, remaining / 4));
    }

    if (profile.calorieTarget != null && profile.manualCalories) {
      calorieTarget = round0(profile.calorieTarget);
    }

    const weeks = daysToGoal(weightLb, goalLb, floored ? impliedWeekly : weeklyLb);
    return {
      units,
      weightLb: round1(weightLb),
      goalLb: round1(goalLb),
      heightIn: round1(heightIn),
      weightKg: round1(weightKg),
      heightCm: round1(heightCm),
      bmr: round0(bmrKcal),
      tdee: round0(tdeeKcal),
      weeklyLb: round1(weeklyLb),
      impliedWeeklyLb: impliedWeekly,
      calorieTarget,
      proteinG,
      carbsG,
      fatG,
      floor,
      floored,
      capped,
      weeksToGoal: weeks,
      direction: weeklyLb === 0 ? "maintain" : weeklyLb < 0 ? "lose" : "gain",
    };
  }

  function macrosForGrams(food, grams) {
    const g = Number(grams) || 0;
    const scale = g / 100;
    return {
      kcal: (Number(food.kcal) || 0) * scale,
      protein: (Number(food.protein) || 0) * scale,
      carbs: (Number(food.carbs) || 0) * scale,
      fat: (Number(food.fat) || 0) * scale,
      grams: g,
    };
  }

  function sumMacros(items) {
    return items.reduce(
      (acc, it) => {
        acc.kcal += Number(it.kcal) || 0;
        acc.protein += Number(it.protein) || 0;
        acc.carbs += Number(it.carbs) || 0;
        acc.fat += Number(it.fat) || 0;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  function recipePerServing(ingredients, servings) {
    const total = sumMacros(ingredients);
    const n = Math.max(0.01, Number(servings) || 1);
    return {
      kcal: total.kcal / n,
      protein: total.protein / n,
      carbs: total.carbs / n,
      fat: total.fat / n,
    };
  }

  function sevenDayAverage(entries, asOfDate) {
    // entries: [{date:'YYYY-MM-DD', weight: number in profile units}]
    if (!entries || !entries.length) return null;
    const end = asOfDate ? new Date(asOfDate + "T12:00:00") : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startISO = toISODate(start);
    const endISO = toISODate(end);
    const inWindow = entries.filter((e) => e.date >= startISO && e.date <= endISO);
    if (!inWindow.length) return null;
    const sum = inWindow.reduce((s, e) => s + Number(e.weight), 0);
    return round1(sum / inWindow.length);
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function localISODate(d) {
    const dt = d ? new Date(d) : new Date();
    return toISODate(dt);
  }

  function addDaysISO(iso, days) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let i = 0;
    let inQ = false;
    const s = String(text).replace(/^\uFEFF/, "");
    while (i < s.length) {
      const ch = s[i];
      if (inQ) {
        if (ch === '"') {
          if (s[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        cell += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && s[i + 1] === "\n") i++;
        row.push(cell);
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
        cell = "";
        i++;
        continue;
      }
      cell += ch;
      i++;
    }
    if (cell !== "" || row.length) {
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
    }
    return rows;
  }

  const api = {
    LB_PER_KG,
    ACTIVITY,
    round1,
    round0,
    clamp,
    lbToKg,
    kgToLb,
    inToCm,
    cmToIn,
    activityFactor,
    bmr,
    tdee,
    calorieFloor,
    suggestedWeeklyLb,
    daysToGoal,
    computeTargets,
    macrosForGrams,
    sumMacros,
    recipePerServing,
    sevenDayAverage,
    toISODate,
    localISODate,
    addDaysISO,
    parseCSV,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
