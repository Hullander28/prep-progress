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

  const WEEK_CHIPS = [8, 12, 16, 24, 36, 52];

  // Fraction of body weight per week when the user picks an intensity.
  const INTENSITY_RATE = {
    lose: { gentle: 0.005, moderate: 0.0065, aggressive: 0.009 },
    gain: { gentle: 0.0025, moderate: 0.00375, aggressive: 0.005 },
  };

  const INTENSITY_META = {
    maintain: {
      id: "maintain",
      label: "Maintain",
      hint: "You're already at your target. We'll keep daily habits steady.",
    },
    gentle: {
      id: "gentle",
      label: "Gentle",
      hint: "A comfortable pace most people can stick with.",
    },
    moderate: {
      id: "moderate",
      label: "Moderate",
      hint: "A solid, sustainable push without rushing.",
    },
    aggressive: {
      id: "aggressive",
      label: "Aggressive",
      hint: "A faster plan. You'll want tighter habits and enough protein.",
    },
    too_fast: {
      id: "too_fast",
      label: "Too fast",
      hint: "This pace isn't recommended. We can stretch the date so it's safer.",
    },
  };

  function finiteNumber(n) {
    const v = Number(n);
    return isFinite(v) ? v : NaN;
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
    if (!isFinite(w) || !isFinite(rem) || Math.sign(rem) !== Math.sign(w)) return null;
    return Math.ceil(Math.abs(rem) / Math.abs(w)) * 7;
  }

  function isISODate(iso) {
    return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
  }

  function weeksBetween(fromISO, toISO) {
    if (!isISODate(fromISO) || !isISODate(toISO)) return 0;
    const a = new Date(fromISO + "T12:00:00");
    const b = new Date(toISO + "T12:00:00");
    if (!isFinite(a.getTime()) || !isFinite(b.getTime())) return 0;
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return Math.max(0, days / 7);
  }

  function addMonthsISO(iso, months) {
    const d = new Date(iso + "T12:00:00");
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + Number(months));
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return toISODate(d);
  }

  function dateFromWeeks(fromISO, weeks) {
    return addDaysISO(fromISO || localISODate(), Math.round(Number(weeks) * 7));
  }

  function directionOf(currentLb, goalLb) {
    const rem = Number(goalLb) - Number(currentLb);
    if (!isFinite(rem) || Math.abs(rem) < 0.25) return "maintain";
    return rem < 0 ? "lose" : "gain";
  }

  function pctBodyPerWeek(currentLb, weeklyLb) {
    const c = Number(currentLb);
    const w = Math.abs(Number(weeklyLb));
    if (!isFinite(c) || c <= 0 || !isFinite(w)) return 0;
    return (w / c) * 100;
  }

  /**
   * Classify a weekly pound change. Loss uses 0.5 / 0.75 / 1.0% of body weight;
   * gain uses tighter 0.25 / 0.375 / 0.5% bands.
   */
  function intensityFromWeekly(currentLb, weeklyLb, direction) {
    if (direction === "maintain" || !weeklyLb) return "maintain";
    const pct = pctBodyPerWeek(currentLb, weeklyLb);
    if (direction === "gain") {
      if (pct <= 0.25) return "gentle";
      if (pct <= 0.375) return "moderate";
      if (pct <= 0.5) return "aggressive";
      return "too_fast";
    }
    if (pct <= 0.5) return "gentle";
    if (pct <= 0.75) return "moderate";
    if (pct <= 1.0) return "aggressive";
    return "too_fast";
  }

  function weeklyFromIntensity(currentLb, goalLb, intensity) {
    const dir = directionOf(currentLb, goalLb);
    if (dir === "maintain") return 0;
    const rates = INTENSITY_RATE[dir];
    const frac = rates[intensity] || rates.moderate;
    const rem = Number(goalLb) - Number(currentLb);
    const weekly = Number(currentLb) * frac;
    return round1(Math.min(Math.abs(rem), weekly) * Math.sign(rem));
  }

  function weeksFromWeekly(currentLb, goalLb, weeklyLb) {
    const rem = Math.abs(Number(goalLb) - Number(currentLb));
    const w = Math.abs(Number(weeklyLb));
    if (!isFinite(rem) || rem < 0.25 || !isFinite(w) || w <= 0) return 0;
    return Math.max(1, Math.ceil(rem / w));
  }

  function weeklyFromWeeks(currentLb, goalLb, weeks) {
    const rem = Number(goalLb) - Number(currentLb);
    const wks = Number(weeks);
    if (!isFinite(rem) || Math.abs(rem) < 0.25) return 0;
    if (!isFinite(wks) || wks <= 0) return suggestedWeeklyLb(currentLb, goalLb);
    return round1(rem / wks);
  }

  /**
   * Fastest recommended weekly change (lb, unsigned).
   * Loss: 1% of body weight, also limited by the calorie floor.
   * Gain: 0.5% of body weight, also limited by a ~500 kcal/day surplus.
   */
  function maxSafeWeeklyLb(currentLb, direction, tdeeKcal, floor) {
    const current = Number(currentLb);
    if (!isFinite(current) || current <= 0) return 0;
    if (direction === "gain") {
      const fromCals = 500 * 7 / 3500; // 1 lb
      return round1(Math.min(current * 0.005, fromCals));
    }
    const fromFloor = isFinite(tdeeKcal) && isFinite(floor) ? ((tdeeKcal - floor) * 7) / 3500 : current * 0.01;
    return round1(Math.max(0, Math.min(current * 0.01, fromFloor)));
  }

  function earliestSafeWeeks(currentLb, goalLb, tdeeKcal, floor) {
    const rem = Math.abs(Number(goalLb) - Number(currentLb));
    const dir = directionOf(currentLb, goalLb);
    if (dir === "maintain") return 0;
    const maxW = maxSafeWeeklyLb(currentLb, dir, tdeeKcal, floor);
    if (!isFinite(maxW) || maxW <= 0) return null;
    return Math.max(1, Math.ceil(rem / maxW));
  }

  function validateStats({ age, weight, height, goalWeight, units }) {
    const metric = units === "metric";
    const ageN = Number(age);
    if (!isFinite(ageN) || ageN < 13 || ageN > 100) return "Please enter an age between 13 and 100.";
    const w = Number(weight);
    const h = Number(height);
    if (metric) {
      if (!isFinite(w) || w < 25 || w > 350) return "Please enter a current weight between 25 and 350 kg.";
      if (!isFinite(h) || h < 120 || h > 230) return "Please enter a height between 120 and 230 cm.";
    } else {
      if (!isFinite(w) || w < 55 || w > 770) return "Please enter a current weight between 55 and 770 lb.";
      if (!isFinite(h) || h < 48 || h > 90) return "Please enter a height between 48 and 90 inches.";
    }
    if (goalWeight === undefined || goalWeight === null || goalWeight === "") return null;
    const g = Number(goalWeight);
    if (metric) {
      if (!isFinite(g) || g < 25 || g > 350) return "Please enter a goal weight between 25 and 350 kg.";
    } else if (!isFinite(g) || g < 55 || g > 770) {
      return "Please enter a goal weight between 55 and 770 lb.";
    }
    return null;
  }

  /**
   * Build calorie and macro targets.
   * Optional: weeklyLb, goalWeeks, goalDate, paceMode ('weekly'|'timeframe'|'intensity'),
   * calorieTarget, proteinG, carbsG, fatG, asOf (YYYY-MM-DD).
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
    const asOf = profile.asOf || localISODate();
    const dir = directionOf(weightLb, goalLb);

    const validInputs = isFinite(weightLb) && isFinite(heightIn) && isFinite(age) && isFinite(goalLb);
    const bmrKcal = validInputs ? bmr({ sex, age, weightKg, heightCm }) : NaN;
    const tdeeKcal = validInputs ? bmrKcal * activityFactor(activity) : NaN;
    const floor = calorieFloor(sex);

    let weeklyLb;
    let goalWeeks = profile.goalWeeks != null && profile.goalWeeks !== "" ? Number(profile.goalWeeks) : null;
    if (goalWeeks != null && (!isFinite(goalWeeks) || goalWeeks <= 0)) goalWeeks = null;

    if (profile.goalDate && (profile.paceMode === "timeframe" || profile.paceMode === "date") && !goalWeeks) {
      const wks = weeksBetween(asOf, profile.goalDate);
      if (wks > 0) goalWeeks = Math.max(1, Math.round(wks * 10) / 10);
    }

    if (profile.paceMode === "intensity" && profile.intensity && profile.intensity !== "too_fast" && profile.intensity !== "maintain") {
      weeklyLb = weeklyFromIntensity(weightLb, goalLb, profile.intensity);
      goalWeeks = weeksFromWeekly(weightLb, goalLb, weeklyLb) || goalWeeks;
    } else if (goalWeeks && (profile.paceMode === "timeframe" || profile.paceMode === "date" || profile.weeklyLb == null || profile.weeklyLb === "")) {
      weeklyLb = weeklyFromWeeks(weightLb, goalLb, goalWeeks);
    } else if (profile.weeklyLb === undefined || profile.weeklyLb === null || profile.weeklyLb === "") {
      weeklyLb = suggestedWeeklyLb(weightLb, goalLb);
      if (!goalWeeks) goalWeeks = weeksFromWeekly(weightLb, goalLb, weeklyLb) || 0;
    } else {
      weeklyLb = Number(profile.weeklyLb);
      if (!isFinite(weeklyLb)) weeklyLb = suggestedWeeklyLb(weightLb, goalLb);
      if (!goalWeeks) goalWeeks = weeksFromWeekly(weightLb, goalLb, weeklyLb) || 0;
    }

    if (dir === "maintain") {
      weeklyLb = 0;
      goalWeeks = 0;
    }

    const rawCalorie = tdeeKcal + (weeklyLb * 3500) / 7;
    const gainCap = tdeeKcal + 500;
    let calorieTarget = rawCalorie;
    let floored = false;
    let capped = false;
    if (isFinite(calorieTarget) && calorieTarget < floor) {
      calorieTarget = floor;
      floored = true;
    }
    if (weeklyLb > 0 && isFinite(calorieTarget) && calorieTarget > gainCap) {
      calorieTarget = gainCap;
      capped = true;
    }
    calorieTarget = isFinite(calorieTarget) ? round0(calorieTarget) : 0;

    const impliedWeekly = isFinite(tdeeKcal) ? round1(((tdeeKcal - calorieTarget) * 7) / 3500) * -1 : 0;

    let intensity = intensityFromWeekly(weightLb, weeklyLb, dir);
    let tooFastReason = "";
    if (dir === "lose" && floored && Math.abs(weeklyLb) > Math.abs(impliedWeekly) + 0.05) {
      intensity = "too_fast";
      tooFastReason = "floor";
    }
    if (dir === "gain" && capped && Math.abs(weeklyLb) > Math.abs(impliedWeekly) + 0.05) {
      intensity = "too_fast";
      tooFastReason = tooFastReason || "surplus";
    }
    if (intensity === "too_fast" && !tooFastReason) tooFastReason = "pace";

    const safeWeeks = earliestSafeWeeks(weightLb, goalLb, tdeeKcal, floor);
    const safeWeekly = dir === "maintain" ? 0 : (safeWeeks ? weeklyFromWeeks(weightLb, goalLb, safeWeeks) : weeklyFromIntensity(weightLb, goalLb, dir === "gain" ? "aggressive" : "aggressive"));
    const safeDate = safeWeeks ? dateFromWeeks(asOf, safeWeeks) : null;
    const goalDate = goalWeeks ? dateFromWeeks(asOf, goalWeeks) : profile.goalDate || null;

    let proteinG, carbsG, fatG;
    if (profile.proteinG != null && profile.carbsG != null && profile.fatG != null && profile.manualMacros) {
      proteinG = round0(profile.proteinG);
      carbsG = round0(profile.carbsG);
      fatG = round0(profile.fatG);
    } else {
      const proteinMult = intensity === "aggressive" || intensity === "too_fast" ? 1.0 : 0.8;
      const proteinCap = (calorieTarget * 0.4) / 4;
      proteinG = round0(Math.min(proteinMult * weightLb, proteinCap));
      fatG = round0((calorieTarget * 0.25) / 9);
      const remaining = calorieTarget - proteinG * 4 - fatG * 9;
      carbsG = round0(Math.max(0, remaining / 4));
    }

    if (profile.calorieTarget != null && profile.manualCalories) {
      calorieTarget = round0(profile.calorieTarget);
    }

    const weeksToGoal = daysToGoal(weightLb, goalLb, floored || capped ? impliedWeekly : weeklyLb);
    const pct = pctBodyPerWeek(weightLb, weeklyLb);
    const calorieDelta = isFinite(tdeeKcal) ? calorieTarget - round0(tdeeKcal) : 0;
    const meta = INTENSITY_META[intensity] || INTENSITY_META.moderate;

    return {
      valid: validInputs && isFinite(calorieTarget),
      units,
      weightLb: round1(weightLb),
      goalLb: round1(goalLb),
      heightIn: round1(heightIn),
      weightKg: round1(weightKg),
      heightCm: round1(heightCm),
      bmr: isFinite(bmrKcal) ? round0(bmrKcal) : 0,
      tdee: isFinite(tdeeKcal) ? round0(tdeeKcal) : 0,
      weeklyLb: round1(weeklyLb),
      impliedWeeklyLb: impliedWeekly,
      calorieTarget,
      calorieDelta: round0(calorieDelta),
      proteinG,
      carbsG,
      fatG,
      floor,
      floored,
      capped,
      weeksToGoal: weeksToGoal,
      goalWeeks: goalWeeks || 0,
      goalDate: goalDate,
      intensity,
      intensityLabel: meta.label,
      intensityHint: meta.hint,
      tooFastReason,
      pctPerWeek: round1(pct),
      safeWeeks,
      safeWeeklyLb: safeWeekly,
      safeDate,
      direction: dir,
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
    const n = Number(servings);
    if (!isFinite(n) || n <= 0) {
      return { kcal: 0, protein: 0, carbs: 0, fat: 0, invalid: true };
    }
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
    WEEK_CHIPS,
    INTENSITY_RATE,
    INTENSITY_META,
    finiteNumber,
    suggestedWeeklyLb,
    daysToGoal,
    isISODate,
    weeksBetween,
    addMonthsISO,
    dateFromWeeks,
    directionOf,
    pctBodyPerWeek,
    intensityFromWeekly,
    weeklyFromIntensity,
    weeksFromWeekly,
    weeklyFromWeeks,
    maxSafeWeeklyLb,
    earliestSafeWeeks,
    validateStats,
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
