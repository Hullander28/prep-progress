/* Prep & Progress — streaks, badges, and XP from existing journal data. */
(function (root) {
  const C = root.PPCalc;

  const BADGES = [
    { id: "first_log", name: "First bite", detail: "Log your first food.", cat: "journal", icon: "fork" },
    { id: "first_recipe", name: "Meal prepped", detail: "Save your first recipe.", cat: "prep", icon: "bowl" },
    { id: "journal_note", name: "Noted", detail: "Write a journal note about your day.", cat: "journal", icon: "note" },
    { id: "journal_notes_7", name: "Reflective week", detail: "Write 7 journal notes.", cat: "journal", icon: "note" },
    { id: "foods_100", name: "Century plate", detail: "Log 100 foods over time.", cat: "journal", icon: "fork" },
    { id: "streak_7", name: "Week of logging", detail: "Log meals 7 days in a row.", cat: "streak", icon: "flame" },
    { id: "streak_30", name: "Month of logging", detail: "Log meals 30 days in a row.", cat: "streak", icon: "flame" },
    { id: "streak_100", name: "Hundred-day habit", detail: "Log meals 100 days in a row.", cat: "streak", icon: "flame" },
    { id: "protein_streak_7", name: "Protein week", detail: "Hit your protein target 7 days in a row.", cat: "streak", icon: "leaf" },
    { id: "weigh_streak_4", name: "Check-in habit", detail: "Weigh in 4 weeks in a row.", cat: "streak", icon: "scale" },
    { id: "prep_streak_4", name: "Prep rhythm", detail: "Finish meal prep 4 weeks in a row.", cat: "streak", icon: "bowl" },
    { id: "first_week", name: "On the week", detail: "Hit your first weekly milestone at a steady pace.", cat: "plan", icon: "flag" },
    { id: "weeks_4", name: "Four weeks in", detail: "Hit 4 weekly milestones.", cat: "plan", icon: "flag" },
    { id: "weeks_8", name: "Two-month groove", detail: "Hit 8 weekly milestones.", cat: "plan", icon: "flag" },
    { id: "progress_1", name: "First 1%", detail: "Cover 1% of the distance to your goal, without rushing.", cat: "goal", icon: "path" },
    { id: "progress_5", name: "Five percent", detail: "Cover 5% of the distance to your goal at a sustainable pace.", cat: "goal", icon: "path" },
    { id: "progress_10", name: "Ten percent", detail: "Cover 10% of the distance to your goal at a sustainable pace.", cat: "goal", icon: "path" },
    { id: "halfway", name: "Halfway there", detail: "Reach the midpoint of your goal at a sustainable pace.", cat: "goal", icon: "star" },
    { id: "goal_reached", name: "Goal reached", detail: "Arrive at your goal weight without an extreme pace.", cat: "goal", icon: "star" },
    { id: "level_5", name: "Level 5", detail: "Earn enough consistency XP to reach level 5.", cat: "level", icon: "badge" },
    { id: "level_10", name: "Level 10", detail: "Earn enough consistency XP to reach level 10.", cat: "level", icon: "badge" },
  ];

  const ICONS = {
    fork: '<path d="M8 4v7M12 4v7M16 4v7M8 11h8v2a4 4 0 0 1-4 4v5"/>',
    bowl: '<path d="M5 13c1 5 5 7 7 7s6-2 7-7"/><path d="M6 12h12"/><path d="M9 8c0-2 .8-4 .8-5.5"/><path d="M13 9c0-2.4 1.1-4.2 1.1-6"/>',
    note: '<path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5V20H8.5A2.5 2.5 0 0 1 6 17.5V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6"/>',
    flame: '<path d="M12 20c4 0 6-3 6-6 0-4-3-6-3-9-2 2-3 4-3 6 0-3-1.5-5-4-8-1 5-2 7-2 11 0 3 2 6 6 6z"/>',
    leaf: '<path d="M6 16c6-1 10-6 12-13-7 2-12 6-13 13z"/><path d="M10 14c1-3 3-5 6-7"/>',
    scale: '<path d="M6 8h12l1.5 11.5a2 2 0 0 1-2 2.2H6.5a2 2 0 0 1-2-2.2L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M12 13v3"/>',
    flag: '<path d="M7 4h10v16l-5-3-5 3V4z"/>',
    path: '<path d="M5 17c2-5 4-7 7-7s5 2 7 7"/><circle cx="12" cy="8" r="2.2"/>',
    star: '<path d="M12 4l2.2 4.6L19 9.2l-3.5 3.3.9 5-4.4-2.4L7.6 17.5l.9-5L5 9.2l4.8-.6L12 4z"/>',
    badge: '<circle cx="12" cy="12" r="8"/><path d="M9 12.5l2 2 4-4"/>',
  };

  function badgeSvg(icon, unlocked) {
    const d = ICONS[icon] || ICONS.star;
    const lock = unlocked
      ? ""
      : '<path d="M15.5 11V9.5a2.5 2.5 0 0 0-5 0V11"/><rect x="9.5" y="11" width="6.5" height="5" rx="1.2"/>';
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d +
      lock +
      "</svg>"
    );
  }

  function emptyAchievements() {
    return { unlocked: {}, seen: {} };
  }

  function levelFromXp(xp) {
    let level = 1;
    let need = 100;
    let left = Math.max(0, Number(xp) || 0);
    while (left >= need && level < 99) {
      left -= need;
      level++;
      need = Math.round(need * 1.15);
    }
    return { level: level, into: left, need: need, total: Math.max(0, Number(xp) || 0) };
  }

  function currentAndBestStreak(dateSet, today) {
    const dates = Array.from(dateSet).filter(Boolean).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      if (prev && addDays(prev, 1) === d) run += 1;
      else run = 1;
      if (run > best) best = run;
      prev = d;
    }
    let current = 0;
    let cursor = today;
    if (!dateSet.has(today)) {
      const y = addDays(today, -1);
      if (!dateSet.has(y)) return { current: 0, best: best };
      cursor = y;
    }
    while (dateSet.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
    return { current: current, best: Math.max(best, current) };
  }

  function addDays(iso, n) {
    return C.addDaysISO(iso, n);
  }

  function weekStartMonday(iso) {
    const d = new Date(iso + "T12:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return C.toISODate(d);
  }

  function weeklyCurrentAndBest(weekSet, thisWeek) {
    return currentAndBestStreak(
      weekSet,
      thisWeek,
      // reuse daily helper with 7-day steps by encoding weeks as pseudo-dates already spaced 7 days
    );
  }

  // Build a set of "week keys" that are ISO Mondays, then walk back 7 days at a time.
  function weekStreak(weekSet, thisWeek) {
    const dates = Array.from(weekSet).filter(Boolean).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      if (prev && addDays(prev, 7) === d) run += 1;
      else run = 1;
      if (run > best) best = run;
      prev = d;
    }
    let current = 0;
    let cursor = thisWeek;
    if (!weekSet.has(thisWeek)) {
      const prevW = addDays(thisWeek, -7);
      if (!weekSet.has(prevW)) return { current: 0, best: best };
      cursor = prevW;
    }
    while (weekSet.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -7);
    }
    return { current: current, best: Math.max(best, current) };
  }

  function dayHasEntries(logs, iso) {
    const d = logs && logs[iso];
    if (!d) return false;
    return ["breakfast", "lunch", "dinner", "snack"].some((m) => (d[m] || []).length);
  }

  function dayEntries(logs, iso) {
    const d = logs && logs[iso];
    if (!d) return [];
    return ["breakfast", "lunch", "dinner", "snack"].flatMap((m) => d[m] || []);
  }

  function dayHasNote(logs, iso) {
    const d = logs && logs[iso];
    if (!d) return false;
    return !!(d.note || d.hunger || d.mood || d.felt);
  }

  function firstDate(dates) {
    const s = dates.filter(Boolean).sort();
    return s[0] || null;
  }

  function toLb(profile, val) {
    if (!profile || profile.units !== "metric") return Number(val);
    return C.kgToLb(val);
  }

  function safeProgressOk(startLb, currentLb, startISO, today, direction) {
    if (direction === "maintain") return false;
    const changed = Math.abs(Number(currentLb) - Number(startLb));
    if (!isFinite(changed) || changed <= 0) return false;
    const weeks = Math.max(C.weeksBetween(startISO, today), 1 / 7);
    const weekly = changed / weeks;
    const pct = C.pctBodyPerWeek(startLb, weekly);
    if (direction === "gain") return pct <= 0.5 + 1e-6;
    return pct <= 1.0 + 1e-6;
  }

  function collectStats(state, opts) {
    const today = (opts && opts.today) || C.localISODate();
    const logs = state.logs || {};
    const t = (opts && opts.targets) || null;
    const profile = state.profile;
    const logDays = Object.keys(logs).filter((iso) => dayHasEntries(logs, iso)).sort();
    const logSet = new Set(logDays);
    const proteinSet = new Set();
    const noteDays = [];
    let entries = 0;
    let fullMealDays = 0;
    const xpDays = [];

    logDays.forEach((iso) => {
      const items = dayEntries(logs, iso);
      entries += items.length;
      const mealsFilled = ["breakfast", "lunch", "dinner"].filter((m) => ((logs[iso] && logs[iso][m]) || []).length).length;
      if (mealsFilled >= 3) fullMealDays += 1;
      const tot = C.sumMacros(items);
      const hitProtein = !!(t && t.proteinG && tot.protein >= t.proteinG * 0.95);
      if (hitProtein) proteinSet.add(iso);
      if (dayHasNote(logs, iso)) noteDays.push(iso);
      xpDays.push({
        iso: iso,
        entries: items.length,
        full: mealsFilled >= 3,
        protein: hitProtein,
        note: dayHasNote(logs, iso),
      });
    });

    // notes on days without food still count
    Object.keys(logs).forEach((iso) => {
      if (!logSet.has(iso) && dayHasNote(logs, iso)) {
        noteDays.push(iso);
        xpDays.push({ iso: iso, entries: 0, full: false, protein: false, note: true });
      }
    });

    const logging = currentAndBestStreak(logSet, today);
    const protein = currentAndBestStreak(proteinSet, today);

    const weighDates = (state.weights || []).map((w) => w.date).filter(Boolean).sort();
    const weighWeeks = new Set(weighDates.map(weekStartMonday));
    const thisWeek = weekStartMonday(today);
    const weighIn = weekStreak(weighWeeks, thisWeek);

    const prepWeeks = new Set();
    (state.plan && state.plan.weeks ? state.plan.weeks : []).forEach((w) => {
      const target = 2;
      if (Number(w.checks && w.checks.prep_meals) >= target) prepWeeks.add(weekStartMonday(w.start));
    });
    // A recipe logged during a week also counts as prep
    Object.keys(logs).forEach((iso) => {
      const items = dayEntries(logs, iso);
      if (items.some((e) => e.kind === "recipe")) prepWeeks.add(weekStartMonday(iso));
    });
    const prep = weekStreak(prepWeeks, thisWeek);

    const recipes = (state.recipes || []).length;
    const firstRecipeDate = firstDate((state.recipes || []).map((r) => (r.createdOn || r.createdAt || "").slice(0, 10)));

    let startLb = null;
    let startISO = (profile && profile.startedOn) || firstDate(weighDates) || (logDays[0] || today);
    if (state.weights && state.weights.length) {
      const sorted = state.weights.slice().sort((a, b) => a.date.localeCompare(b.date));
      startLb = toLb(profile, sorted[0].weight);
      startISO = sorted[0].date;
    } else if (profile) {
      startLb = toLb(profile, profile.weight);
    }

    let currentLb = startLb;
    let latestISO = startISO;
    if (state.weights && state.weights.length) {
      const latest = state.weights.slice().sort((a, b) => a.date.localeCompare(b.date)).pop();
      currentLb = toLb(profile, latest.weight);
      latestISO = latest.date;
    }

    const goalLb = profile && t ? t.goalLb : profile ? toLb(profile, profile.goalWeight) : null;
    const direction = startLb != null && goalLb != null ? C.directionOf(startLb, goalLb) : "maintain";
    let progress = 0;
    if (direction !== "maintain" && startLb != null && goalLb != null && currentLb != null) {
      const total = goalLb - startLb;
      if (total !== 0) progress = (currentLb - startLb) / total;
      if (progress < 0) progress = 0;
    }
    const safe = startLb != null && currentLb != null && startISO
      ? safeProgressOk(startLb, currentLb, startISO, latestISO || today, direction)
      : false;
    // If they haven't moved yet, safe is irrelevant
    if (progress <= 0) {
      /* no goal awards */
    }

    const weeksHit = countWeeksHit(state, today, startLb, direction);
    const firstWeekDate = weeksHit.firstDate;

    return {
      today: today,
      logDays: logDays,
      logSet: logSet,
      entries: entries,
      fullMealDays: fullMealDays,
      noteDays: noteDays.slice().sort(),
      logging: logging,
      protein: protein,
      weighIn: weighIn,
      prep: prep,
      prepWeeks: prepWeeks.size,
      recipes: recipes,
      firstRecipeDate: firstRecipeDate,
      firstLogDate: logDays[0] || null,
      firstNoteDate: firstDate(noteDays),
      firstWeighDate: weighDates[0] || null,
      xpDays: xpDays,
      weighIns: weighDates.length,
      progress: progress,
      progressSafe: safe || progress <= 0,
      direction: direction,
      startISO: startISO,
      latestISO: latestISO,
      weeksHitCount: weeksHit.count,
      firstWeekDate: firstWeekDate,
      goalReachedDate: weeksHit.goalDate || (progress >= 1 && safe ? latestISO : null),
    };
  }

  function countWeeksHit(state, today, startLb, direction) {
    const plan = state.plan;
    if (!plan || !plan.weeks || !plan.weeks.length) return { count: 0, firstDate: null, goalDate: null };
    const weekly = Number(plan.weeklyLb) || 0;
    // Do not award milestone hits for a too-fast planned pace
    if (startLb && weekly) {
      const pct = C.pctBodyPerWeek(startLb, weekly);
      const tooFast = direction === "gain" ? pct > 0.5 : pct > 1.0;
      if (tooFast) return { count: 0, firstDate: null, goalDate: null };
    }
    const weights = (state.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    let count = 0;
    let firstDate = null;
    let goalDate = null;
    plan.weeks.forEach((w) => {
      const end = C.addDaysISO(w.start, 6);
      if (end > today) return; // only completed weeks
      // Closest weigh-in on or before end, on or after start (else nearest after end within 2 days)
      const inWeek = weights.filter((x) => x.date >= w.start && x.date <= C.addDaysISO(end, 2));
      if (!inWeek.length) return;
      const pick = inWeek[inWeek.length - 1];
      const profile = state.profile;
      const lb = toLb(profile, pick.weight);
      if (Math.abs(lb - Number(w.targetWeight)) <= 1.5) {
        count += 1;
        if (!firstDate) firstDate = pick.date;
      }
    });
    return { count: count, firstDate: firstDate, goalDate: goalDate };
  }

  function xpFromStats(stats, bonusBadges) {
    let xp = 0;
    const byDay = {};
    (stats.xpDays || []).forEach((d) => {
      byDay[d.iso] = d;
    });
    Object.keys(byDay).forEach((iso) => {
      const d = byDay[iso];
      xp += Math.min(25, (d.entries || 0) * 5);
      if (d.full) xp += 15;
      if (d.protein) xp += 10;
      if (d.note) xp += 5;
    });
    xp += (stats.weighIns || 0) * 10;
    xp += (stats.recipes || 0) * 20;
    xp += (stats.prepWeeks || 0) * 15;
    xp += (bonusBadges || 0) * 25;
    return xp;
  }

  function evaluateBadges(stats, level) {
    const out = [];
    function add(id, unlocked, progress, total, inferDate) {
      const def = BADGES.find((b) => b.id === id);
      if (!def) return;
      out.push({
        id: id,
        name: def.name,
        detail: def.detail,
        cat: def.cat,
        icon: def.icon,
        unlocked: !!unlocked,
        progress: progress == null ? (unlocked ? 1 : 0) : progress,
        total: total == null ? 1 : total,
        inferDate: inferDate || null,
      });
    }

    add("first_log", stats.entries >= 1, Math.min(1, stats.entries), 1, stats.firstLogDate);
    add("first_recipe", stats.recipes >= 1, Math.min(1, stats.recipes), 1, stats.firstRecipeDate);
    add("journal_note", stats.noteDays.length >= 1, Math.min(1, stats.noteDays.length), 1, stats.firstNoteDate);
    add("journal_notes_7", stats.noteDays.length >= 7, Math.min(7, stats.noteDays.length), 7, stats.noteDays[6] || null);
    add("foods_100", stats.entries >= 100, Math.min(100, stats.entries), 100, stats.entries >= 100 ? stats.logDays[stats.logDays.length - 1] : null);
    add("streak_7", stats.logging.best >= 7, Math.min(7, stats.logging.best), 7, null);
    add("streak_30", stats.logging.best >= 30, Math.min(30, stats.logging.best), 30, null);
    add("streak_100", stats.logging.best >= 100, Math.min(100, stats.logging.best), 100, null);
    add("protein_streak_7", stats.protein.best >= 7, Math.min(7, stats.protein.best), 7, null);
    add("weigh_streak_4", stats.weighIn.best >= 4, Math.min(4, stats.weighIn.best), 4, null);
    add("prep_streak_4", stats.prep.best >= 4, Math.min(4, stats.prep.best), 4, null);
    add("first_week", stats.weeksHitCount >= 1, Math.min(1, stats.weeksHitCount), 1, stats.firstWeekDate);
    add("weeks_4", stats.weeksHitCount >= 4, Math.min(4, stats.weeksHitCount), 4, stats.firstWeekDate);
    add("weeks_8", stats.weeksHitCount >= 8, Math.min(8, stats.weeksHitCount), 8, stats.firstWeekDate);

    const safe = stats.progressSafe && stats.direction !== "maintain";
    const p = stats.progress || 0;
    const goalDate = stats.latestISO;
    add("progress_1", safe && p >= 0.01, Math.min(1, p / 0.01), 1, safe && p >= 0.01 ? goalDate : null);
    add("progress_5", safe && p >= 0.05, Math.min(1, p / 0.05), 1, safe && p >= 0.05 ? goalDate : null);
    add("progress_10", safe && p >= 0.1, Math.min(1, p / 0.1), 1, safe && p >= 0.1 ? goalDate : null);
    add("halfway", safe && p >= 0.5, Math.min(1, p / 0.5), 1, safe && p >= 0.5 ? goalDate : null);
    add("goal_reached", safe && p >= 1, Math.min(1, p), 1, safe && p >= 1 ? goalDate : null);

    // level badges filled later
    add("level_5", level >= 5, Math.min(5, level), 5, null);
    add("level_10", level >= 10, Math.min(10, level), 10, null);
    return out;
  }

  function compute(state, opts) {
    const stats = collectStats(state, opts || {});
    // First pass: non-level badges, then XP, then level, then include level badges
    const prelim = evaluateBadges(stats, 1);
    const nonLevelUnlocked = prelim.filter((b) => b.unlocked && b.cat !== "level").length;
    const xp = xpFromStats(stats, nonLevelUnlocked);
    const lv = levelFromXp(xp);
    const badges = evaluateBadges(stats, lv.level);
    return {
      stats: stats,
      streaks: {
        logging: stats.logging,
        protein: stats.protein,
        weighIn: stats.weighIn,
        prep: stats.prep,
      },
      badges: badges,
      xp: xp,
      level: lv.level,
      levelInto: lv.into,
      levelNeed: lv.need,
    };
  }

  function sync(state, opts) {
    const today = (opts && opts.today) || C.localISODate();
    const snap = compute(state, opts || {});
    const prev = (state && state.achievements) || emptyAchievements();
    const unlocked = Object.assign({}, prev.unlocked || {});
    const seen = Object.assign({}, prev.seen || {});
    const justUnlocked = [];
    snap.badges.forEach((b) => {
      if (!b.unlocked) return;
      const date = unlocked[b.id] || b.inferDate || today;
      const isNew = !unlocked[b.id];
      if (isNew) unlocked[b.id] = date;
      if (isNew && date === today && !seen[b.id]) {
        justUnlocked.push({ id: b.id, name: b.name, detail: b.detail, icon: b.icon });
        seen[b.id] = true;
      } else {
        seen[b.id] = true;
      }
    });
    return {
      achievements: { unlocked: unlocked, seen: seen },
      justUnlocked: justUnlocked,
      snapshot: snap,
    };
  }

  const api = {
    BADGES: BADGES,
    ICONS: ICONS,
    badgeSvg: badgeSvg,
    emptyAchievements: emptyAchievements,
    levelFromXp: levelFromXp,
    currentAndBestStreak: currentAndBestStreak,
    weekStartMonday: weekStartMonday,
    weekStreak: weekStreak,
    safeProgressOk: safeProgressOk,
    compute: compute,
    sync: sync,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPAchievements = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
