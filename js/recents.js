/* Recent foods for quick logging.
 * Derived from the journal (state.logs), so it works for existing logs and
 * syncs with the account like the journal does. state.recentsHidden holds
 * { key: ISO timestamp } for items the user removed; logging the food again
 * after that time brings it back.
 */
(function (root) {
  "use strict";
  const MEALS = ["breakfast", "lunch", "dinner", "snack"];

  function keyFor(e) {
    if (!e) return "";
    if (e.kind === "recipe" && e.recipeId) return "recipe:" + e.recipeId;
    if (e.foodId) return "food:" + e.foodId;
    const n = String(e.name || "").trim().toLowerCase();
    return n ? "name:" + n : "";
  }

  // Sortable stamp: prefer loggedAt, else day + time.
  function stamp(e, day) {
    if (e.loggedAt) return String(e.loggedAt);
    return String(day || "") + "T" + String(e.time || "00:00") + ":00";
  }

  function compute(state, opts) {
    const o = opts || {};
    const limit = o.limit || 20;
    const s = state || {};
    const logs = s.logs || {};
    const hidden = s.recentsHidden || {};
    const all = [];
    Object.keys(logs).forEach((day) => {
      const d = logs[day] || {};
      MEALS.forEach((meal) => {
        (Array.isArray(d[meal]) ? d[meal] : []).forEach((e) => {
          if (!e || !e.name) return;
          const key = keyFor(e);
          if (!key) return;
          all.push({ key: key, day: day, meal: e.meal || meal, entry: e, at: stamp(e, day), sortDay: day });
        });
      });
    });
    // Newest first: by day, then by logged time within the day.
    all.sort((a, b) => (a.sortDay === b.sortDay ? (a.at < b.at ? 1 : a.at > b.at ? -1 : 0) : a.sortDay < b.sortDay ? 1 : -1));
    const seen = {};
    const out = [];
    for (const r of all) {
      if (seen[r.key]) continue;
      seen[r.key] = true;
      const h = hidden[r.key];
      if (h && !(r.at > h)) continue;
      out.push({
        key: r.key,
        day: r.day,
        meal: r.meal,
        at: r.at,
        kind: r.entry.kind === "recipe" ? "recipe" : "food",
        foodId: r.entry.foodId || null,
        recipeId: r.entry.recipeId || null,
        name: r.entry.name,
        grams: r.entry.grams,
        portionName: r.entry.portionName || "",
        servings: r.entry.servings,
        kcal: Number(r.entry.kcal) || 0,
        protein: Number(r.entry.protein) || 0,
        carbs: Number(r.entry.carbs) || 0,
        fat: Number(r.entry.fat) || 0,
        entry: r.entry,
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  function filter(list, q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return list;
    const words = query.split(/\s+/);
    return list.filter((r) => {
      const hay = String(r.name || "").toLowerCase() + " " + String((r.brand || "")).toLowerCase();
      return words.every((w) => hay.indexOf(w) >= 0);
    });
  }

  function hide(state, key, nowIso) {
    if (!state.recentsHidden) state.recentsHidden = {};
    state.recentsHidden[key] = nowIso || new Date().toISOString();
    return state;
  }

  // Fresh copy of a past entry for a quick re-log (same portion and macros).
  function cloneForRelog(entry, makeId, nowTime, nowIso) {
    const copy = Object.assign({}, entry);
    copy.id = makeId();
    copy.time = nowTime;
    copy.loggedAt = nowIso;
    copy.note = "";
    return copy;
  }

  const api = { compute: compute, filter: filter, hide: hide, keyFor: keyFor, cloneForRelog: cloneForRelog };
  root.PPRecents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
