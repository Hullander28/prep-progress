/* Prep & Progress — offline meal-prep, macros, and small-step goals. */
(function () {
  const C = window.PPCalc;
  const STORE_KEY = "prepProgress.v1";
  const MEALS = [
    { id: "breakfast", label: "Breakfast" },
    { id: "lunch", label: "Lunch" },
    { id: "dinner", label: "Dinner" },
    { id: "snack", label: "Snacks" },
  ];
  const HABITS = [
    { id: "log_meals", label: "Log every meal", detail: "Breakfast, lunch, and dinner — 7 days this week.", auto: "fullDays", target: 7 },
    { id: "hit_protein", label: "Hit your protein target", detail: "At least 5 days this week.", auto: "proteinDays", target: 5 },
    { id: "prep_meals", label: "Prep two meals", detail: "Batch on Sunday (or whenever works). Check them off here.", manual: true, target: 2 },
    { id: "weigh_in", label: "Weigh in twice", detail: "Same time of day, if you can.", auto: "weighIns", target: 2 },
  ];

  const ICONS = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    prep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14c1 5 5 7 7 7s6-2 7-7"/><path d="M6 13h12"/><path d="M9 9c0-2 .8-4 .8-5.5"/><path d="M13 10c0-2.4 1.1-4.2 1.1-6"/></svg>',
    foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
    weight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1.5 11.5a2 2 0 0 1-2 2.2H6.5a2 2 0 0 1-2-2.2L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M12 13v3"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v16l-5-3-5 3V4z"/><path d="M10 9h4"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.4-3.2 3.8-5 7-5s5.6 1.8 7 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M14 5l-7 7 7 7"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
    journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h11.5A1.5 1.5 0 0 1 19 5v15.5H7.5A2.5 2.5 0 0 1 5 18V5.5A2 2 0 0 1 7 3.5z"/><path d="M5 18c0-1 .8-2 2.5-2H19"/><path d="M9 8h6M9 12h6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h8v3a4 4 0 0 1-8 0V5z"/><path d="M8 6H6.5A2.5 2.5 0 0 0 6.5 11C7.5 11 8 10 8.5 9"/><path d="M16 6h1.5A2.5 2.5 0 0 1 17.5 11C16.5 11 16 10 15.5 9"/><path d="M12 12v3"/><path d="M9 19h6"/><path d="M10 16h4v3"/></svg>',
    relog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-4.5"/><path d="M18 4v4h-4"/><path d="M20 12a8 8 0 0 1-14 4.5"/><path d="M6 20v-4h4"/></svg>',
  };

  const TABS = [
    { id: "today", label: "Today", icon: "today" },
    { id: "journal", label: "Journal", icon: "journal" },
    { id: "prep", label: "Prep", icon: "prep" },
    { id: "foods", label: "Foods", icon: "foods" },
    { id: "weight", label: "Weight", icon: "weight" },
    { id: "plan", label: "Plan", icon: "plan" },
  ];
  const HUNGER = [
    { id: "low", label: "Not hungry" },
    { id: "ok", label: "Satisfied" },
    { id: "peckish", label: "Peckish" },
    { id: "hungry", label: "Hungry" },
    { id: "very", label: "Very hungry" },
  ];
  const MOOD = [
    { id: "low", label: "Low" },
    { id: "ok", label: "Okay" },
    { id: "good", label: "Good" },
    { id: "great", label: "Great" },
  ];
  const FELT = [
    { id: "tired", label: "Tired" },
    { id: "ok", label: "Steady" },
    { id: "sore", label: "Sore" },
    { id: "strong", label: "Strong" },
    { id: "energized", label: "Energized" },
  ];

  let state = defaultState();
  let foods = []; // USDA + will merge custom at search time
  let foodsReady = false;
  let foodsError = "";
  let tab = "today";
  let dayISO = C.localISODate();
  let sheet = null; // { type, ... }
  let toastTimer = 0;
  let toastMsg = "";
  let pendingUnlocks = [];
  let confettiOn = false;
  let onb = { step: 0, draft: emptyDraft() };
  let foodsQuery = "";
  let lastTab = "today";
  let journalCursor = C.localISODate();
  let deferredInstall = null;

  function defaultState() {
    return {
      profile: null,
      logs: {},
      weights: [],
      recipes: [],
      customFoods: [],
      plan: null,
      settings: { theme: "dark", palette: "midnight" },
      achievements: { unlocked: {}, seen: {} },
      // Day journal notes live on each logs[date] record (note, hunger, mood, felt).
    };
  }
  function emptyDraft() {
    return {
      age: "",
      sex: "",
      units: "us",
      weight: "",
      height: "",
      activity: "moderate",
      goalWeight: "",
      weeklyLb: "",
      goalWeeks: "",
      goalDate: "",
      intensity: "",
      paceMode: "timeframe",
      calorieTarget: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
      manualCalories: false,
      manualMacros: false,
    };
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed, {
        logs: parsed.logs || {},
        weights: parsed.weights || [],
        recipes: parsed.recipes || [],
        customFoods: parsed.customFoods || [],
        settings: Object.assign({ theme: "dark", palette: "midnight" }, parsed.settings || {}),
        achievements: Object.assign({ unlocked: {}, seen: {} }, parsed.achievements || {}),
      });
    } catch (err) {
      console.warn("Could not read saved data", err);
      return defaultState();
    }
  }
  function saveState(opts) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if ((!opts || !opts.skipSync) && rootCloud()) rootCloud().notifyLocalChange();
  }
  function rootCloud() {
    return window.PPCloud && window.PPCloud.isEnabled() ? window.PPCloud : null;
  }

  let syncNudge = false;
  let authBusy = false;
  let signedInViaLinkNote = false;

  function isStandaloneApp() {
    try {
      if (window.navigator && window.navigator.standalone) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (err) {}
    return false;
  }

  function iphoneSignInNote() {
    return (
      '<p class="hint">On iPhone, a Home Screen app doesn’t share sign-in with Safari. The email link will open in Safari — stay there for cloud backup. This Home Screen copy keeps working on the phone only. On Android, the installed app usually opens the link itself.</p>'
    );
  }

  function accountCard() {
    const cloud = window.PPCloud;
    if (!cloud || !cloud.isEnabled()) return "";
    if (!cloud.isSignedIn()) {
      return (
        '<div class="card account-card" id="save-progress">' +
        "<h2>Save your progress</h2>" +
        '<p class="soft" style="margin-top:0">Sign in with email to back up your journal, plan, and awards to the cloud. This app still works fully on this phone without an account.</p>' +
        '<button class="btn btn-primary btn-block" data-act="open-signin">Sign in with email</button></div>'
      );
    }
    const st = cloud.getStatus();
    const cls = !st.online || st.status === "offline" ? "offline" : st.status === "syncing" ? "syncing" : st.status === "error" ? "error" : "saved";
    return (
      '<div class="card account-card">' +
      "<h2>Your account</h2>" +
      '<p class="soft" style="margin-top:0">' +
      esc(cloud.signedInEmail()) +
      "</p>" +
      '<div class="sync-status ' +
      cls +
      '">' +
      esc(cloud.labelForStatus() || "Saved") +
      "</div>" +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" data-act="sign-out">Sign out</button>' +
      '<button class="btn btn-danger" data-act="delete-account">Delete cloud account…</button></div>' +
      '<p class="tiny muted" style="margin:10px 0 0">Signing out keeps the data on this phone. Deleting the cloud account removes the backup and sign-in on the server. You can still export a JSON backup below.</p></div>'
    );
  }

  function syncNudgeCard() {
    const cloud = window.PPCloud;
    if (!syncNudge || !cloud || !cloud.isEnabled() || cloud.isSignedIn()) return "";
    if (state.settings && state.settings.dismissedSyncNudge) return "";
    return (
      '<div class="card nudge-card">' +
      "<h2>Save your progress?</h2>" +
      '<p class="soft" style="margin-top:0">You can keep everything on this phone, or get a one-time email code so a new device can pick up your journal and plan.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-act="open-signin">Sign in with email</button>' +
      '<button class="btn btn-ghost" data-act="dismiss-nudge">Not now</button></div></div>'
    );
  }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  const PALETTES = [
    { id: "terracotta", label: "Terracotta", hint: "Warm clay", swatch: "#BE5324", themeLight: "#BE5324", themeDark: "#171311" },
    { id: "ocean", label: "Ocean", hint: "Deep teal", swatch: "#0C6E86", themeLight: "#0C6E86", themeDark: "#0B171D" },
    { id: "fresh", label: "Fresh", hint: "Mint green", swatch: "#1B7A4A", themeLight: "#1B7A4A", themeDark: "#0F1A14" },
    { id: "midnight", label: "Midnight", hint: "Violet night", swatch: "#5B45C6", themeLight: "#5B45C6", themeDark: "#0D0B14" },
    { id: "citrus", label: "Citrus", hint: "Bright orange", swatch: "#C45000", themeLight: "#C45000", themeDark: "#1A140A" },
  ];

  function lastItem(arr) {
    return arr && arr.length ? arr[arr.length - 1] : undefined;
  }

  function currentPalette() {
    const id = (state.settings && state.settings.palette) || "midnight";
    return PALETTES.find((p) => p.id === id) || PALETTES[0];
  }

  function applyTheme() {
    const settings = state.settings || {};
    const t = settings.theme || "system";
    const palette = settings.palette || "midnight";
    const html = document.documentElement;
    html.setAttribute("data-palette", palette);
    if (t === "system") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", t);
    const dark =
      t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const pal = currentPalette();
    const color = dark ? pal.themeDark : pal.themeLight;
    const meta = document.getElementById("theme-color") || document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }

  function syncKeyboardChrome() {
    const vv = window.visualViewport;
    if (!vv) return;
    const occluded = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    const open = occluded > 80;
    document.documentElement.style.setProperty("--kb", open ? occluded + "px" : "0px");
    document.documentElement.classList.toggle("kb-open", open);
  }

  function unitLabel(kind) {
    const metric = state.profile && state.profile.units === "metric";
    if (kind === "w") return metric ? "kg" : "lb";
    if (kind === "h") return metric ? "cm" : "in";
    return "";
  }
  function displayWeight(lb) {
    if (!state.profile || state.profile.units === "metric") return C.round1(C.lbToKg(lb));
    return C.round1(lb);
  }
  function toLb(val) {
    if (!state.profile || state.profile.units !== "metric") return Number(val);
    return C.kgToLb(val);
  }

  function targets() {
    if (!state.profile) return null;
    return C.computeTargets(state.profile);
  }

  function emptyDay() {
    return { breakfast: [], lunch: [], dinner: [], snack: [], note: "", hunger: "", mood: "", felt: "" };
  }
  function migrateDay(d) {
    if (!d) return emptyDay();
    MEALS.forEach((m) => { if (!Array.isArray(d[m.id])) d[m.id] = []; });
    if (d.note == null) d.note = "";
    if (d.hunger == null) d.hunger = "";
    if (d.mood == null) d.mood = "";
    if (d.felt == null) d.felt = "";
    return d;
  }
  function getDay(iso) {
    return state.logs[iso] ? migrateDay(state.logs[iso]) : emptyDay();
  }
  function dayLog(iso) {
    if (!state.logs[iso]) state.logs[iso] = emptyDay();
    return migrateDay(state.logs[iso]);
  }
  function dayEntries(iso) {
    const d = getDay(iso);
    return MEALS.flatMap((m) => (d[m.id] || []).map((e) => Object.assign({ meal: e.meal || m.id }, e)));
  }
  function dayHasJournal(iso) {
    const d = state.logs[iso];
    if (!d) return false;
    if (dayEntries(iso).length) return true;
    return !!(d.note || d.hunger || d.mood || d.felt);
  }
  function dayTotals(iso) {
    return C.sumMacros(dayEntries(iso));
  }

  function allFoods() {
    return foods.concat(state.customFoods || []);
  }
  function findFood(id) {
    return allFoods().find((f) => f.id === id) || null;
  }
  function searchFoods(q, limit) {
    limit = limit || 40;
    const all = allFoods();
    const query = (q || "").trim().toLowerCase();
    if (!query) return all.slice(0, Math.min(20, all.length));
    const words = query.split(/\s+/).filter(Boolean);
    const scored = [];
    for (let i = 0; i < all.length; i++) {
      const f = all[i];
      const n = (f.name || "").toLowerCase();
      let ok = true;
      for (let w = 0; w < words.length; w++) {
        if (!n.includes(words[w])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      let score = 0;
      if (n.startsWith(query)) score += 200;
      else if (n.includes(" " + query) || n.includes("," + query)) score += 80;
      const idx = n.indexOf(words[0]);
      score += Math.max(0, 40 - idx);
      score -= Math.min(n.length, 80) * 0.15;
      if (f.custom) score += 15;
      scored.push([score, f]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit).map((x) => x[1]);
  }

  function unpackFoods(payload) {
    const list = (payload && payload.foods) || [];
    foods = list.map((row) => ({
      id: row[0],
      name: row[1],
      kcal: row[2],
      protein: row[3],
      carbs: row[4],
      fat: row[5],
      portions: (row[6] || []).map((p) => ({ name: p[0], grams: p[1] })),
    }));
    foodsReady = true;
    foodsError = "";
  }

  async function loadFoods() {
    try {
      const res = await fetch("./data/foods.json");
      if (!res.ok) throw new Error("Could not load food database (" + res.status + ")");
      const data = await res.json();
      unpackFoods(data);
      foodsReady = true;
      foodsError = "";
    } catch (err) {
      if (foods && foods.length) {
        foodsReady = true;
        foodsError = "";
        return;
      }
      foodsReady = false;
      foodsError = err.message || "Could not load the food database.";
      console.error(err);
    }
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }
  function displayName(name) {
    return String(name || "")
      .replace(/\s*\(Includes foods for USDA'?s Food Distribution Program\)/gi, "")
      .trim();
  }
  function prettyDate(iso) {

    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function fmtKcal(n) {
    const v = C.round0(n);
    return isFinite(v) ? v.toLocaleString() : "—";
  }
  function fmtG(n) {
    const v = C.round1(n);
    if (!isFinite(v)) return "—";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  function habitsFor(intensity) {
    const list = HABITS.map((h) => Object.assign({}, h));
    if (intensity === "aggressive" || intensity === "too_fast") {
      const protein = list.find((h) => h.id === "hit_protein");
      if (protein) {
        protein.target = 6;
        protein.detail = "At least 6 days this week — protein is doing more work on a faster plan.";
      }
      const prep = list.find((h) => h.id === "prep_meals");
      if (prep) {
        prep.target = 3;
        prep.label = "Prep three meals";
        prep.detail = "A little more batch cooking helps an aggressive week.";
      }
      list.push({
        id: "steps",
        label: "Hit 7,000 steps",
        detail: "Five days this week — movement supports a faster plan.",
        manual: true,
        target: 5,
      });
    }
    return list;
  }

  function filledNum(n) {
    if (n === "" || n == null || (typeof n === "string" && n.trim() === "")) return NaN;
    const v = Number(n);
    return isFinite(v) ? v : NaN;
  }

  function paceInput(obj) {
    return {
      sex: obj.sex,
      age: filledNum(obj.age),
      units: obj.units === "metric" ? "metric" : "us",
      weight: filledNum(obj.weight),
      height: filledNum(obj.height),
      goalWeight: filledNum(obj.goalWeight),
      activity: obj.activity || "moderate",
      goalWeeks: obj.goalWeeks || undefined,
      goalDate: obj.goalDate || undefined,
      paceMode: obj.paceMode,
      intensity: obj.intensity,
      weeklyLb: obj.paceMode === "weekly" ? obj.weeklyLb : obj.weeklyLb,
    };
  }

  function withPaceDefaults(obj) {
    const o = Object.assign({}, obj);
    const w = filledNum(o.weight);
    const g = filledNum(o.goalWeight);
    if (!isFinite(w) || !isFinite(g) || w <= 0 || g <= 0) return o;
    if (o.goalWeeks || o.paceMode === "weekly" || o.goalDate) return o;
    const tInit = C.computeTargets(
      Object.assign(paceInput(o), { paceMode: "", goalWeeks: null, goalDate: null, weeklyLb: o.weeklyLb || undefined })
    );
    if (tInit && tInit.goalWeeks) {
      o.goalWeeks = tInit.goalWeeks;
      o.goalDate = tInit.goalDate;
      o.paceMode = "timeframe";
    }
    return o;
  }

  function applyPaceTo(obj, kind, value) {
    const src = withPaceDefaults(obj);
    const t0 = C.computeTargets(paceInput(src));
    if (!t0 || !t0.valid) return obj;
    if (kind === "weeks") {
      obj.goalWeeks = Number(value);
      obj.paceMode = "timeframe";
      obj.goalDate = C.dateFromWeeks(C.localISODate(), obj.goalWeeks);
      obj.intensity = "";
      obj.weeklyLb = C.weeklyFromWeeks(t0.weightLb, t0.goalLb, obj.goalWeeks);
    } else if (kind === "date") {
      const iso = C.isISODate(value) ? value : "";
      if (!iso) return obj;
      const wks = C.weeksBetween(C.localISODate(), iso);
      if (wks <= 0 || wks > 520) return obj;
      obj.goalDate = iso;
      obj.paceMode = "timeframe";
      obj.goalWeeks = Math.max(1, Math.round(wks * 10) / 10);
      obj.intensity = "";
      obj.weeklyLb = C.weeklyFromWeeks(t0.weightLb, t0.goalLb, obj.goalWeeks);
    } else if (kind === "intensity") {
      obj.intensity = value;
      obj.paceMode = "intensity";
      obj.weeklyLb = C.weeklyFromIntensity(t0.weightLb, t0.goalLb, value);
      obj.goalWeeks = C.weeksFromWeekly(t0.weightLb, t0.goalLb, obj.weeklyLb);
      obj.goalDate = obj.goalWeeks ? C.dateFromWeeks(C.localISODate(), obj.goalWeeks) : "";
    } else if (kind === "recommended") {
      const t = C.computeTargets(paceInput(src));
      if (t.safeWeeks) {
        obj.goalWeeks = t.safeWeeks;
        obj.goalDate = t.safeDate;
        obj.paceMode = "timeframe";
        obj.weeklyLb = t.safeWeeklyLb;
        obj.intensity = "";
      }
    }
    return obj;
  }

  function fmtWeekly(t, weeklyLb) {
    const w = weeklyLb != null ? weeklyLb : t.weeklyLb;
    const sign = w > 0 ? "+" : "";
    if (t.units === "metric") return sign + C.round1(C.lbToKg(w)) + " kg / week";
    return sign + C.round1(w) + " lb / week";
  }

  function intensityBadge(t) {
    if (!t) return "";
    return '<span class="intensity-badge ' + t.intensity + '">' + esc(t.intensityLabel) + "</span>";
  }

  function pacePreviewCard(t, useOnb) {
    if (!t || !t.valid) return "";
    const recAttr = useOnb ? 'data-onb="recommended"' : 'data-act="pace-recommended"';
    let html = '<div class="card pace-card">';
    html += '<div class="row"><div>' + intensityBadge(t);
    html += '<p class="soft" style="margin:8px 0 0">' + esc(t.intensityHint) + "</p></div></div>";
    if (t.direction !== "maintain") {
      html +=
        '<p class="hint">About <strong>' +
        fmtWeekly(t) +
        "</strong> (" +
        t.pctPerWeek +
        "% of body weight) · " +
        (t.calorieDelta >= 0 ? "+" : "") +
        fmtKcal(t.calorieDelta) +
        " kcal per day.</p>";
      if (t.goalDate) {
        html +=
          '<p class="soft tiny">Target date ' +
          prettyDate(t.goalDate) +
          (t.goalWeeks ? " · " + t.goalWeeks + " weeks" : "") +
          ".</p>";
      }
    } else {
      html += '<p class="hint">Current and goal weight match, so this is a maintain plan.</p>';
    }
    if (t.intensity === "too_fast" && t.safeDate) {
      html +=
        '<div class="note">The earliest recommended date is <strong>' +
        prettyDate(t.safeDate) +
        "</strong> (~" +
        t.safeWeeks +
        ' weeks). <button class="btn-text" type="button" ' +
        recAttr +
        ">Use recommended pace</button></div>";
    }
    if (t.floored) {
      html +=
        '<div class="note">Calories were raised to a sensible floor (' +
        t.floor +
        " kcal), so the weekly pace may be a little slower than the date implies.</div>";
    }
    html += "</div>";
    return html;
  }

  function renderPaceEditor(prefix, obj, useOnb) {
    const attr = useOnb ? "data-onb" : "data-act";
    const src = withPaceDefaults(obj);
    const can = isFinite(filledNum(src.weight)) && isFinite(filledNum(src.goalWeight)) && isFinite(filledNum(src.age)) && filledNum(src.weight) > 0 && filledNum(src.goalWeight) > 0;
    const t = can ? C.computeTargets(paceInput(src)) : null;
    const weeksVal = src.goalWeeks || (t && t.goalWeeks) || "";
    const dateVal = src.goalDate || (t && t.goalDate) || "";
    let html = '<div class="pace-editor">';
    html += '<div class="field-label" style="margin-top:14px">Goal time frame</div>';
    html += '<p class="tiny muted" style="margin:4px 0 8px">Pick a target date or a number of weeks — we’ll suggest how intense the plan would be.</p>';
    html += '<div class="chips week-chips">';
    (C.WEEK_CHIPS || [8, 12, 16, 24, 36, 52]).forEach((w) => {
      const on = Math.round(Number(weeksVal)) === w ? " on" : "";
      html +=
        '<button type="button" class="chip' +
        on +
        '" ' +
        attr +
        '="pace-weeks" data-weeks="' +
        w +
        '">' +
        w +
        " weeks</button>";
    });
    html += "</div>";
    html +=
      '<label class="field">Target date<input id="' +
      prefix +
      '-goal-date" type="date" value="' +
      esc(dateVal) +
      '" min="' +
      C.localISODate() +
      '"></label>';
    html += '<div class="field-label">Or pick a pace</div>';
    html += '<div class="chips intensity-chips">';
    ["gentle", "moderate", "aggressive"].forEach((id) => {
      const meta = C.INTENSITY_META[id];
      const on = src.paceMode === "intensity" && src.intensity === id ? " on" : "";
      html +=
        '<button type="button" class="chip' +
        on +
        '" ' +
        attr +
        '="pace-intensity" data-id="' +
        id +
        '">' +
        meta.label +
        "</button>";
    });
    html += "</div>";
    if (t && t.valid) html += pacePreviewCard(t, useOnb);
    html += "</div>";
    return html;
  }

  function convertDraftUnits(d, next) {
    if (!d || d.units === next) {
      if (d) d.units = next;
      return d;
    }
    const w = Number(d.weight);
    const h = Number(d.height);
    const g = Number(d.goalWeight);
    if (next === "metric") {
      if (isFinite(w) && w !== 0) d.weight = C.round1(C.lbToKg(w));
      if (isFinite(h) && h !== 0) d.height = C.round1(C.inToCm(h));
      if (isFinite(g) && g !== 0) d.goalWeight = C.round1(C.lbToKg(g));
    } else {
      if (isFinite(w) && w !== 0) d.weight = C.round1(C.kgToLb(w));
      if (isFinite(h) && h !== 0) d.height = C.round1(C.cmToIn(h));
      if (isFinite(g) && g !== 0) d.goalWeight = C.round1(C.kgToLb(g));
    }
    d.units = next;
    return d;
  }

  function toast(msg) {
    toastMsg = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMsg = "";
      render();
    }, 2400);
  }

  /* ---------- Plan ---------- */
  function buildPlan(fromISO, fromWeightLb) {
    const t = targets();
    if (!t) return null;
    const weekly = t.floored ? t.impliedWeeklyLb : t.weeklyLb;
    const goal = t.goalLb;
    let w = fromWeightLb != null ? fromWeightLb : t.weightLb;
    let iso = fromISO || C.localISODate();
    const weeks = [];
    for (let i = 0; i < 104; i++) {
      let targetW;
      if (!weekly) {
        targetW = goal;
      } else {
        const next = C.round1(w + weekly);
        if (weekly < 0) targetW = Math.max(goal, next);
        else targetW = Math.min(goal, next);
      }
      weeks.push({
        start: iso,
        startWeight: C.round1(w),
        targetWeight: C.round1(targetW),
        checks: {},
      });
      if (!weekly || (weekly < 0 && targetW <= goal) || (weekly > 0 && targetW >= goal)) break;
      w = targetW;
      iso = C.addDaysISO(iso, 7);
    }
    return {
      generatedAt: new Date().toISOString(),
      startDate: weeks[0] && weeks[0].start,
      weeklyLb: weekly,
      weeks,
    };
  }
  function currentWeekIndex() {
    if (!state.plan || !state.plan.weeks || !state.plan.weeks.length) return -1;
    const today = C.localISODate();
    let idx = 0;
    for (let i = 0; i < state.plan.weeks.length; i++) {
      if (state.plan.weeks[i].start <= today) idx = i;
    }
    return idx;
  }
  function weekRange(week) {
    return { start: week.start, end: C.addDaysISO(week.start, 6) };
  }
  function habitProgress(week) {
    const { start, end } = weekRange(week);
    const t = targets();
    let fullDays = 0,
      proteinDays = 0;
    let d = start;
    while (d <= end) {
      const log = state.logs[d];
      if (log) {
        const mealsFilled = ["breakfast", "lunch", "dinner"].filter((m) => (log[m] || []).length).length;
        if (mealsFilled >= 3) fullDays++;
        const tot = C.sumMacros(MEALS.flatMap((m) => log[m.id] || []));
        if (t && tot.protein >= t.proteinG * 0.95) proteinDays++;
      }
      d = C.addDaysISO(d, 1);
    }
    const weighIns = (state.weights || []).filter((w) => w.date >= start && w.date <= end).length;
    return { fullDays, proteinDays, weighIns };
  }
  function planDrift() {
    if (!state.plan || !state.weights.length) return null;
    const idx = currentWeekIndex();
    if (idx < 0) return null;
    const week = state.plan.weeks[idx];
    const latest = lastItem(state.weights.slice().sort((a, b) => a.date.localeCompare(b.date)));
    if (!latest) return null;
    const latestLb = toLb(latest.weight);
    const expected = week.startWeight;
    const diff = C.round1(latestLb - expected);
    // For loss, positive diff means behind (heavier than expected)
    const weekly = state.plan.weeklyLb || 0;
    if (Math.abs(diff) < 1.5) return { kind: "on", diff, latestLb, expected };
    if (!weekly) return { kind: "on", diff, latestLb, expected };
    if ((weekly < 0 && diff > 0) || (weekly > 0 && diff < 0)) return { kind: "behind", diff, latestLb, expected };
    return { kind: "ahead", diff, latestLb, expected };
  }

  /* ---------- Rings ---------- */
  function ringSVG(pct, color, size, stroke) {
    size = size || 160;
    stroke = stroke || 12;
    const r = size / 2 - stroke;
    const c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1.05, pct));
    const over = p > 1;
    const dash = (Math.min(p, 1) * c).toFixed(2) + " " + c.toFixed(2);
    return (
      '<svg viewBox="0 0 ' +
      size +
      " " +
      size +
      '" aria-hidden="true">' +
      '<circle cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke="currentColor" opacity="0.12" stroke-width="' +
      stroke +
      '"/>' +
      '<circle cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke="' +
      (over ? "var(--gold)" : color) +
      '" stroke-width="' +
      stroke +
      '" stroke-linecap="round" stroke-dasharray="' +
      dash +
      '" transform="rotate(-90 ' +
      size / 2 +
      " " +
      size / 2 +
      ')"/>' +
      "</svg>"
    );
  }

  /* ---------- Render ---------- */
  function burstConfetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    confettiOn = true;
    setTimeout(() => {
      confettiOn = false;
      const el = document.querySelector(".confetti");
      if (el) el.remove();
    }, 2000);
  }

  function syncAchievements() {
    if (!state.profile || !window.PPAchievements) return;
    const res = window.PPAchievements.sync(state, { today: C.localISODate(), targets: targets() });
    const prev = JSON.stringify(state.achievements || {});
    state.achievements = res.achievements;
    if (res.justUnlocked && res.justUnlocked.length) {
      pendingUnlocks = pendingUnlocks.concat(res.justUnlocked);
    }
    if (JSON.stringify(state.achievements) !== prev) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (err) {}
    }
  }

  function render() {
    applyTheme();
    const root = document.getElementById("app");
    if (!foodsReady && !state.profile) {
      root.innerHTML =
        '<div class="boot" role="status"><div class="boot-mark" aria-hidden="true">' +
        ICONS.prep +
        "</div><p>Warming up your kitchen…</p></div>";
      return;
    }
    if (!state.profile) {
      root.innerHTML = renderOnboarding();
      bindOnboarding();
      return;
    }
    syncAchievements();
    if (pendingUnlocks.length && !toastMsg) {
      const u = pendingUnlocks.slice();
      pendingUnlocks = [];
      toastMsg =
        u.length === 1 ? "Award unlocked: " + u[0].name : u.length + " awards unlocked";
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastMsg = "";
        render();
      }, 3200);
      burstConfetti();
    }
    const showFab = tab === "today" || tab === "journal" || tab === "prep" || tab === "foods";
    const confettiHtml = confettiOn
      ? '<div class="confetti" aria-hidden="true">' +
        Array.from({ length: 24 })
          .map((_, i) => '<span class="c c' + (i % 6) + '" style="--i:' + i + '"></span>')
          .join("") +
        "</div>"
      : "";
    root.innerHTML =
      '<div class="shell" data-tab="' +
      tab +
      '">' +
      renderTab() +
      "</div>" +
      renderTabbar() +
      (showFab
        ? '<button class="fab" data-act="fab" aria-label="Quick log a food">' + ICONS.plus + "</button>"
        : "") +
      (sheet ? renderSheet() : "") +
      (toastMsg ? '<div class="toast" role="status">' + esc(toastMsg) + "</div>" : "") +
      confettiHtml;
    bindMain();
  }

  function renderTabbar() {
    return (
      '<nav class="tabbar" role="tablist" aria-label="Main">' +
      TABS.map((t) => {
        return (
          '<button role="tab" aria-selected="' +
          (tab === t.id) +
          '" class="' +
          (tab === t.id ? "on" : "") +
          '" data-tab="' +
          t.id +
          '">' +
          ICONS[t.icon] +
          "<span>" +
          t.label +
          "</span></button>"
        );
      }).join("") +
      "</nav>"
    );
  }

  function renderTab() {
    if (tab === "today") return renderToday();
    if (tab === "journal") return renderJournal();
    if (tab === "prep") return renderPrep();
    if (tab === "foods") return renderFoods();
    if (tab === "weight") return renderWeight();
    if (tab === "plan") return renderPlan();
    if (tab === "awards") return renderAwards();
    return renderProfile();
  }

  function mealLabel(id) {
    const m = MEALS.find((x) => x.id === id);
    return m ? m.label : id || "Meal";
  }
  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function prettyTime(t) {
    if (!t) return "";
    const parts = String(t).split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1] || 0);
    if (!isFinite(h)) return t;
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return hr + ":" + String(m).padStart(2, "0") + " " + ap;
  }
  function chipLabel(list, id) {
    const x = list.find((i) => i.id === id);
    return x ? x.label : "";
  }
  function goProfile() {
    if (tab !== "profile") lastTab = tab;
    tab = "profile";
    sheet = null;
    render();
  }
  function topbar(title, sub, extra) {
    const back = tab === "profile" || tab === "awards";
    const awardsBtn =
      tab === "awards" || tab === "profile"
        ? ""
        : '<button class="icon-btn" data-act="goto-awards" aria-label="Awards and streaks">' + ICONS.trophy + "</button>";
    return (
      '<div class="topbar"><div><h1>' +
      title +
      "</h1>" +
      (sub ? '<div class="sub">' + sub + "</div>" : "") +
      '</div><div class="topbar-actions">' +
      (extra || "") +
      awardsBtn +
      (back
        ? '<button class="icon-btn" data-act="back-tab" aria-label="Back">' + ICONS.back + "</button>"
        : '<button class="icon-btn" data-act="goto-profile" aria-label="Profile and settings">' +
          ICONS.profile +
          "</button>") +
      "</div></div>"
    );
  }

  function datedTitle() {
    const today = C.localISODate();
    if (dayISO === today) return "Today";
    if (dayISO === C.addDaysISO(today, -1)) return "Yesterday";
    if (dayISO === C.addDaysISO(today, 1)) return "Tomorrow";
    return prettyDate(dayISO);
  }

  /* ---------- Today ---------- */
  function renderToday() {
    const t = targets();
    const tot = dayTotals(dayISO);
    const kcalPct = t && t.calorieTarget ? tot.kcal / t.calorieTarget : 0;
    const sub =
      dayISO === C.localISODate()
        ? greeting()
        : prettyDate(dayISO);
    let html = topbar(datedTitle(), esc(sub), dateNavBtns());
    html += syncNudgeCard();
    if (signedInViaLinkNote && rootCloud() && rootCloud().isSignedIn()) {
      html +=
        '<div class="card nudge-card" id="safari-signin-note"><h2>You’re signed in here</h2>' +
        '<p class="soft" style="margin-top:0">Cloud backup is on in this browser. On iPhone, the Home Screen icon is a separate copy and won’t see this sign-in — use this Safari (or Chrome) page for the synced journal. On Android, an installed app usually receives the link itself.</p>' +
        '<button class="btn btn-ghost btn-block" data-act="dismiss-link-note">Got it</button></div>';
    }
    html += '<div class="card rings-card">';
    html += '<div class="rings">';
    html += '<div class="ring-wrap">' + ringSVG(kcalPct, "var(--accent)", 160, 13);
    html += '<div class="ring-center"><div class="num">' + fmtKcal(tot.kcal) + "</div>";
    html += '<div class="lbl">' + (t ? "of " + fmtKcal(t.calorieTarget) + " kcal" : "kcal logged") + "</div></div></div>";
    html += '<div class="macro-col">';
    html += macroRow("Protein", tot.protein, t && t.proteinG, "var(--sage)");
    html += macroRow("Carbs", tot.carbs, t && t.carbsG, "var(--gold)");
    html += macroRow("Fat", tot.fat, t && t.fatG, "var(--rose)");
    html += "</div></div>";
    html += '<button class="linkish" data-act="goto-journal">Open food journal →</button>';
    html += "</div>";

    const d = getDay(dayISO);
    MEALS.forEach((m) => {
      const items = d[m.id] || [];
      const mtot = C.sumMacros(items);
      html += '<div class="card"><div class="meal-head"><h2>' + m.label + "</h2>";
      html += '<button class="add-chip" data-act="log-food" data-meal="' + m.id + '" aria-label="Add to ' + m.label + '">' + ICONS.plus + "</button></div>";
      if (!items.length) {
        html += '<p class="muted tiny">Nothing here yet. Add a food or a prep serving.</p>';
      } else {
        items.forEach((e) => {
          html += entryRow(e, m.id, dayISO, false);
        });
        html += '<div class="totals"><span>' + items.length + (items.length === 1 ? " item" : " items") + "</span><span>" + fmtKcal(mtot.kcal) + " kcal</span></div>";
      }
      html += "</div>";
    });

    if (d.note || d.hunger || d.mood || d.felt) {
      html += '<div class="card"><h2>How the day felt</h2>' + dayFeelSummary(d);
      html += '<button class="btn btn-ghost btn-block" data-act="goto-journal">Edit in journal</button></div>';
    } else {
      html += '<div class="card"><p class="soft" style="margin:0 0 10px">Want to jot how you felt today?</p>';
      html += '<button class="btn btn-ghost btn-block" data-act="goto-journal">Add a journal note</button></div>';
    }
    return html;
  }

  function dateNavBtns() {
    return (
      '<div class="date-nav">' +
      '<button class="icon-btn sm" data-act="day-prev" aria-label="Previous day">' + ICONS.chevL + "</button>" +
      '<button class="icon-btn sm" data-act="day-today" aria-label="Jump to today">•</button>' +
      '<button class="icon-btn sm" data-act="day-next" aria-label="Next day">' + ICONS.chevR + "</button>" +
      "</div>"
    );
  }
  function macroRow(name, val, tgt, color) {
    const pct = tgt ? val / tgt : 0;
    return (
      '<div class="macro-item">' +
      ringSVG(pct, color, 44, 5) +
      "<div><div class=\"name\">" +
      name +
      '</div><div class="val">' +
      fmtG(val) +
      (tgt != null ? "<span class=\"muted\"> / " + tgt + " g</span>" : " g") +
      "</div></div></div>"
    );
  }
  function entryRow(e, mealId, iso, compact) {
    const time = e.time ? '<span class="time">' + esc(prettyTime(e.time)) + "</span>" : "";
    const portion = e.portionName ? esc(e.portionName) : e.grams ? fmtG(e.grams) + " g" : "";
    const note = e.note ? '<div class="meta">“' + esc(e.note) + "”</div>" : "";
    return (
      '<div class="entry" data-act="edit-entry" data-id="' +
      esc(e.id) +
      '" data-meal="' +
      esc(mealId) +
      '" data-day="' +
      esc(iso) +
      '"><div><div class="name">' +
      esc(displayName(e.name)) +
      " " +
      time +
      '</div><div class="meta">' +
      portion +
      (e.kind === "recipe" ? " · recipe" : "") +
      "</div>" +
      note +
      '</div><div class="kcal">' +
      fmtKcal(e.kcal) +
      (compact ? "" : '<div class="meta">' + fmtG(e.protein) + "P · " + fmtG(e.carbs) + "C · " + fmtG(e.fat) + "F</div>") +
      "</div></div>"
    );
  }
  function dayFeelSummary(d) {
    const bits = [];
    if (d.hunger) bits.push("Hunger: " + chipLabel(HUNGER, d.hunger));
    if (d.mood) bits.push("Mood: " + chipLabel(MOOD, d.mood));
    if (d.felt) bits.push("Felt: " + chipLabel(FELT, d.felt));
    let html = "";
    if (bits.length) html += '<p class="soft" style="margin:0 0 8px">' + esc(bits.join(" · ")) + "</p>";
    if (d.note) html += '<p style="margin:0">' + esc(d.note) + "</p>";
    return html || "";
  }

  /* ---------- Journal ---------- */
  function renderJournal() {
    const iso = journalCursor;
    const t = targets();
    const tot = dayTotals(iso);
    const d = getDay(iso);
    const today = C.localISODate();
    const title = iso === today ? "Journal" : prettyDate(iso);
    let html = topbar(title, "Your food story, day by day", dateNavBtns().replace(/day-prev/g, "j-prev").replace(/day-next/g, "j-next").replace(/day-today/g, "j-today"));
    html += renderCalendar(iso);
    html += '<div class="card rings-card"><div class="row" style="margin-bottom:8px"><h2 style="margin:0">Daily totals</h2>';
    html += '<span class="muted tiny">' + (t ? "vs your targets" : "log a profile to see targets") + "</span></div>";
    html += '<div class="stat-grid" style="margin-bottom:8px">';
    html += statBox("Calories", fmtKcal(tot.kcal) + (t ? " / " + fmtKcal(t.calorieTarget) : ""), tot.kcal, t && t.calorieTarget, "var(--accent)");
    html += statBox("Protein", fmtG(tot.protein) + (t ? " / " + t.proteinG + " g" : " g"), tot.protein, t && t.proteinG, "var(--sage)");
    html += statBox("Carbs", fmtG(tot.carbs) + (t ? " / " + t.carbsG + " g" : " g"), tot.carbs, t && t.carbsG, "var(--gold)");
    html += statBox("Fat", fmtG(tot.fat) + (t ? " / " + t.fatG + " g" : " g"), tot.fat, t && t.fatG, "var(--rose)");
    html += "</div></div>";

    const entries = dayEntries(iso).slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    if (!entries.length) {
      html += '<div class="card"><div class="empty">' + ICONS.journal + "<h3>A fresh page</h3><p>Nothing logged on this day yet. Add a meal, or re-log something from another day.</p></div>";
      html += '<button class="btn btn-primary btn-block" data-act="log-food" data-meal="breakfast">Log a food</button></div>';
    } else {
      let lastMeal = "";
      html += '<div class="card journal-list">';
      entries.forEach((e) => {
        const meal = e.meal;
        if (meal !== lastMeal) {
          lastMeal = meal;
          const mealItems = entries.filter((x) => x.meal === meal);
          html += '<div class="meal-head journal-meal"><h2>' + mealLabel(meal) + "</h2>";
          html += '<button class="btn-text" data-act="relog-meal" data-meal="' + meal + '" data-day="' + iso + '">Re-log meal</button></div>';
        }
        html += entryRow(e, meal, iso, false);
      });
      html += "</div>";
    }

    html += '<div class="card"><h2>How did you feel?</h2>';
    html += '<p class="hint" style="margin-top:0">Little notes help you notice patterns. This stays on your phone.</p>';
    html += '<div class="field-label">Hunger</div>' + chipRow("hunger", HUNGER, d.hunger);
    html += '<div class="field-label">Mood</div>' + chipRow("mood", MOOD, d.mood);
    html += '<div class="field-label">How you felt</div>' + chipRow("felt", FELT, d.felt);
    html += '<label class="field" style="margin-top:12px">Day note<textarea id="day-note" rows="3" placeholder="Energy, sleep, cravings, a win…">' + esc(d.note || "") + "</textarea></label>";
    html += '<button class="btn btn-ghost btn-block" data-act="save-day-note" style="margin-top:10px">Save note</button></div>';

    html += '<div class="btn-row" style="margin-top:14px">';
    html += '<button class="btn btn-outline" data-act="export-journal-csv">Export journal CSV</button>';
    html += '<button class="btn btn-outline" data-act="export-backup">Backup JSON</button></div>';
    return html;
  }
  function statBox(lbl, val, n, tgt, color) {
    const pct = tgt ? Math.max(0, Math.min(1, n / tgt)) : 0;
    return (
      '<div class="stat"><div class="lbl">' +
      esc(lbl) +
      '</div><div class="val" style="font-size:1.05rem">' +
      val +
      '</div><div class="bar"><span style="width:' +
      (pct * 100).toFixed(0) +
      "%;background:" +
      color +
      '"></span></div></div>'
    );
  }
  function chipRow(kind, list, current) {
    return (
      '<div class="chips" data-chip="' +
      kind +
      '">' +
      list
        .map((c) => {
          return (
            '<button type="button" class="chip' +
            (current === c.id ? " on" : "") +
            '" data-act="day-chip" data-kind="' +
            kind +
            '" data-id="' +
            c.id +
            '">' +
            esc(c.label) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function renderCalendar(selected) {
    const cur = new Date(selected + "T12:00:00");
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay(); // 0 Sun
    const daysIn = new Date(year, month + 1, 0).getDate();
    const monthName = cur.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const today = C.localISODate();
    let html = '<div class="card cal-card"><div class="cal-head">';
    html += '<button class="icon-btn sm" data-act="cal-prev" aria-label="Previous month">' + ICONS.chevL + "</button>";
    html += "<strong>" + esc(monthName) + "</strong>";
    html += '<button class="icon-btn sm" data-act="cal-next" aria-label="Next month">' + ICONS.chevR + "</button>";
    html += '<label class="sr-only" for="journal-date">Pick a date</label>';
    html += '<input type="date" id="journal-date" value="' + selected + '" aria-label="Jump to date">';
    html += '</div><div class="cal-weekdays">';
    ["S", "M", "T", "W", "T", "F", "S"].forEach((w) => {
      html += "<span>" + w + "</span>";
    });
    html += '</div><div class="cal-grid">';
    for (let i = 0; i < startDow; i++) html += "<span></span>";
    for (let day = 1; day <= daysIn; day++) {
      const iso = C.toISODate(new Date(year, month, day));
      const cls = [
        "cal-day",
        iso === selected ? "on" : "",
        iso === today ? "today" : "",
        dayHasJournal(iso) ? "has" : "",
      ]
        .filter(Boolean)
        .join(" ");
      html +=
        '<button class="' + cls + '" data-act="cal-day" data-day="' + iso + '">' + day + "<i></i></button>";
    }
    html += "</div></div>";
    return html;
  }

  /* ---------- Prep ---------- */
  function renderPrep() {
    let html = topbar("Meal prep", "Build a batch once, then log servings all week.");
    if (!state.recipes.length) {
      html += '<div class="card"><div class="empty">' + ICONS.prep + "<h3>No preps yet</h3><p>Create a recipe from foods in your database. We’ll do the per-serving math for you.</p></div>";
      html += '<button class="btn btn-primary btn-block" data-act="new-recipe">New recipe</button></div>';
    } else {
      html += '<button class="btn btn-primary btn-block" data-act="new-recipe" style="margin-bottom:14px">New recipe</button>';
      state.recipes.forEach((r) => {
        const per = C.recipePerServing(r.items || [], r.servings || 1);
        html += '<div class="card"><div class="row"><div><h2 style="margin:0">' + esc(r.name) + "</h2>";
        html += '<div class="muted tiny">' + (r.servings || 1) + " servings · " + fmtKcal(per.kcal) + " kcal each</div></div></div>";
        html += '<div class="meta soft tiny" style="margin:8px 0">' + fmtG(per.protein) + "P · " + fmtG(per.carbs) + "C · " + fmtG(per.fat) + "F per serving</div>";
        html += '<div class="btn-row"><button class="btn btn-primary" data-act="log-recipe" data-id="' + r.id + '">Log servings</button>';
        html += '<button class="btn btn-ghost" data-act="edit-recipe" data-id="' + r.id + '">Edit</button></div></div>';
      });
    }
    return html;
  }

  /* ---------- Foods ---------- */
  function renderFoods() {
    let html = topbar("Foods", foodsReady ? foods.length.toLocaleString() + " USDA foods, plus your own." : "Loading database…");
    html += '<div class="search-box">' + ICONS.search + '<input type="search" id="foods-q" placeholder="Search chicken, rice, yogurt…" value="' + esc(foodsQuery) + '" autocomplete="off"></div>';
    if (foodsError) html += '<div class="note">Could not load the built-in database. You can still add custom foods. ' + esc(foodsError) + "</div>";
    html += '<div class="btn-row" style="margin-bottom:12px"><button class="btn btn-ghost" data-act="add-custom">Add custom</button>';
    html += '<button class="btn btn-ghost" data-act="import-foods">Import CSV / JSON</button></div>';
    html += '<div id="search-results" class="card" style="padding-top:4px;padding-bottom:8px">';
    html += renderFoodResults(foodsQuery);
    html += "</div>";
    return html;
  }
  function renderFoodResults(q) {
    if (!foodsReady && !(state.customFoods || []).length) {
      return '<p class="muted" style="padding:12px">Still loading foods…</p>';
    }
    const rows = searchFoods(q, 40);
    if (!rows.length) return '<p class="muted" style="padding:12px">No matches. Try a shorter word, or add a custom food.</p>';
    return rows
      .map((f) => {
        return (
          '<button class="food-row" data-act="food-detail" data-id="' +
          esc(f.id) +
          '"><div><div class="name">' +
          esc(displayName(f.name)) +
          (f.custom ? ' <span class="pill">Yours</span>' : "") +
          '</div><div class="meta">' +
          fmtKcal(f.kcal) +
          " kcal · " +
          fmtG(f.protein) +
          "P " +
          fmtG(f.carbs) +
          "C " +
          fmtG(f.fat) +
          "F <span class=\"muted\">/ 100 g</span></div></div></button>"
        );
      })
      .join("");
  }

  /* ---------- Weight ---------- */
  function renderWeight() {
    const t = targets();
    const unit = unitLabel("w");
    const sorted = (state.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = lastItem(sorted);
    const avg = C.sevenDayAverage(sorted, C.localISODate());
    const currentDisp = latest ? latest.weight : t ? displayWeight(t.weightLb) : "—";
    const goalDisp = t ? displayWeight(t.goalLb) : "—";
    let remain = "—";
    if (t) {
      const curLb = latest ? toLb(latest.weight) : t.weightLb;
      remain = C.round1(Math.abs(displayWeight(curLb) - displayWeight(t.goalLb)));
    }
    let html = topbar("Weight", "Log a weigh-in and watch the trend.");
    html += '<div class="stat-grid">';
    html += '<div class="stat"><div class="lbl">Latest</div><div class="val">' + currentDisp + ' <span class="tiny muted">' + unit + "</span></div></div>";
    html += '<div class="stat"><div class="lbl">7-day average</div><div class="val">' + (avg != null ? avg : "—") + ' <span class="tiny muted">' + unit + "</span></div></div>";
    html += '<div class="stat"><div class="lbl">Goal</div><div class="val">' + goalDisp + ' <span class="tiny muted">' + unit + "</span></div></div>";
    html += '<div class="stat"><div class="lbl">To go</div><div class="val">' + remain + ' <span class="tiny muted">' + unit + "</span></div></div>";
    html += "</div>";
    html += '<div class="card" style="margin-top:14px"><h2>Trend</h2>' + weightChart(sorted) + "</div>";
    html += '<button class="btn btn-primary btn-block" style="margin:14px 0" data-act="weigh-in">Log weigh-in</button>';
    if (sorted.length) {
      html += '<div class="card">';
      sorted
        .slice()
        .reverse()
        .slice(0, 20)
        .forEach((w) => {
          html +=
            '<div class="entry"><div><div class="name">' +
            prettyDate(w.date) +
            '</div></div><div class="kcal">' +
            w.weight +
            " " +
            unit +
            ' <button class="del" data-act="del-weight" data-date="' +
            w.date +
            '" aria-label="Delete">×</button></div></div>';
        });
      html += "</div>";
    }
    return html;
  }
  function weightChart(sorted) {
    if (sorted.length < 2) {
      return '<div class="empty"><h3>A quiet start</h3><p>Log at least two weigh-ins to draw your chart. You’ve got this.</p></div>';
    }
    const w = 360, h = 180, padL = 36, padR = 10, padT = 16, padB = 28;
    const vals = sorted.map((x) => Number(x.weight));
    const t = targets();
    const goal = t ? displayWeight(t.goalLb) : null;
    let min = Math.min.apply(null, vals);
    let max = Math.max.apply(null, vals);
    if (goal != null) {
      min = Math.min(min, goal);
      max = Math.max(max, goal);
    }
    const span = Math.max(1, max - min);
    min -= span * 0.12;
    max += span * 0.12;
    const xAt = (i) => padL + (i * (w - padL - padR)) / (sorted.length - 1);
    const yAt = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
    let d = "";
    sorted.forEach((pt, i) => {
      d += (i ? "L" : "M") + xAt(i).toFixed(1) + " " + yAt(pt.weight).toFixed(1) + " ";
    });
    let goalLine = "";
    if (goal != null) {
      const gy = yAt(goal);
      goalLine =
        '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="var(--sage)" stroke-dasharray="4 4" stroke-width="1.5"/>' +
        '<text x="' + (w - padR) + '" y="' + (gy - 4) + '" text-anchor="end" font-size="10" fill="var(--sage)">goal</text>';
    }
    const first = prettyDate(sorted[0].date);
    const last = prettyDate(sorted[sorted.length - 1].date);
    const dots = sorted
      .map((pt, i) => '<circle cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(pt.weight).toFixed(1) + '" r="3.2" fill="var(--accent)"/>')
      .join("");
    return (
      '<svg class="chart" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="Weight trend">' +
      goalLine +
      '<path d="' +
      d +
      '" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
      '<text x="' + padL + '" y="' + (h - 8) + '" font-size="10" fill="var(--muted)">' +
      esc(first) +
      '</text><text x="' + (w - padR) + '" y="' + (h - 8) + '" font-size="10" text-anchor="end" fill="var(--muted)">' +
      esc(last) +
      "</text></svg>"
    );
  }

  /* ---------- Plan ---------- */
  function awardsTeaser() {
    if (!window.PPAchievements) return "";
    const snap = window.PPAchievements.compute(state, { today: C.localISODate(), targets: targets() });
    const unlocked = snap.badges.filter((b) => b.unlocked).length;
    const log = snap.streaks.logging;
    let html = '<div class="card awards-teaser">';
    html += '<div class="row"><div><h2 style="margin:0">Awards</h2>';
    html += '<p class="soft tiny" style="margin:4px 0 0">Level ' + snap.level + " · " + unlocked + " of " + snap.badges.length + " badges · logging streak " + log.current + "</p></div>";
    html += '<button class="btn btn-ghost" data-act="goto-awards">See all</button></div></div>';
    return html;
  }

  function renderAwards() {
    const A = window.PPAchievements;
    if (!A) return topbar("Awards", "Streaks and badges.") + '<p class="muted">Awards are unavailable right now.</p>';
    const snap = A.compute(state, { today: C.localISODate(), targets: targets() });
    const dates = (state.achievements && state.achievements.unlocked) || {};
    let html = topbar("Awards", "Consistency earns the badges — never crash diets.");
    html += '<div class="card level-card">';
    html += '<div class="row"><div><div class="muted tiny">Level</div><div class="val" style="font-size:2rem;font-weight:750">' + snap.level + "</div></div>";
    html += '<div class="soft tiny">' + snap.xp.toLocaleString() + " XP from logging, protein, weigh-ins, prep, and notes — not from losing weight quickly.</div></div>";
    const pct = snap.levelNeed ? Math.min(100, (snap.levelInto / snap.levelNeed) * 100) : 0;
    html += '<div class="bar" style="margin-top:10px"><span style="width:' + pct + '%;background:var(--accent)"></span></div>';
    html += '<div class="tiny muted">' + snap.levelInto + " / " + snap.levelNeed + " XP to level " + (snap.level + 1) + "</div></div>";

    html += '<div class="card"><h2>Streaks</h2><div class="streak-grid">';
    const rows = [
      ["Logging", snap.streaks.logging, "Days with at least one food logged."],
      ["Protein", snap.streaks.protein, "Days you hit your protein target."],
      ["Weigh-in", snap.streaks.weighIn, "Weeks with at least one weigh-in."],
      ["Prep", snap.streaks.prep, "Weeks you prepped or logged a recipe."],
    ];
    rows.forEach((row) => {
      html += '<div class="streak"><div class="name">' + row[0] + '</div>';
      html += '<div class="val">' + row[1].current + '</div>';
      html += '<div class="meta">Best ' + row[1].best + "</div>";
      html += '<div class="tiny muted">' + row[2] + "</div></div>";
    });
    html += "</div></div>";

    html += '<div class="card"><h2>Badge case</h2><div class="badge-grid">';
    snap.badges.forEach((b) => {
      const on = b.unlocked ? " unlocked" : " locked";
      const when = b.unlocked && dates[b.id] ? prettyDate(dates[b.id]) : "";
      const frac = b.total ? Math.min(100, (b.progress / b.total) * 100) : 0;
      html += '<div class="badge' + on + '">';
      html += '<div class="badge-icon">' + A.badgeSvg(b.icon, b.unlocked) + "</div>";
      html += '<div class="name">' + esc(b.name) + "</div>";
      html += '<div class="meta">' + esc(b.detail) + "</div>";
      if (!b.unlocked) {
        html += '<div class="bar"><span style="width:' + frac + '%"></span></div>';
        if (b.total > 1) html += '<div class="tiny muted">' + Math.min(b.total, Math.floor(b.progress)) + " / " + b.total + "</div>";
      } else if (when) {
        html += '<div class="tiny muted">Unlocked ' + when + "</div>";
      }
      html += "</div>";
    });
    html += "</div>";
    html += '<p class="disclaimer" style="margin-top:12px">Awards celebrate consistency and healthy habits. Extreme deficits or too-fast weight change do not unlock goal badges. This is encouragement, not a medical assessment.</p></div>';
    return html;
  }

  function renderPlan() {
    if (!state.plan || !state.plan.weeks || !state.plan.weeks.length) {
      state.plan = buildPlan(C.localISODate(), targets() && targets().weightLb);
      saveState();
    }
    const t = targets();
    const unit = unitLabel("w");
    const idx = currentWeekIndex();
    const drift = planDrift();
    const habits = habitsFor(t && t.intensity);
    let html = topbar("Small steps", t && t.direction === "maintain" ? "Habits to keep you steady." : "A weekly path sized to the pace you picked.");
    if (t) {
      html += '<div class="card pace-card">' + intensityBadge(t);
      const paceLb = Math.abs(t.floored || t.capped ? t.impliedWeeklyLb : t.weeklyLb);
      const paceDisp = t.units === "metric" ? C.round1(C.lbToKg(paceLb)) : C.round1(paceLb);
      const paceUnit = t.units === "metric" ? "kg" : "lb";
      html +=
        '<p style="margin:8px 0 0" class="soft">About <strong>' +
        paceDisp +
        " " +
        paceUnit +
        "</strong> a week" +
        (t.goalWeeks ? " · " + t.goalWeeks + " weeks" : t.weeksToGoal ? " · roughly " + Math.ceil(t.weeksToGoal / 7) + " weeks" : "") +
        (t.goalDate ? " · " + prettyDate(t.goalDate) : "") +
        ".</p>";
      html += '<p class="tiny muted" style="margin:6px 0 0">' + esc(t.intensityHint) + "</p>";
      if (t.intensity === "too_fast" && t.safeDate) {
        html +=
          '<div class="note" style="margin-top:10px">This date is faster than recommended. Earliest safer date: ' +
          prettyDate(t.safeDate) +
          '. <button class="btn-text" type="button" data-act="pace-recommended">Use recommended pace</button></div>';
      }
      html += '<button class="btn btn-ghost btn-block" style="margin-top:10px" data-act="goto-profile">Adjust time frame</button></div>';
    }

    html += awardsTeaser();

    if (drift && drift.kind !== "on") {
      html +=
        '<div class="note ' +
        (drift.kind === "ahead" ? "sage" : "") +
        '">' +
        (drift.kind === "ahead"
          ? "You’re a little ahead of this week’s target. Nice work — we can ease the upcoming weeks if you like."
          : "You’re a little behind this week. No stress — we can gently rebase the plan from where you are now.") +
        ' <button class="btn-text" data-act="recalc-plan">Recalculate plan</button></div>';
    } else if (drift && drift.kind === "on") {
      html += '<div class="note sage">You’re right about on pace. Keep the small steps going.</div>';
    }

    const weeks = state.plan.weeks;
    weeks.forEach((w, i) => {
      const current = i === idx;
      const prog = habitProgress(w);
      html += '<div class="card week' + (current ? " current" : "") + '">';
      html += '<div class="row"><div><div class="pill">' + (current ? "This week" : "Week " + (i + 1)) + "</div>";
      html += '<div class="soft" style="margin-top:6px">' + prettyDate(w.start) + " – " + prettyDate(C.addDaysISO(w.start, 6)) + "</div></div>";
      html += '<div class="kcal">→ ' + displayWeight(w.targetWeight) + " " + unit + "</div></div>";
      habits.forEach((h) => {
        let done = 0;
        let target = h.target;
        if (h.auto === "fullDays") done = prog.fullDays;
        else if (h.auto === "proteinDays") done = prog.proteinDays;
        else if (h.auto === "weighIns") done = prog.weighIns;
        else done = Number(w.checks[h.id] || 0);
        const checked = done >= target;
        html += '<div class="habit">';
        if (h.manual) {
          html +=
            '<input type="checkbox" ' +
            (checked ? "checked" : "") +
            ' data-act="habit-toggle" data-week="' +
            i +
            '" data-habit="' +
            h.id +
            '" data-target="' +
            target +
            '">';
        } else {
          html += '<input type="checkbox" disabled ' + (checked ? "checked" : "") + ">";
        }
        html += "<div><div class=\"name\">" + h.label + "</div><div class=\"meta\">" + h.detail + "</div>";
        html += '<div class="bar"><span style="width:' + Math.min(100, (done / target) * 100) + '%"></span></div>';
        html += '<div class="tiny muted">' + done + " / " + target + "</div></div></div>";
      });
      html += "</div>";
    });
    html += '<button class="btn btn-ghost btn-block" style="margin-top:12px" data-act="recalc-plan">Recalculate from latest weight</button>';
    html += '<p class="disclaimer" style="margin-top:14px">Weekly targets are an estimate, not medical advice.</p>';
    return html;
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const p = state.profile;
    const t = targets();
    const unitW = unitLabel("w");
    const unitH = unitLabel("h");
    let html = topbar("You", "Targets, units, and backups.");
    html += '<div class="card"><h2>About you</h2><div class="grid-2">';
    html += field("Age", "p-age", p.age, "number");
    html += '<label class="field">Sex<select id="p-sex"><option value="female"' + (p.sex === "female" ? " selected" : "") + '>Female</option><option value="male"' + (p.sex === "male" ? " selected" : "") + '>Male</option><option value="other"' + (p.sex === "other" ? " selected" : "") + ">Other / prefer not to say</option></select></label>";
    html += field("Weight (" + unitW + ")", "p-weight", p.weight, "number");
    html += field("Height (" + unitH + ")", "p-height", p.height, "number");
    html += field("Goal weight (" + unitW + ")", "p-goal", p.goalWeight, "number");
    html += '<label class="field">Activity<select id="p-activity">' + activityOptions(p.activity) + "</select></label>";
    html += "</div>";
    html += '<div class="field" style="margin-top:12px">Units<div class="segmented" style="margin-top:6px">';
    html += '<button type="button" class="' + (p.units !== "metric" ? "on" : "") + '" data-act="units" data-u="us">lb / in</button>';
    html += '<button type="button" class="' + (p.units === "metric" ? "on" : "") + '" data-act="units" data-u="metric">kg / cm</button></div></div>';
    html += renderPaceEditor("p", p, false);
    html += '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="save-profile">Update &amp; refresh targets</button></div>';

    if (t) {
      html += '<div class="card"><h2>Daily targets</h2>';
      html += '<p class="hint" style="margin-top:0">BMR ' + fmtKcal(t.bmr) + " · estimated burn " + fmtKcal(t.tdee) + " kcal. You can edit these.</p>";
      html += '<div class="grid-2">';
      html += field("Calories", "p-cal", p.manualCalories ? p.calorieTarget : t.calorieTarget, "number");
      html += field("Weekly change (" + (p.units === "metric" ? "kg" : "lb") + ")", "p-weekly", p.units === "metric" ? C.round1(C.lbToKg(p.weeklyLb != null ? p.weeklyLb : t.weeklyLb)) : (p.weeklyLb != null ? p.weeklyLb : t.weeklyLb), "number");
      html += field("Protein (g)", "p-pro", p.manualMacros ? p.proteinG : t.proteinG, "number");
      html += field("Carbs (g)", "p-carb", p.manualMacros ? p.carbsG : t.carbsG, "number");
      html += field("Fat (g)", "p-fat", p.manualMacros ? p.fatG : t.fatG, "number");
      html += "</div>";
      if (t.floored) html += '<div class="note">Calories were raised to a sensible floor (' + t.floor + " kcal) so the weekly pace may be a little slower than requested.</div>";
      html += '<p class="disclaimer" style="margin-top:12px">These numbers are an estimate based on the Mifflin-St Jeor equation, not medical advice. If you have a health condition, are pregnant, or have a history of disordered eating, please talk with a clinician before changing how you eat.</p>';
      html += '<button class="btn btn-ghost btn-block" data-act="save-targets">Save target edits</button></div>';
    }

    const pal = currentPalette();
    html += '<div class="card"><h2>Appearance</h2>';
    html += '<div class="field-label">Color scheme</div><div class="palette-grid">';
    PALETTES.forEach((item) => {
      const on = pal.id === item.id ? " on" : "";
      html +=
        '<button type="button" class="palette-swatch' +
        on +
        '" data-act="palette" data-p="' +
        item.id +
        '"><span class="dots" style="background:' +
        item.swatch +
        '"></span><span>' +
        item.label +
        '<span class="hint">' +
        item.hint +
        "</span></span></button>";
    });
    html += '</div><div class="field-label" style="margin-top:14px">Light &amp; dark</div><div class="segmented">';
    ["system", "light", "dark"].forEach((th) => {
      const on = (state.settings.theme || "system") === th ? "on" : "";
      const label = th === "system" ? "System" : th[0].toUpperCase() + th.slice(1);
      html += '<button class="' + on + '" data-act="theme" data-th="' + th + '">' + label + "</button>";
    });
    html += "</div></div>";

    if (deferredInstall) {
      html += '<div class="card"><h2>Add to Home screen</h2><p class="soft">Install Prep &amp; Progress like a real app.</p><button class="btn btn-primary btn-block" data-act="install">Install</button></div>';
    } else {
      html += '<div class="card"><h2>Add to Home screen</h2><p class="soft tiny">On iPhone: open this app in <strong>Safari</strong>, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. On Android (Chrome or Samsung Internet): menu → <strong>Add to Home screen</strong> or <strong>Install app</strong>. Needs https or localhost — not a raw file. After the first visit, it works offline.</p></div>';
    }

    html += accountCard();

    html += '<div class="card"><h2>Backup</h2><p class="hint" style="margin-top:0">Your journal, meals, weight, recipes, and profile travel together. A signed-in account is optional — JSON export still works offline.</p><div class="btn-row">';
    html += '<button class="btn btn-outline" data-act="export-backup">Export JSON</button>';
    html += '<button class="btn btn-outline" data-act="export-journal-csv">Journal CSV</button></div>';
    html += '<label class="btn btn-ghost btn-block" style="margin-top:10px">Import backup JSON<input type="file" id="import-backup" accept="application/json,.json" hidden></label></div>';
    html += '<button class="btn btn-danger btn-block" data-act="reset-data">Erase all my data…</button>';
    return html;
  }
  function field(label, id, val, type) {
    return (
      '<label class="field">' +
      esc(label) +
      '<input id="' +
      id +
      '" type="' +
      (type || "text") +
      '" value="' +
      esc(val == null ? "" : val) +
      '" inputmode="' +
      (type === "number" ? "decimal" : "text") +
      '"></label>'
    );
  }
  function activityOptions(sel) {
    return Object.keys(C.ACTIVITY)
      .map((k) => {
        const a = C.ACTIVITY[k];
        return '<option value="' + k + '"' + (sel === k ? " selected" : "") + ">" + a.label + " — " + a.hint + "</option>";
      })
      .join("");
  }

  /* ---------- Onboarding ---------- */
  function renderOnboarding() {
    const s = onb.step;
    const d = onb.draft;
    let body = '<div class="steps-dot">' + [0, 1, 2, 3].map((i) => "<span class=\"" + (i === s ? "on" : "") + "\"></span>").join("") + "</div>";
    if (s === 0) {
      body +=
        '<div class="onboard-hero"><div class="boot-mark" style="margin-bottom:18px">' +
        ICONS.prep +
        "</div><h1>Prep &amp; Progress</h1><p class=\"lede\">Meal-prep macros, a food journal, and small weekly steps — friendly, offline, and on your phone.</p></div>";
      body += '<button class="btn btn-primary btn-block" data-onb="next">Let’s get started</button>';
    } else if (s === 1) {
      body += "<h1>About you</h1><p class=\"lede\">We’ll use this to estimate energy needs. You can change it anytime.</p>";
      body += '<div class="grid-2" style="margin-top:16px">';
      body += field("Age", "o-age", d.age, "number");
      body += '<label class="field">Sex<select id="o-sex"><option value="" disabled' + (!d.sex ? " selected" : "") + ">Choose…</option><option value=\"female\"" + (d.sex === "female" ? " selected" : "") + ">Female</option><option value=\"male\"" + (d.sex === "male" ? " selected" : "") + ">Male</option><option value=\"other\"" + (d.sex === "other" ? " selected" : "") + ">Other / prefer not to say</option></select></label>";
      body += "</div>";
      body += '<div class="field" style="margin:14px 0 8px">Units<div class="segmented" style="margin-top:6px">';
      body += '<button type="button" class="' + (d.units !== "metric" ? "on" : "") + '" data-onb="units" data-u="us">lb / in</button>';
      body += '<button type="button" class="' + (d.units === "metric" ? "on" : "") + '" data-onb="units" data-u="metric">kg / cm</button></div></div>';
      body += '<div class="grid-2">';
      body += field("Current weight (" + (d.units === "metric" ? "kg" : "lb") + ")", "o-weight", d.weight, "number");
      body += field("Height (" + (d.units === "metric" ? "cm" : "in") + ")", "o-height", d.height, "number");
      body += "</div>";
      body += '<div class="btn-row" style="margin-top:20px"><button class="btn btn-ghost" data-onb="back">Back</button><button class="btn btn-primary" data-onb="next">Continue</button></div>';
    } else if (s === 2) {
      body += "<h1>Where you’re headed</h1><p class=\"lede\">Set a goal weight and a time frame. We’ll show how intense that plan would feel — you can always pick a gentler pace.</p>";
      body += '<label class="field" style="margin-top:16px">Activity level<select id="o-activity">' + activityOptions(d.activity) + "</select></label>";
      body += field("Goal weight (" + (d.units === "metric" ? "kg" : "lb") + ")", "o-goal", d.goalWeight, "number");
      body += renderPaceEditor("o", d, true);
      body += '<div class="btn-row" style="margin-top:20px"><button class="btn btn-ghost" data-onb="back">Back</button><button class="btn btn-primary" data-onb="next">See my plan</button></div>';
    } else {
      const preview = previewTargets();
      body += "<h1>Your starting plan</h1>";
      if (preview.error) {
        body += '<div class="note">' + esc(preview.error) + "</div>";
      } else {
        const t = preview;
        body += '<div class="card" style="margin:12px 0"><div class="row"><div><div class="muted tiny">Daily calories</div><div class="val" style="font-size:2rem;font-weight:750;letter-spacing:-0.03em">' + fmtKcal(t.calorieTarget) + "</div></div><div class=\"soft tiny\">P " + t.proteinG + " · C " + t.carbsG + " · F " + t.fatG + "</div></div>";
        body += '<div style="margin-top:10px">' + intensityBadge(t) + "</div>";
        body += '<p class="hint">Estimated burn ' + fmtKcal(t.tdee) + " kcal · " + fmtWeekly(t, t.weeklyDisplayLb != null ? t.weeklyDisplayLb : t.weeklyLb) + (t.calorieDelta ? " · " + (t.calorieDelta >= 0 ? "+" : "") + fmtKcal(t.calorieDelta) + " kcal/day" : "") + ".</p>";
        if (t.goalDate) body += '<p class="soft tiny">Target date ' + prettyDate(t.goalDate) + (t.goalWeeks ? " · " + t.goalWeeks + " weeks" : "") + ".</p>";
        body += '<p class="soft tiny">' + esc(t.intensityHint) + "</p>";
        if (t.intensity === "too_fast" && t.safeDate) {
          body += '<div class="note">The earliest recommended date is ' + prettyDate(t.safeDate) + '. <button class="btn-text" type="button" data-onb="recommended">Use recommended pace</button></div>';
        }
        if (t.floored) body += '<div class="note">We kept calories at a sensible floor (' + t.floor + " kcal). The weekly pace may be slower, and that’s okay.</div>";
        body += "</div>";
        body += renderPaceEditor("o", d, true);
        body += '<p class="disclaimer">This is an estimate, not medical advice. It uses the Mifflin-St Jeor equation and a cautious pace. Talk with a clinician if you have a health condition, are pregnant, or have a history of disordered eating.</p>';
      }
      body += '<div class="btn-row" style="margin-top:20px"><button class="btn btn-ghost" data-onb="back">Back</button><button class="btn btn-primary" data-onb="finish">Let’s go</button></div>';
    }
    return '<div class="onboard">' + body + "</div>";
  }
  function readOnb() {
    const g = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };
    const d = onb.draft;
    if (document.getElementById("o-age")) d.age = g("o-age");
    if (document.getElementById("o-sex")) d.sex = g("o-sex");
    if (document.getElementById("o-weight")) d.weight = g("o-weight");
    if (document.getElementById("o-height")) d.height = g("o-height");
    if (document.getElementById("o-activity")) d.activity = g("o-activity");
    if (document.getElementById("o-goal")) d.goalWeight = g("o-goal");
  }
  function previewTargets() {
    const d = onb.draft;
    const err = C.validateStats({
      age: d.age,
      weight: d.weight,
      height: d.height,
      goalWeight: d.goalWeight,
      units: d.units,
    });
    if (!d.sex) return { error: "Please choose a sex so we can estimate energy needs." };
    if (err) return { error: err };
    if (!d.age || !d.weight || !d.height || !d.goalWeight) return { error: "Please fill in age, sex, height, weight, and a goal." };
    const src = withPaceDefaults(d);
    try {
      const t = C.computeTargets(paceInput(src));
      t.weeklyDisplay = t.units === "metric" ? C.round1(C.lbToKg(t.weeklyLb)) : t.weeklyLb;
      t.weeklyDisplayLb = t.weeklyLb;
      d.weeklyLb = t.weeklyLb;
      d.goalWeeks = t.goalWeeks;
      d.goalDate = t.goalDate;
      if (!d.paceMode) d.paceMode = "timeframe";
      return t;
    } catch (e) {
      return { error: "Could not compute targets. Check the numbers." };
    }
  }
  function bindOnboarding() {
    document.querySelectorAll("[data-onb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-onb");
        if (act === "units") {
          readOnb();
          convertDraftUnits(onb.draft, btn.getAttribute("data-u"));
          render();
          return;
        }
        if (act === "pace-weeks") {
          readOnb();
          applyPaceTo(onb.draft, "weeks", btn.getAttribute("data-weeks"));
          render();
          return;
        }
        if (act === "pace-intensity") {
          readOnb();
          applyPaceTo(onb.draft, "intensity", btn.getAttribute("data-id"));
          render();
          return;
        }
        if (act === "recommended") {
          readOnb();
          applyPaceTo(onb.draft, "recommended");
          render();
          return;
        }
        if (act === "back") {
          readOnb();
          onb.step = Math.max(0, onb.step - 1);
          render();
          return;
        }
        if (act === "next") {
          readOnb();
          if (onb.step === 1) {
            if (!onb.draft.sex) {
              toast("Age, sex, height, and weight help us estimate energy.");
              return;
            }
            const err1 = C.validateStats({
              age: onb.draft.age,
              weight: onb.draft.weight,
              height: onb.draft.height,
              units: onb.draft.units,
            });
            if (err1) {
              toast(err1);
              return;
            }
          }
          if (onb.step === 2) {
            if (!onb.draft.goalWeight) {
              toast("Add a goal weight — even a small one.");
              return;
            }
            const err2 = C.validateStats({
              age: onb.draft.age,
              weight: onb.draft.weight,
              height: onb.draft.height,
              goalWeight: onb.draft.goalWeight,
              units: onb.draft.units,
            });
            if (err2) {
              toast(err2);
              return;
            }
          }
          onb.step++;
          render();
          return;
        }
        if (act === "finish") {
          readOnb();
          const t = previewTargets();
          if (t.error) {
            toast(t.error);
            return;
          }
          const d = onb.draft;
          state.profile = {
            age: Number(d.age),
            sex: d.sex,
            units: d.units,
            weight: Number(d.weight),
            height: Number(d.height),
            goalWeight: Number(d.goalWeight),
            activity: d.activity,
            weeklyLb: t.weeklyLb,
            goalWeeks: t.goalWeeks || d.goalWeeks || "",
            goalDate: t.goalDate || d.goalDate || "",
            intensity: t.intensity || d.intensity || "",
            paceMode: d.paceMode || "timeframe",
            manualCalories: false,
            manualMacros: false,
            startedOn: C.localISODate(),
          };
          const first = {
            date: C.localISODate(),
            weight: Number(d.weight),
          };
          state.weights = [first];
          state.plan = buildPlan(C.localISODate(), t.weightLb);
          saveState();
          tab = "today";
          if (rootCloud() && !rootCloud().isSignedIn() && !(state.settings && state.settings.dismissedSyncNudge)) {
            syncNudge = true;
          }
          toast("Welcome. Your journal starts today.");
        }
      });
    });
    const dateEl = document.getElementById("o-goal-date");
    if (dateEl) {
      dateEl.addEventListener("change", () => {
        readOnb();
        if (dateEl.value === onb.draft.goalDate) return;
        applyPaceTo(onb.draft, "date", dateEl.value);
        render();
      });
    }
    const goalEl = document.getElementById("o-goal");
    if (goalEl) {
      goalEl.addEventListener("change", () => {
        readOnb();
        render();
      });
    }
    const actEl = document.getElementById("o-activity");
    if (actEl) {
      actEl.addEventListener("change", () => {
        readOnb();
        render();
      });
    }
  }

  /* ---------- Sheets ---------- */
  function renderSheet() {
    const s = sheet;
    let inner = '<div class="sheet-handle"></div>';
    if (s.type === "log-food") inner += sheetLogFood();
    else if (s.type === "log-amount") inner += sheetLogAmount();
    else if (s.type === "edit-entry") inner += sheetEditEntry();
    else if (s.type === "food-detail") inner += sheetFoodDetail();
    else if (s.type === "add-custom") inner += sheetAddCustom();
    else if (s.type === "import-foods") inner += sheetImportFoods();
    else if (s.type === "recipe-edit") inner += sheetRecipeEdit();
    else if (s.type === "log-recipe") inner += sheetLogRecipe();
    else if (s.type === "weigh-in") inner += sheetWeighIn();
    else if (s.type === "sign-in") inner += sheetSignIn();
    else if (s.type === "sync-conflict") inner += sheetSyncConflict();
    else inner += "<h2>Hmm</h2><p>Something went missing.</p>";
    return '<div class="backdrop" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true">' + inner + "</div>";
  }
  function mealSelect(current) {
    return (
      '<label class="field">Meal<select id="s-meal">' +
      MEALS.map((m) => '<option value="' + m.id + '"' + (current === m.id ? " selected" : "") + ">" + m.label + "</option>").join("") +
      "</select></label>"
    );
  }
  function sheetLogFood() {
    const q = sQuery();
    let html = "<h2>Log a food</h2>" + mealSelect(sheet.meal || "breakfast");
    html += '<div class="search-box" style="margin-top:10px">' + ICONS.search + '<input type="search" id="sheet-q" placeholder="Search foods…" value="' + esc(q) + '" autocomplete="off"></div>';
    html += '<div id="sheet-results">';
    html += searchFoods(q, 25)
      .map((f) => {
        return (
          '<button class="food-row" data-act="pick-food" data-id="' +
          esc(f.id) +
          '"><div><div class="name">' +
          esc(displayName(f.name)) +
          '</div><div class="meta">' +
          fmtKcal(f.kcal) +
          " kcal / 100 g</div></div></button>"
        );
      })
      .join("") || '<p class="muted">No matches.</p>';
    html += "</div>";
    html += '<button class="btn btn-ghost btn-block" style="margin-top:8px" data-act="add-custom">Add a custom food</button>';
    return html;
  }
  function sQuery() {
    return sheet.q != null ? sheet.q : foodsQuery;
  }
  function sheetLogAmount() {
    const f = findFood(sheet.foodId) || sheet.food;
    if (!f) return "<h2>Food missing</h2>";
    const portions = f.portions || [];
    let html = "<h2>" + esc(displayName(f.name)) + "</h2>";
    html += '<p class="hint" style="margin-top:0">' + fmtKcal(f.kcal) + " kcal · " + fmtG(f.protein) + "P · " + fmtG(f.carbs) + "C · " + fmtG(f.fat) + "F per 100 g</p>";
    html += mealSelect(sheet.meal || "breakfast");
    html += '<label class="field">Portion<select id="s-portion">';
    html += '<option value="100" data-grams="100">100 g</option>';
    portions.forEach((p, i) => {
      html += '<option value="p' + i + '" data-grams="' + p.grams + '"' + (i === 0 ? " selected" : "") + ">" + esc(p.name) + " (" + fmtG(p.grams) + " g)</option>";
    });
    html += '<option value="custom">Custom grams…</option></select></label>';
    html += '<div class="grid-2"><label class="field">Quantity<input id="s-qty" type="number" inputmode="decimal" value="1"></label>';
    html += '<label class="field">Grams<input id="s-grams" type="number" inputmode="decimal" value="' + (portions[0] ? portions[0].grams : 100) + '"></label></div>';
    html += '<label class="field">Time<input id="s-time" type="time" value="' + (sheet.time || nowTime()) + '"></label>';
    html += '<label class="field">Note <span class="muted">(optional)</span><input id="s-note" type="text" placeholder="Tasted great, leftovers…"></label>';
    html += '<div class="card" id="s-preview" style="margin:12px 0"></div>';
    html += '<button class="btn btn-primary btn-block" data-act="confirm-log">Add to journal</button>';
    return html;
  }
  function sheetEditEntry() {
    const found = findEntry(sheet.day, sheet.meal, sheet.id);
    if (!found) return "<h2>That entry is gone</h2>";
    const e = found.entry;
    let html = "<h2>Edit entry</h2><p class=\"soft\" style=\"margin-top:0\">" + esc(displayName(e.name)) + "</p>";
    html += mealSelect(sheet.meal || e.meal);
    html += '<div class="grid-2"><label class="field">Grams<input id="s-grams" type="number" inputmode="decimal" value="' + esc(e.grams || "") + '"></label>';
    html += '<label class="field">Time<input id="s-time" type="time" value="' + esc(e.time || "") + '"></label></div>';
    html += '<label class="field">Portion name<input id="s-portion-name" type="text" value="' + esc(e.portionName || "") + '"></label>';
    html += '<label class="field">Note<input id="s-note" type="text" value="' + esc(e.note || "") + '" placeholder="How this meal felt"></label>';
    if (e.kind !== "recipe" && e.foodId && findFood(e.foodId)) {
      html += '<p class="hint">Macros update from the food database when you change grams.</p>';
    } else {
      html += '<div class="grid-2">';
      html += field("kcal", "s-kcal", C.round0(e.kcal), "number");
      html += field("Protein", "s-pro", C.round1(e.protein), "number");
      html += field("Carbs", "s-carb", C.round1(e.carbs), "number");
      html += field("Fat", "s-fat", C.round1(e.fat), "number");
      html += "</div>";
    }
    html += '<button class="btn btn-primary btn-block" data-act="save-entry">Save changes</button>';
    html += '<div class="btn-row" style="margin-top:10px"><button class="btn btn-ghost" data-act="relog-entry">Re-log to today</button>';
    html += '<button class="btn btn-danger" data-act="delete-entry">Delete</button></div>';
    return html;
  }
  function sheetFoodDetail() {
    const f = findFood(sheet.foodId);
    if (!f) return "<h2>Not found</h2>";
    let html = "<h2>" + esc(displayName(f.name)) + "</h2>";
    html += '<p class="soft">' + fmtKcal(f.kcal) + " kcal · " + fmtG(f.protein) + "P · " + fmtG(f.carbs) + "C · " + fmtG(f.fat) + "F per 100 g</p>";
    if (f.portions && f.portions.length) {
      html += "<h3 class=\"tiny muted\" style=\"margin:12px 0 4px\">Household portions</h3>";
      f.portions.forEach((p) => {
        const m = C.macrosForGrams(f, p.grams);
        html += '<div class="entry"><div><div class="name">' + esc(p.name) + '</div><div class="meta">' + fmtG(p.grams) + " g</div></div><div class=\"kcal\">" + fmtKcal(m.kcal) + "</div></div>";
      });
    }
    html += '<button class="btn btn-primary btn-block" data-act="pick-food" data-id="' + esc(f.id) + '">Log this food</button>';
    if (f.custom) {
      html += '<button class="btn btn-ghost btn-block" data-act="edit-custom" data-id="' + esc(f.id) + '">Edit food</button>';
      html += '<button class="btn btn-danger btn-block" data-act="delete-custom" data-id="' + esc(f.id) + '">Remove custom food</button>';
    }
    return html;
  }
  function sheetAddCustom() {
    const existing = sheet.foodId ? (state.customFoods || []).find((f) => f.id === sheet.foodId) : null;
    const serving = existing && existing.portions && existing.portions[0] ? existing.portions[0] : { name: "1 serving", grams: 100 };
    const per = existing ? Number(serving.grams) / 100 : 1;
    const kcal = existing ? C.round0(existing.kcal * per) : "";
    const pro = existing ? C.round1(existing.protein * per) : "";
    const carb = existing ? C.round1(existing.carbs * per) : "";
    const fat = existing ? C.round1(existing.fat * per) : "";
    return (
      "<h2>" + (existing ? "Edit custom food" : "Custom food") + "</h2><p class=\"hint\" style=\"margin-top:0\">Enter values for one serving. We’ll store them per 100 g so portions stay consistent.</p>" +
      '<label class="field">Name<input id="c-name" placeholder="Sunday chili" value="' + esc(existing ? existing.name : "") + '"></label>' +
      '<div class="grid-2"><label class="field">Serving name<input id="c-sname" placeholder="1 bowl" value="' + esc(serving.name || "1 serving") + '"></label>' +
      '<label class="field">Serving grams<input id="c-grams" type="number" inputmode="decimal" value="' + esc(serving.grams || 100) + '"></label></div>' +
      '<div class="grid-2">' +
      field("kcal", "c-kcal", kcal, "number") +
      field("Protein (g)", "c-pro", pro, "number") +
      field("Carbs (g)", "c-carb", carb, "number") +
      field("Fat (g)", "c-fat", fat, "number") +
      "</div>" +
      '<button class="btn btn-primary btn-block" data-act="save-custom">' + (existing ? "Save changes" : "Save food") + "</button>"
    );
  }
  function sheetImportFoods() {
    return (
      "<h2>Import foods</h2><p class=\"hint\" style=\"margin-top:0\">CSV or JSON with columns <code>name,serving_name,serving_grams,kcal,protein,carbs,fat</code>. Values are for that serving, not per 100 g.</p>" +
      '<a class="btn btn-ghost btn-block" href="./data/import-template.csv" download="prep-progress-foods-template.csv">Download CSV template</a>' +
      '<label class="btn btn-primary btn-block" style="margin-top:10px">Choose a file<input type="file" id="import-foods-file" accept=".csv,.json,text/csv,application/json" hidden></label>'
    );
  }
  function sheetRecipeEdit() {
    const r = sheet.recipe || { name: "", servings: 4, items: [] };
    let html = "<h2>" + (r.id ? "Edit recipe" : "New recipe") + "</h2>";
    html += '<label class="field">Name<input id="r-name" value="' + esc(r.name) + '" placeholder="Chicken burrito bowls"></label>';
    html += '<label class="field">Number of servings<input id="r-servings" type="number" inputmode="decimal" value="' + esc(r.servings || 4) + '"></label>';
    html += "<h3 class=\"tiny\" style=\"margin:12px 0 6px\">Ingredients</h3>";
    (r.items || []).forEach((it, i) => {
      html +=
        '<div class="entry"><div><div class="name">' +
        esc(it.name) +
        '</div><div class="meta">' +
        fmtG(it.grams) +
        " g · " +
        fmtKcal(it.kcal) +
        ' kcal</div></div><button class="del" data-act="r-del" data-i="' +
        i +
        '">×</button></div>';
    });
    html += '<div class="search-box">' + ICONS.search + '<input type="search" id="sheet-q" placeholder="Add a food…" value="' + esc(sheet.q || "") + '" autocomplete="off"></div>';
    html += '<div id="sheet-results">';
    if (sheet.q) {
      html += searchFoods(sheet.q, 12)
        .map((f) => '<button class="food-row" data-act="r-add" data-id="' + esc(f.id) + '"><div class="name">' + esc(displayName(f.name)) + "</div></button>")
        .join("");
    }
    html += "</div>";
    if (sheet.adding) {
      const f = findFood(sheet.adding);
      if (f) {
        html += '<div class="note">Add ' + esc(displayName(f.name)) + ' · grams <input id="r-grams" type="number" value="' + (f.portions && f.portions[0] ? f.portions[0].grams : 100) + '" style="width:90px;min-height:40px;display:inline-block"> <button class="btn btn-primary" data-act="r-add-confirm" data-id="' + f.id + '">Add</button></div>';
      }
    }
    const per = C.recipePerServing(r.items || [], Number(r.servings));
    if (per.invalid) html += '<div class="note">Enter a serving count greater than zero.</div>';
    html += '<p class="soft">Per serving: ' + fmtKcal(per.kcal) + " kcal · " + fmtG(per.protein) + "P · " + fmtG(per.carbs) + "C · " + fmtG(per.fat) + "F</p>";
    html += '<button class="btn btn-primary btn-block" data-act="save-recipe">Save recipe</button>';
    if (r.id) html += '<button class="btn btn-danger btn-block" data-act="delete-recipe">Delete recipe</button>';
    return html;
  }
  function sheetLogRecipe() {
    const r = (state.recipes || []).find((x) => x.id === sheet.recipeId);
    if (!r) return "<h2>Recipe missing</h2>";
    const per = C.recipePerServing(r.items || [], r.servings || 1);
    let html = "<h2>Log " + esc(r.name) + "</h2>";
    html += '<p class="hint">' + fmtKcal(per.kcal) + " kcal per serving</p>";
    html += mealSelect(sheet.meal || "lunch");
    html += '<label class="field">Servings<input id="s-qty" type="number" inputmode="decimal" value="1"></label>';
    html += '<label class="field">Time<input id="s-time" type="time" value="' + nowTime() + '"></label>';
    html += '<label class="field">Note <span class="muted">(optional)</span><input id="s-note" type="text"></label>';
    html += '<button class="btn btn-primary btn-block" data-act="confirm-log-recipe">Add to journal</button>';
    return html;
  }
  function sheetWeighIn() {
    const unit = unitLabel("w");
    const last = lastItem((state.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date)));
    return (
      "<h2>Weigh-in</h2>" +
      '<label class="field">Date<input id="w-date" type="date" value="' +
      C.localISODate() +
      '"></label>' +
      '<label class="field">Weight (' +
      unit +
      ')<input id="w-weight" type="number" inputmode="decimal" value="' +
      esc(last ? last.weight : state.profile.weight) +
      '"></label>' +
      '<button class="btn btn-primary btn-block" data-act="save-weight">Save</button>'
    );
  }

  function findEntry(day, meal, id) {
    const d = getDay(day);
    const list = d[meal] || [];
    const i = list.findIndex((e) => e.id === id);
    if (i < 0) return null;
    return { day: d, list, index: i, entry: list[i] };
  }
  function entryFromFood(food, grams, extra) {
    const m = C.macrosForGrams(food, grams);
    return Object.assign(
      {
        id: uid("e"),
        foodId: food.id,
        name: food.name,
        grams: C.round1(grams),
        kcal: m.kcal,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        kind: "food",
        time: nowTime(),
        note: "",
      },
      extra || {}
    );
  }
  function addEntry(iso, meal, entry) {
    const d = dayLog(iso);
    entry.meal = meal;
    if (!entry.time) entry.time = nowTime();
    if (!entry.loggedAt) entry.loggedAt = new Date().toISOString();
    d[meal].push(entry);
    saveState();
  }
  function cloneEntry(e) {
    const copy = Object.assign({}, e, { id: uid("e"), time: nowTime(), loggedAt: new Date().toISOString() });
    return copy;
  }
  function relogEntry(e, meal, toDay) {
    addEntry(toDay || C.localISODate(), meal || e.meal, cloneEntry(e));
    toast("Re-logged to " + ((toDay || C.localISODate()) === C.localISODate() ? "today" : prettyDate(toDay)));
  }
  function relogMeal(fromDay, meal, toDay) {
    const items = (getDay(fromDay)[meal] || []).map(cloneEntry);
    if (!items.length) {
      toast("Nothing in that meal to re-log.");
      return;
    }
    items.forEach((e) => addEntry(toDay || C.localISODate(), meal, e));
    toast("Re-logged " + mealLabel(meal).toLowerCase() + " (" + items.length + ")");
  }

  /* ---------- Export ---------- */
  function csvEscape(v) {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCSV(rows) {
    return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  }
  function journalCSV() {
    const header = ["date", "time", "meal", "food", "portion", "grams", "kcal", "protein", "carbs", "fat", "entry_note", "day_note", "hunger", "mood", "felt"];
    const rows = [header];
    Object.keys(state.logs)
      .sort()
      .forEach((date) => {
        const d = migrateDay(state.logs[date]);
        const entries = MEALS.flatMap((m) => (d[m.id] || []).map((e) => Object.assign({ meal: e.meal || m.id }, e)));
        entries.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        if (!entries.length && (d.note || d.hunger || d.mood || d.felt)) {
          rows.push([date, "", "", "", "", "", "", "", "", "", "", d.note || "", d.hunger || "", d.mood || "", d.felt || ""]);
        }
        entries.forEach((e) => {
          rows.push([
            date,
            e.time || "",
            e.meal || "",
            e.name || "",
            e.portionName || "",
            e.grams || "",
            C.round1(e.kcal),
            C.round1(e.protein),
            C.round1(e.carbs),
            C.round1(e.fat),
            e.note || "",
            d.note || "",
            d.hunger || "",
            d.mood || "",
            d.felt || "",
          ]);
        });
      });
    return toCSV(rows);
  }
  function sheetSignIn() {
    const s = sheet;
    const step = s.step || "email";
    let html = "<h2>Sign in with email</h2>";
    if (s.error) html += '<div class="note">' + esc(s.error) + "</div>";
    if (step === "email") {
      html += '<p class="hint" style="margin-top:0">We’ll email a sign-in link. Open it on this phone to connect your backup.</p>';
      html += iphoneSignInNote();
      html += '<label class="field">Email<input id="auth-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="' + esc(s.email || "") + '"></label>';
      html += '<button class="btn btn-primary btn-block" data-act="send-otp"' + (authBusy ? " disabled" : "") + ">" + (authBusy ? "Sending…" : "Email me a sign-in link") + "</button>";
      html += '<button class="btn btn-ghost btn-block" data-act="signin-code">Have a code?</button>';
    } else if (step === "check") {
      html += '<p class="soft">Check your email and tap the link on this phone. We sent it to <strong>' + esc(s.email) + "</strong>.</p>";
      html += iphoneSignInNote();
      html += '<button class="btn btn-ghost btn-block" data-act="send-otp"' + (authBusy ? " disabled" : "") + ">" + (authBusy ? "Sending…" : "Resend link") + "</button>";
      html += '<button class="btn btn-ghost btn-block" data-act="signin-code">Have a code?</button>';
      html += '<button class="btn btn-ghost btn-block" data-act="signin-email">Use a different email</button>';
    } else {
      html += '<p class="hint" style="margin-top:0">If your email includes a 6-digit code, enter it here. Default emails only have a link — that’s okay, use the link instead.</p>';
      html += '<label class="field">Code<input id="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]*" placeholder="123456"></label>';
      html += '<button class="btn btn-primary btn-block" data-act="verify-otp"' + (authBusy ? " disabled" : "") + ">" + (authBusy ? "Checking…" : "Verify code") + "</button>";
      html += '<button class="btn btn-ghost btn-block" data-act="signin-check">Back to the email link</button>';
      html += '<button class="btn btn-ghost btn-block" data-act="signin-email">Use a different email</button>';
    }
    html += '<p class="disclaimer" style="margin-top:14px">Optional. Your journal already lives on this phone, even if you skip this.</p>';
    return html;
  }

  function sheetSyncConflict() {
    const s = sheet;
    const fmt = (iso) => {
      if (!iso) return "unknown time";
      try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      } catch (err) {
        return String(iso);
      }
    };
    const summarize = (data) => {
      if (!data) return "No copy";
      const logs = data.logs ? Object.keys(data.logs).length : 0;
      const weights = (data.weights && data.weights.length) || 0;
      const recipes = (data.recipes && data.recipes.length) || 0;
      return logs + " journal days · " + weights + " weigh-ins · " + recipes + " recipes";
    };
    let html = "<h2>Two copies of your data</h2>";
    html += '<p class="soft" style="margin-top:0">This phone and your cloud backup both have a journal. Pick which one to keep. After this, the newest save wins automatically.</p>';
    html += '<div class="card" style="margin:10px 0"><div class="muted tiny">This phone</div><p class="soft" style="margin:4px 0 0">' + esc(summarize(s.local)) + '</p><p class="tiny muted">Edited ' + esc(fmt(s.localAt)) + "</p></div>";
    html += '<div class="card"><div class="muted tiny">Cloud</div><p class="soft" style="margin:4px 0 0">' + esc(summarize(s.cloud)) + '</p><p class="tiny muted">Saved ' + esc(fmt(s.cloudAt)) + "</p></div>";
    html += '<button class="btn btn-primary btn-block" data-act="resolve-conflict" data-choice="local">Keep this phone’s data</button>';
    html += '<button class="btn btn-outline btn-block" data-act="resolve-conflict" data-choice="cloud">Use the cloud copy</button>';
    html += '<button class="btn btn-ghost btn-block" data-act="resolve-conflict" data-choice="newest">Use whichever is newer</button>';
    return html;
  }

  function backupJSON() {
    return JSON.stringify(
      {
        app: "Prep & Progress",
        version: 2,
        exportedAt: new Date().toISOString(),
        profile: state.profile,
        logs: state.logs,
        weights: state.weights,
        recipes: state.recipes,
        customFoods: state.customFoods,
        plan: state.plan,
        settings: state.settings,
        achievements: state.achievements,
      },
      null,
      2
    );
  }
  function isIOS() {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function downloadFile(name, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const go = async () => {
      try {
        const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name });
          return "shared";
        }
      } catch (err) {
        if (err && err.name === "AbortError") return "aborted";
      }
      const url = URL.createObjectURL(blob);
      if (isIOS()) {
        const opened = window.open(url, "_blank");
        if (!opened) {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return "opened";
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return "downloaded";
    };
    return go();
  }
  function importBackup(obj) {
    if (!obj || (obj.app && obj.app !== "Prep & Progress" && !obj.profile && !obj.logs)) {
      throw new Error("This file does not look like a Prep & Progress backup.");
    }
    const next = defaultState();
    next.profile = obj.profile || null;
    next.logs = obj.logs || {};
    next.weights = obj.weights || [];
    next.recipes = obj.recipes || [];
    next.customFoods = obj.customFoods || [];
    next.plan = obj.plan || null;
    next.settings = Object.assign({ theme: "dark", palette: "midnight" }, obj.settings || {});
    next.achievements = Object.assign({ unlocked: {}, seen: {} }, obj.achievements || {});
    state = next;
    saveState();
  }
  function importUserFoods(text, filename) {
    let rows = [];
    const trimmed = text.trim();
    if (filename.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const data = JSON.parse(trimmed);
      const list = Array.isArray(data) ? data : data.foods || [];
      rows = list.map((x) => ({
        name: x.name,
        serving_name: x.serving_name || x.servingName || "1 serving",
        serving_grams: Number(x.serving_grams || x.servingGrams || 100),
        kcal: Number(x.kcal),
        protein: Number(x.protein),
        carbs: Number(x.carbs),
        fat: Number(x.fat),
      }));
    } else {
      const parsed = C.parseCSV(text);
      if (!parsed.length) throw new Error("No rows found.");
      const head = parsed[0].map((h) => h.trim().toLowerCase());
      const idx = (n) => head.indexOf(n);
      const need = ["name", "serving_name", "serving_grams", "kcal", "protein", "carbs", "fat"];
      need.forEach((n) => {
        if (idx(n) < 0) throw new Error("Missing column: " + n);
      });
      rows = parsed.slice(1).map((r) => ({
        name: r[idx("name")],
        serving_name: r[idx("serving_name")],
        serving_grams: Number(r[idx("serving_grams")]),
        kcal: Number(r[idx("kcal")]),
        protein: Number(r[idx("protein")]),
        carbs: Number(r[idx("carbs")]),
        fat: Number(r[idx("fat")]),
      }));
    }
    let added = 0;
    rows.forEach((r) => {
      const name = (r.name || "").trim();
      const grams = Number(r.serving_grams);
      const kcal = Number(r.kcal);
      const protein = Number(r.protein);
      const carbs = Number(r.carbs);
      const fat = Number(r.fat);
      if (!name || !isFinite(grams) || grams <= 0) return;
      if (![kcal, protein, carbs, fat].every((n) => isFinite(n) && n >= 0)) return;
      const per = 100 / grams;
      state.customFoods.push({
        id: uid("c"),
        name: name,
        kcal: C.round1(kcal * per),
        protein: C.round1(protein * per),
        carbs: C.round1(carbs * per),
        fat: C.round1(fat * per),
        portions: [{ name: r.serving_name || "1 serving", grams: C.round1(grams) }],
        custom: true,
      });
      added++;
    });
    saveState();
    return added;
  }

  /* ---------- Events ---------- */
  function bindMain() {
    document.querySelectorAll(".tabbar [data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        tab = b.getAttribute("data-tab");
        lastTab = tab;
        if (tab === "journal") journalCursor = dayISO;
        sheet = null;
        render();
      });
    });
    document.querySelectorAll("[data-act]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handleAct(el.getAttribute("data-act"), el, ev);
      });
    });
    const foodsQ = document.getElementById("foods-q");
    if (foodsQ) {
      foodsQ.addEventListener("input", () => {
        foodsQuery = foodsQ.value;
        const box = document.getElementById("search-results");
        if (box) box.innerHTML = renderFoodResults(foodsQuery);
        bindResults(box);
        foodsQ.focus();
      });
    }
    const sheetQ = document.getElementById("sheet-q");
    if (sheetQ) {
      sheetQ.addEventListener("input", () => {
        if (sheet) sheet.q = sheetQ.value;
        const box = document.getElementById("sheet-results");
        if (box && sheet && sheet.type === "log-food") {
          box.innerHTML =
            searchFoods(sheetQ.value, 25)
              .map((f) => '<button class="food-row" data-act="pick-food" data-id="' + esc(f.id) + '"><div><div class="name">' + esc(displayName(f.name)) + '</div><div class="meta">' + fmtKcal(f.kcal) + " kcal / 100 g</div></div></button>")
              .join("") || '<p class="muted">No matches.</p>';
          bindResults(box);
        } else if (box && sheet && sheet.type === "recipe-edit") {
          box.innerHTML = searchFoods(sheetQ.value, 12)
            .map((f) => '<button class="food-row" data-act="r-add" data-id="' + esc(f.id) + '"><div class="name">' + esc(displayName(f.name)) + "</div></button>")
            .join("");
          bindResults(box);
        }
        sheetQ.focus();
      });
    }
    const pDate = document.getElementById("p-goal-date");
    if (pDate) {
      pDate.addEventListener("change", () => {
        const p = state.profile;
        ["p-age", "p-weight", "p-height", "p-goal"].forEach((id) => {
          const eln = document.getElementById(id);
          if (!eln) return;
          const key = { "p-age": "age", "p-weight": "weight", "p-height": "height", "p-goal": "goalWeight" }[id];
          p[key] = Number(eln.value);
        });
        if (document.getElementById("p-sex")) p.sex = document.getElementById("p-sex").value;
        if (document.getElementById("p-activity")) p.activity = document.getElementById("p-activity").value;
        if (pDate.value === p.goalDate) return;
        applyPaceTo(p, "date", pDate.value);
        render();
      });
    }
    const pGoal = document.getElementById("p-goal");
    if (pGoal && tab === "profile") {
      pGoal.addEventListener("change", () => {
        state.profile.goalWeight = Number(pGoal.value);
        render();
      });
    }
    const authEmail = document.getElementById("auth-email");
    if (authEmail) {
      authEmail.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          handleAct("send-otp", authEmail);
        }
      });
      setTimeout(() => authEmail.focus(), 50);
    }
    const authCode = document.getElementById("auth-code");
    if (authCode) {
      authCode.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          handleAct("verify-otp", authCode);
        }
      });
      setTimeout(() => authCode.focus(), 50);
    }
    const jdate = document.getElementById("journal-date");
    if (jdate) {
      jdate.addEventListener("change", () => {
        if (jdate.value) {
          journalCursor = jdate.value;
          dayISO = jdate.value;
          render();
        }
      });
    }
    const dayNote = document.getElementById("day-note");
    if (dayNote) {
      dayNote.addEventListener("change", saveDayNoteFromForm);
    }
    const importBackupEl = document.getElementById("import-backup");
    if (importBackupEl) {
      importBackupEl.addEventListener("change", async () => {
        const file = importBackupEl.files && importBackupEl.files[0];
        if (!file) return;
        try {
          const obj = JSON.parse(await file.text());
          if (!confirm("Replace your current profile, journal, and other data with this backup?")) return;
          importBackup(obj);
          applyTheme();
          toast("Backup restored.");
          tab = "today";
          render();
        } catch (err) {
          toast(err.message || "Could not import that file.");
        }
      });
    }
    const importFoodsEl = document.getElementById("import-foods-file");
    if (importFoodsEl) {
      importFoodsEl.addEventListener("change", async () => {
        const file = importFoodsEl.files && importFoodsEl.files[0];
        if (!file) return;
        try {
          const n = importUserFoods(await file.text(), file.name.toLowerCase());
          sheet = null;
          toast("Imported " + n + " custom food" + (n === 1 ? "" : "s") + ".");
          tab = "foods";
          render();
        } catch (err) {
          toast(err.message || "Could not import foods.");
        }
      });
    }
    const portion = document.getElementById("s-portion");
    const grams = document.getElementById("s-grams");
    const qty = document.getElementById("s-qty");
    if (portion && grams) {
      const sync = () => {
        const opt = portion.selectedOptions[0];
        if (portion.value !== "custom" && opt) {
          const g = Number(opt.getAttribute("data-grams") || 100);
          const q = Number(qty && qty.value ? qty.value : 1) || 1;
          grams.value = C.round1(g * q);
        }
        updateLogPreview();
      };
      portion.addEventListener("change", sync);
      if (qty) qty.addEventListener("input", sync);
      grams.addEventListener("input", () => {
        if (portion) portion.value = "custom";
        updateLogPreview();
      });
      sync();
    }
  }
  function bindResults(box) {
    if (!box) return;
    box.querySelectorAll("[data-act]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handleAct(el.getAttribute("data-act"), el, ev);
      });
    });
  }
  function updateLogPreview() {
    const box = document.getElementById("s-preview");
    if (!box || !sheet || !sheet.foodId) return;
    const f = findFood(sheet.foodId);
    if (!f) return;
    const g = Number((document.getElementById("s-grams") || {}).value || 0);
    const m = C.macrosForGrams(f, g);
    box.innerHTML = "<strong>" + fmtKcal(m.kcal) + " kcal</strong> · " + fmtG(m.protein) + "P · " + fmtG(m.carbs) + "C · " + fmtG(m.fat) + "F";
  }
  function saveDayNoteFromForm() {
    const el = document.getElementById("day-note");
    const d = dayLog(journalCursor);
    d.note = el ? el.value : d.note;
    saveState();
  }

  function handleAct(act, el) {
    const today = C.localISODate();
    if (act === "goto-profile") return goProfile();
    if (act === "back-tab") {
      tab = lastTab || "today";
      render();
      return;
    }
    if (act === "goto-journal") {
      journalCursor = dayISO;
      tab = "journal";
      lastTab = "journal";
      render();
      return;
    }
    if (act === "goto-awards") {
      lastTab = tab === "awards" ? lastTab : tab;
      tab = "awards";
      render();
      return;
    }
    if (act === "fab") {
      const mealGuess = (function () {
        const h = new Date().getHours();
        if (h < 11) return "breakfast";
        if (h < 15) return "lunch";
        if (h < 21) return "dinner";
        return "snack";
      })();
      sheet = { type: "log-food", meal: mealGuess, q: "" };
      render();
      setTimeout(() => {
        const i = document.getElementById("sheet-q");
        if (i) i.focus();
      }, 50);
      return;
    }
    if (act === "close-sheet") {
      sheet = null;
      render();
      return;
    }
    if (act === "day-prev") {
      dayISO = C.addDaysISO(dayISO, -1);
      render();
      return;
    }
    if (act === "day-next") {
      dayISO = C.addDaysISO(dayISO, 1);
      render();
      return;
    }
    if (act === "day-today") {
      dayISO = today;
      render();
      return;
    }
    if (act === "j-prev") {
      journalCursor = C.addDaysISO(journalCursor, -1);
      dayISO = journalCursor;
      render();
      return;
    }
    if (act === "j-next") {
      journalCursor = C.addDaysISO(journalCursor, 1);
      dayISO = journalCursor;
      render();
      return;
    }
    if (act === "j-today") {
      journalCursor = today;
      dayISO = today;
      render();
      return;
    }
    if (act === "cal-prev" || act === "cal-next") {
      journalCursor = C.addMonthsISO(journalCursor, act === "cal-next" ? 1 : -1);
      dayISO = journalCursor;
      render();
      return;
    }
    if (act === "cal-day") {
      journalCursor = el.getAttribute("data-day");
      dayISO = journalCursor;
      render();
      return;
    }
    if (act === "log-food") {
      sheet = { type: "log-food", meal: el.getAttribute("data-meal") || "breakfast", q: "" };
      render();
      return;
    }
    if (act === "pick-food") {
      const mealEl = document.getElementById("s-meal");
      const meal = mealEl ? mealEl.value : (sheet && sheet.meal) || "breakfast";
      sheet = { type: "log-amount", foodId: el.getAttribute("data-id"), meal: meal, time: nowTime() };
      render();
      return;
    }
    if (act === "confirm-log") {
      const f = findFood(sheet.foodId);
      const grams = Number(document.getElementById("s-grams").value || 0);
      if (!f || !grams) return toast("Add a portion amount first.");
      const meal = document.getElementById("s-meal").value;
      const portionSel = document.getElementById("s-portion");
      let portionName = "";
      if (portionSel && portionSel.value !== "custom" && portionSel.selectedOptions[0]) {
        const q = document.getElementById("s-qty");
        const qv = q ? q.value : "1";
        portionName = (qv && Number(qv) !== 1 ? qv + " × " : "") + portionSel.selectedOptions[0].textContent;
      } else {
        portionName = fmtG(grams) + " g";
      }
      const targetDay = tab === "journal" ? journalCursor : dayISO;
      addEntry(targetDay, meal, entryFromFood(f, grams, {
        portionName: portionName,
        time: document.getElementById("s-time").value,
        note: document.getElementById("s-note").value,
      }));
      sheet = null;
      toast("Added to " + mealLabel(meal).toLowerCase() + ".");
      return;
    }
    if (act === "edit-entry") {
      sheet = { type: "edit-entry", id: el.getAttribute("data-id"), meal: el.getAttribute("data-meal"), day: el.getAttribute("data-day") };
      render();
      return;
    }
    if (act === "save-entry") {
      const found = findEntry(sheet.day, sheet.meal, sheet.id);
      if (!found) return;
      const e = found.entry;
      const newMeal = document.getElementById("s-meal").value;
      const grams = Number(document.getElementById("s-grams").value || 0);
      e.grams = grams;
      e.time = document.getElementById("s-time").value;
      e.note = document.getElementById("s-note").value;
      e.portionName = document.getElementById("s-portion-name").value;
      const food = e.foodId && e.kind !== "recipe" ? findFood(e.foodId) : null;
      if (food && grams) {
        const m = C.macrosForGrams(food, grams);
        e.kcal = m.kcal;
        e.protein = m.protein;
        e.carbs = m.carbs;
        e.fat = m.fat;
      } else {
        if (document.getElementById("s-kcal")) {
          e.kcal = Number(document.getElementById("s-kcal").value || 0);
          e.protein = Number(document.getElementById("s-pro").value || 0);
          e.carbs = Number(document.getElementById("s-carb").value || 0);
          e.fat = Number(document.getElementById("s-fat").value || 0);
        }
      }
      if (newMeal !== sheet.meal) {
        found.list.splice(found.index, 1);
        dayLog(sheet.day)[newMeal].push(e);
        e.meal = newMeal;
      }
      saveState();
      sheet = null;
      toast("Entry updated.");
      return;
    }
    if (act === "delete-entry") {
      const found = findEntry(sheet.day, sheet.meal, sheet.id);
      if (found) {
        found.list.splice(found.index, 1);
        saveState();
      }
      sheet = null;
      toast("Removed from the journal.");
      return;
    }
    if (act === "relog-entry") {
      const found = findEntry(sheet.day, sheet.meal, sheet.id);
      if (found) relogEntry(found.entry, document.getElementById("s-meal") ? document.getElementById("s-meal").value : found.entry.meal, today);
      sheet = null;
      dayISO = today;
      return;
    }
    if (act === "relog-meal") {
      relogMeal(el.getAttribute("data-day"), el.getAttribute("data-meal"), today);
      return;
    }
    if (act === "day-chip") {
      const kind = el.getAttribute("data-kind");
      const id = el.getAttribute("data-id");
      const d = dayLog(journalCursor);
      d[kind] = d[kind] === id ? "" : id;
      if (document.getElementById("day-note")) d.note = document.getElementById("day-note").value;
      saveState();
      render();
      return;
    }
    if (act === "save-day-note") {
      saveDayNoteFromForm();
      toast("Day note saved.");
      return;
    }
    if (act === "food-detail") {
      sheet = { type: "food-detail", foodId: el.getAttribute("data-id") };
      render();
      return;
    }
    if (act === "add-custom") {
      sheet = { type: "add-custom" };
      render();
      return;
    }
    if (act === "edit-custom") {
      sheet = { type: "add-custom", foodId: el.getAttribute("data-id") };
      render();
      return;
    }
    if (act === "save-custom") {
      const name = (document.getElementById("c-name").value || "").trim();
      const grams = Number(document.getElementById("c-grams").value || 0);
      if (!name || !isFinite(grams) || grams <= 0) return toast("Name and serving grams are needed.");
      const kcal = Number(document.getElementById("c-kcal").value);
      const protein = Number(document.getElementById("c-pro").value);
      const carbs = Number(document.getElementById("c-carb").value);
      const fat = Number(document.getElementById("c-fat").value);
      if (![kcal, protein, carbs, fat].every((n) => isFinite(n) && n >= 0)) {
        return toast("Enter calorie and macro values of zero or more.");
      }
      const per = 100 / grams;
      const payload = {
        name: name,
        kcal: C.round1(kcal * per),
        protein: C.round1(protein * per),
        carbs: C.round1(carbs * per),
        fat: C.round1(fat * per),
        portions: [{ name: document.getElementById("c-sname").value || "1 serving", grams: C.round1(grams) }],
        custom: true,
      };
      if (sheet.foodId) {
        const i = state.customFoods.findIndex((f) => f.id === sheet.foodId);
        if (i >= 0) state.customFoods[i] = Object.assign({}, state.customFoods[i], payload);
        saveState();
        sheet = { type: "food-detail", foodId: sheet.foodId };
        toast("Custom food updated.");
        render();
        return;
      }
      const food = Object.assign({ id: uid("c") }, payload);
      state.customFoods.push(food);
      saveState();
      sheet = { type: "log-amount", foodId: food.id, meal: "breakfast", time: nowTime() };
      toast("Saved to your foods.");
      render();
      return;
    }
    if (act === "delete-custom") {
      const id = el.getAttribute("data-id");
      state.customFoods = state.customFoods.filter((f) => f.id !== id);
      saveState();
      sheet = null;
      toast("Custom food removed.");
      return;
    }
    if (act === "import-foods") {
      sheet = { type: "import-foods" };
      render();
      return;
    }
    if (act === "new-recipe") {
      sheet = { type: "recipe-edit", recipe: { name: "", servings: 4, items: [] }, q: "" };
      render();
      return;
    }
    if (act === "edit-recipe") {
      const r = state.recipes.find((x) => x.id === el.getAttribute("data-id"));
      if (!r) return toast("That recipe is no longer in your list.");
      sheet = { type: "recipe-edit", recipe: JSON.parse(JSON.stringify(r)), q: "" };
      render();
      return;
    }
    if (act === "r-add") {
      if (sheet && sheet.recipe) {
        const nameEl = document.getElementById("r-name");
        const servEl = document.getElementById("r-servings");
        if (nameEl) sheet.recipe.name = nameEl.value;
        if (servEl) sheet.recipe.servings = Number(servEl.value || 1);
      }
      sheet.adding = el.getAttribute("data-id");
      render();
      return;
    }
    if (act === "r-add-confirm") {
      const f = findFood(el.getAttribute("data-id"));
      const grams = Number((document.getElementById("r-grams") || {}).value || 0);
      if (f && grams && sheet.recipe) {
        const m = C.macrosForGrams(f, grams);
        const nameEl = document.getElementById("r-name");
        const servEl = document.getElementById("r-servings");
        if (nameEl) sheet.recipe.name = nameEl.value;
        if (servEl) sheet.recipe.servings = Number(servEl.value || 1);
        sheet.recipe.items.push({
          foodId: f.id,
          name: f.name,
          grams: C.round1(grams),
          kcal: m.kcal,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
        });
        sheet.adding = null;
        sheet.q = "";
        render();
      }
      return;
    }
    if (act === "r-del") {
      const nameEl = document.getElementById("r-name");
      const servEl = document.getElementById("r-servings");
      if (nameEl) sheet.recipe.name = nameEl.value;
      if (servEl) sheet.recipe.servings = Number(servEl.value || 1);
      sheet.recipe.items.splice(Number(el.getAttribute("data-i")), 1);
      render();
      return;
    }
    if (act === "save-recipe") {
      const r = sheet.recipe;
      r.name = (document.getElementById("r-name").value || "").trim() || "Untitled prep";
      r.servings = Number(document.getElementById("r-servings").value);
      if (!isFinite(r.servings) || r.servings <= 0) return toast("Enter a serving count greater than zero.");
      if (!r.items || !r.items.length) return toast("Add at least one ingredient.");
      if (!r.createdOn) r.createdOn = C.localISODate();
      if (r.id) {
        const i = state.recipes.findIndex((x) => x.id === r.id);
        if (i >= 0) state.recipes[i] = r;
      } else {
        r.id = uid("r");
        state.recipes.push(r);
      }
      saveState();
      sheet = null;
      toast("Recipe saved.");
      return;
    }
    if (act === "delete-recipe") {
      state.recipes = state.recipes.filter((x) => x.id !== sheet.recipe.id);
      saveState();
      sheet = null;
      toast("Recipe deleted.");
      return;
    }
    if (act === "log-recipe") {
      sheet = { type: "log-recipe", recipeId: el.getAttribute("data-id") };
      render();
      return;
    }
    if (act === "confirm-log-recipe") {
      const r = state.recipes.find((x) => x.id === sheet.recipeId);
      if (!r) return toast("That recipe is no longer in your list.");
      const qty = Number(document.getElementById("s-qty").value || 1);
      if (!isFinite(qty) || qty <= 0) return toast("Enter a serving amount greater than zero.");
      const meal = document.getElementById("s-meal").value;
      const per = C.recipePerServing(r.items || [], r.servings);
      if (per.invalid) return toast("This recipe needs a serving count greater than zero.");
      const targetDay = tab === "journal" ? journalCursor : dayISO;
      addEntry(targetDay, meal, {
        id: uid("e"),
        kind: "recipe",
        recipeId: r.id,
        name: r.name,
        grams: null,
        portionName: qty + (qty === 1 ? " serving" : " servings"),
        kcal: per.kcal * qty,
        protein: per.protein * qty,
        carbs: per.carbs * qty,
        fat: per.fat * qty,
        time: document.getElementById("s-time").value,
        note: document.getElementById("s-note").value,
        servings: qty,
      });
      sheet = null;
      toast("Servings added to your journal.");
      return;
    }
    if (act === "weigh-in") {
      sheet = { type: "weigh-in" };
      render();
      return;
    }
    if (act === "save-weight") {
      const date = document.getElementById("w-date").value;
      const weight = Number(document.getElementById("w-weight").value);
      if (!date || !weight) return toast("Add a date and weight.");
      state.weights = (state.weights || []).filter((w) => w.date !== date);
      state.weights.push({ date, weight });
      state.weights.sort((a, b) => a.date.localeCompare(b.date));
      saveState();
      sheet = null;
      toast("Weigh-in saved.");
      return;
    }
    if (act === "del-weight") {
      const date = el.getAttribute("data-date");
      state.weights = state.weights.filter((w) => w.date !== date);
      saveState();
      render();
      return;
    }
    if (act === "habit-toggle") {
      const i = Number(el.getAttribute("data-week"));
      const hid = el.getAttribute("data-habit");
      const target = Number(el.getAttribute("data-target") || 2);
      const week = state.plan.weeks[i];
      const cur = Number(week.checks[hid] || 0);
      week.checks[hid] = cur >= target ? 0 : target;
      saveState();
      render();
      return;
    }
    if (act === "pace-weeks" || act === "pace-intensity" || act === "pace-recommended") {
      const p = state.profile;
      if (!p) return;
      ["p-age", "p-weight", "p-height", "p-goal"].forEach((id) => {
        const eln = document.getElementById(id);
        if (!eln) return;
        const key = { "p-age": "age", "p-weight": "weight", "p-height": "height", "p-goal": "goalWeight" }[id];
        p[key] = Number(eln.value);
      });
      if (document.getElementById("p-sex")) p.sex = document.getElementById("p-sex").value;
      if (document.getElementById("p-activity")) p.activity = document.getElementById("p-activity").value;
      if (act === "pace-weeks") applyPaceTo(p, "weeks", el.getAttribute("data-weeks"));
      else if (act === "pace-intensity") applyPaceTo(p, "intensity", el.getAttribute("data-id"));
      else applyPaceTo(p, "recommended");
      render();
      return;
    }
    if (act === "recalc-plan") {
      const t = targets();
      const latest = lastItem((state.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date)));
      const fromLb = latest ? toLb(latest.weight) : t.weightLb;
      state.plan = buildPlan(today, fromLb);
      saveState();
      toast("Plan updated from where you are now.");
      return;
    }
    if (act === "units") {
      const next = el.getAttribute("data-u");
      if (next === state.profile.units) return;
      if (next === "metric") {
        state.profile.weight = C.round1(C.lbToKg(state.profile.weight));
        state.profile.height = C.round1(C.inToCm(state.profile.height));
        state.profile.goalWeight = C.round1(C.lbToKg(state.profile.goalWeight));
        state.weights = (state.weights || []).map((w) => Object.assign({}, w, { weight: C.round1(C.lbToKg(w.weight)) }));
      } else {
        state.profile.weight = C.round1(C.kgToLb(state.profile.weight));
        state.profile.height = C.round1(C.cmToIn(state.profile.height));
        state.profile.goalWeight = C.round1(C.kgToLb(state.profile.goalWeight));
        state.weights = (state.weights || []).map((w) => Object.assign({}, w, { weight: C.round1(C.kgToLb(w.weight)) }));
      }
      state.profile.units = next;
      saveState();
      render();
      return;
    }
    if (act === "save-profile") {
      const p = state.profile;
      const age = Number(document.getElementById("p-age").value);
      const weight = Number(document.getElementById("p-weight").value);
      const height = Number(document.getElementById("p-height").value);
      const goalWeight = Number(document.getElementById("p-goal").value);
      const err = C.validateStats({ age, weight, height, goalWeight, units: p.units });
      if (err) return toast(err);
      const oldDir = C.directionOf(
        p.units === "metric" ? C.kgToLb(p.weight) : p.weight,
        p.units === "metric" ? C.kgToLb(p.goalWeight) : p.goalWeight
      );
      p.age = age;
      p.sex = document.getElementById("p-sex").value;
      p.weight = weight;
      p.height = height;
      p.goalWeight = goalWeight;
      p.activity = document.getElementById("p-activity").value;
      p.manualCalories = false;
      p.manualMacros = false;
      if (document.getElementById("p-goal-date") && document.getElementById("p-goal-date").value) {
        if (p.paceMode !== "intensity") applyPaceTo(p, "date", document.getElementById("p-goal-date").value);
      }
      const newDir = C.directionOf(
        p.units === "metric" ? C.kgToLb(p.weight) : p.weight,
        p.units === "metric" ? C.kgToLb(p.goalWeight) : p.goalWeight
      );
      if (oldDir !== newDir && p.paceMode === "weekly") {
        p.weeklyLb = null;
        p.paceMode = "timeframe";
        p.goalWeeks = "";
        p.goalDate = "";
      }
      const t = targets();
      if (!t || !t.valid) return toast("Check the numbers and try again.");
      p.weeklyLb = t.weeklyLb;
      p.goalWeeks = t.goalWeeks;
      p.goalDate = t.goalDate;
      p.intensity = t.intensity;
      state.plan = buildPlan(today, t.weightLb);
      saveState();
      toast("Profile and plan updated.");
      return;
    }
    if (act === "save-targets") {
      const p = state.profile;
      const cal = Number(document.getElementById("p-cal").value);
      const pro = Number(document.getElementById("p-pro").value);
      const carb = Number(document.getElementById("p-carb").value);
      const fat = Number(document.getElementById("p-fat").value);
      if (![cal, pro, carb, fat].every((n) => isFinite(n) && n >= 0)) {
        return toast("Enter calorie and macro targets of zero or more.");
      }
      p.calorieTarget = cal;
      p.proteinG = pro;
      p.carbsG = carb;
      p.fatG = fat;
      p.manualCalories = true;
      p.manualMacros = true;
      const wEl = document.getElementById("p-weekly");
      if (wEl && wEl.value !== "") {
        const raw = Number(wEl.value);
        if (!isFinite(raw)) return toast("Enter a weekly change as a number.");
        p.weeklyLb = p.units === "metric" ? C.round1(C.kgToLb(raw)) : raw;
        p.paceMode = "weekly";
        const t = targets();
        if (t) {
          p.goalWeeks = t.goalWeeks;
          p.goalDate = t.goalDate;
          p.intensity = t.intensity;
        }
      }
      saveState();
      toast("Targets saved.");
      return;
    }
    if (act === "theme") {
      if (!state.settings) state.settings = { theme: "dark", palette: "midnight" };
      state.settings.theme = el.getAttribute("data-th");
      saveState();
      render();
      return;
    }
    if (act === "palette") {
      if (!state.settings) state.settings = { theme: "dark", palette: "midnight" };
      state.settings.palette = el.getAttribute("data-p");
      saveState();
      render();
      return;
    }
    if (act === "install") {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall = null;
        render();
      }
      return;
    }
    if (act === "export-backup") {
      downloadFile("prep-progress-backup.json", backupJSON(), "application/json");
      toast("Backup ready.");
      return;
    }
    if (act === "export-journal-csv") {
      downloadFile("prep-progress-journal.csv", journalCSV(), "text/csv");
      toast("Journal CSV ready.");
      return;
    }
    if (act === "open-signin") {
      if (!rootCloud()) return;
      sheet = { type: "sign-in", step: "email", email: "", error: "" };
      render();
      return;
    }
    if (act === "signin-email") {
      sheet = { type: "sign-in", step: "email", email: (sheet && sheet.email) || "", error: "" };
      render();
      return;
    }
    if (act === "signin-code") {
      sheet = { type: "sign-in", step: "code", email: (sheet && sheet.email) || "", error: "" };
      render();
      return;
    }
    if (act === "signin-check") {
      sheet = { type: "sign-in", step: "check", email: (sheet && sheet.email) || "", error: "" };
      render();
      return;
    }
    if (act === "dismiss-link-note") {
      signedInViaLinkNote = false;
      render();
      return;
    }
    if (act === "dismiss-nudge") {
      syncNudge = false;
      if (!state.settings) state.settings = { theme: "dark", palette: "midnight" };
      state.settings.dismissedSyncNudge = true;
      saveState();
      render();
      return;
    }
    if (act === "send-otp") {
      const cloud = rootCloud();
      if (!cloud) return;
      const input = document.getElementById("auth-email");
      const email = ((input && input.value) || (sheet && sheet.email) || "").trim();
      authBusy = true;
      sheet = Object.assign({}, sheet || { type: "sign-in" }, { email: email, error: "" });
      render();
      cloud
        .sendOtp(email)
        .then((addr) => {
          authBusy = false;
          sheet = { type: "sign-in", step: "check", email: addr, error: "" };
          toast("Link sent. Check your email.");
        })
        .catch((err) => {
          authBusy = false;
          sheet = Object.assign({}, sheet || { type: "sign-in" }, { email: email, error: err.message || "Could not send the code." });
          render();
        });
      return;
    }
    if (act === "verify-otp") {
      const cloud = rootCloud();
      if (!cloud) return;
      const code = ((document.getElementById("auth-code") || {}).value || "").trim();
      authBusy = true;
      if (sheet) sheet.error = "";
      render();
      cloud
        .verifyOtp(sheet && sheet.email, code)
        .then(() => cloud.afterLogin())
        .then((result) => {
          authBusy = false;
          syncNudge = false;
          if (state.settings) state.settings.dismissedSyncNudge = true;
          saveState({ skipSync: true });
          if (result && result.action === "conflict") {
            /* sheet is opened by onConflict */
            return;
          }
          sheet = null;
          toast(result && result.action === "pull" ? "Signed in. Cloud copy loaded." : "Signed in. Progress will be saved to the cloud.");
          render();
        })
        .catch((err) => {
          authBusy = false;
          if (sheet) sheet.error = err.message || "That code didn't work.";
          render();
        });
      return;
    }
    if (act === "sign-out") {
      const cloud = rootCloud();
      if (!cloud) return;
      cloud.signOut().then(() => {
        toast("Signed out. Your data is still on this phone.");
        render();
      });
      return;
    }
    if (act === "delete-account") {
      const cloud = rootCloud();
      if (!cloud) return;
      if (!confirm("Delete your Prep & Progress cloud account and backup? This cannot be undone. Data on this phone is not erased unless you also choose that.")) return;
      const alsoLocal = confirm("Also erase the copy on this phone? Cancel to keep local data and only remove the cloud account.");
      cloud
        .deleteAccount()
        .then(() => {
          if (alsoLocal) {
            state = defaultState();
            localStorage.removeItem(STORE_KEY);
            onb = { step: 0, draft: emptyDraft() };
            tab = "today";
            toast("Cloud account and this phone’s data were deleted.");
          } else {
            toast("Cloud account deleted. This phone still has your data.");
          }
          sheet = null;
          render();
        })
        .catch((err) => toast(err.message || "Could not delete the account."));
      return;
    }
    if (act === "resolve-conflict") {
      const cloud = rootCloud();
      const choice = el.getAttribute("data-choice");
      if (!cloud || !choice) return;
      cloud
        .syncNow(choice)
        .then(() => {
          sheet = null;
          toast(choice === "cloud" ? "Cloud copy is now on this phone." : "This phone’s data is now the cloud copy.");
          render();
        })
        .catch((err) => toast(err.message || "Could not finish the merge."));
      return;
    }
    if (act === "reset-data") {
      if (!confirm("Erase your profile, journal, and everything in this app on this device? This cannot be undone.")) return;
      state = defaultState();
      localStorage.removeItem(STORE_KEY);
      onb = { step: 0, draft: emptyDraft() };
      tab = "today";
      toast("All local data cleared.");
      render();
      return;
    }
  }

  /* ---------- Init ---------- */
  async function init() {
    state = loadState();
    applyTheme();
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if ((state.settings || {}).theme === "system") applyTheme();
      });
    } catch (e) {}
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncKeyboardChrome);
      window.visualViewport.addEventListener("scroll", syncKeyboardChrome);
    }
    window.addEventListener("focusin", (ev) => {
      const el = ev.target;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) {
        setTimeout(() => {
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch (err) {
            el.scrollIntoView(true);
          }
        }, 350);
      }
    });
    window.addEventListener("focusout", () => setTimeout(syncKeyboardChrome, 50));
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
    });
    if (state.profile && !state.plan) {
      const t = targets();
      state.plan = buildPlan(C.localISODate(), t && t.weightLb);
      saveState();
    }
    if (window.PPCloud && window.PPCloud.isEnabled()) {
      let boot = null;
      try {
        boot = await window.PPCloud.init({
          getState: () => state,
          applyState: (data) => {
            const next = defaultState();
            next.profile = data.profile || null;
            next.logs = data.logs || {};
            next.weights = data.weights || [];
            next.recipes = data.recipes || [];
            next.customFoods = data.customFoods || [];
            next.plan = data.plan || null;
            next.settings = Object.assign({ theme: "dark", palette: "midnight" }, data.settings || {});
            next.achievements = Object.assign({ unlocked: {}, seen: {} }, data.achievements || {});
            state = next;
            saveState({ skipSync: true });
            applyTheme();
          },
          onStatus: () => {
            const el = document.querySelector(".sync-status");
            if (!el || !window.PPCloud) return;
            const st = window.PPCloud.getStatus();
            const cls = !st.online || st.status === "offline" ? "offline" : st.status === "syncing" ? "syncing" : st.status === "error" ? "error" : "saved";
            el.className = "sync-status " + cls;
            el.textContent = window.PPCloud.labelForStatus() || "Saved";
          },
          onSession: () => {},
          onConflict: (info) => {
            sheet = {
              type: "sync-conflict",
              local: info.local,
              cloud: info.cloud,
              localAt: info.localAt,
              cloudAt: info.cloudAt,
            };
            render();
          },
        });
      } catch (err) {
        console.warn("Cloud sync init failed", err);
      }
      if (boot && boot.via && window.PPCloud && window.PPCloud.isSignedIn()) {
        signedInViaLinkNote = true;
      }
    }
    render();
    await loadFoods();
    render();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch((err) => console.warn("SW register failed", err));
    }
  }

  window.PPApp = {
    init,
    PALETTES,
    applyTheme,
    currentPalette,
    downloadFile,
    getState: () => state,
    setState: (s) => {
      state = Object.assign(defaultState(), s);
      saveState();
    },
    searchFoods,
    unpackFoods,
    loadFoods,
    targets,
    dayTotals,
    dayEntries,
    journalCSV,
    backupJSON,
    importBackup,
    importUserFoods,
    addEntry,
    entryFromFood,
    findFood,
    foods: () => foods,
    setTab: (t) => {
      tab = t;
      if (t === "journal") journalCursor = dayISO;
      render();
    },
    setDay: (iso) => {
      dayISO = iso;
      journalCursor = iso;
    },
    render,
    STORE_KEY,
    MEALS,
    achievements: () => (window.PPAchievements ? window.PPAchievements.compute(state, { today: C.localISODate(), targets: targets() }) : null),
    cloud: () => window.PPCloud || null,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
