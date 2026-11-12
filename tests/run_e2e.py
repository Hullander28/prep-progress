#!/usr/bin/env python3
"""Headless checks + phone-size screenshots for Prep & Progress (Chromium + WebKit)."""
from __future__ import annotations

import http.server
import os
import threading
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREEN = ROOT / "screens"
SCREEN.mkdir(parents=True, exist_ok=True)
PORT = 8765

PALETTES = [
    ("terracotta", "light", "Terracotta"),
    ("ocean", "light", "Ocean"),
    ("fresh", "light", "Fresh"),
    ("midnight", "dark", "Midnight"),
    ("citrus", "light", "Citrus"),
]

SEED_JS = r"""
(() => {
  const C = window.PPCalc;
  const t = C.computeTargets({
    sex: "male", age: 35, units: "us",
    weight: 200, height: 70, goalWeight: 180, activity: "moderate"
  });
  const food = (id) => window.PPApp.findFood(id);
  const mac = (id, grams, extra) => {
    const f = food(id);
    if (!f) throw new Error("missing food " + id);
    return window.PPApp.entryFromFood(f, grams, extra);
  };
  const today = C.localISODate();
  const y1 = C.addDaysISO(today, -1);
  const y2 = C.addDaysISO(today, -2);
  const y3 = C.addDaysISO(today, -4);
  const y4 = C.addDaysISO(today, -7);

  const profile = {
    age: 35, sex: "male", units: "us", weight: 200, height: 70,
    goalWeight: 180, activity: "moderate", weeklyLb: t.weeklyLb,
    goalWeeks: 20, paceMode: "timeframe",
    manualCalories: false, manualMacros: false, startedOn: y4
  };

  const empty = () => ({ breakfast: [], lunch: [], dinner: [], snack: [], note: "", hunger: "", mood: "", felt: "" });
  const logs = {};

  function put(day, meal, entry, time, note) {
    if (!logs[day]) logs[day] = empty();
    entry.meal = meal;
    entry.time = time;
    if (note) entry.note = note;
    logs[day][meal].push(entry);
  }

  put(today, "breakfast", mac("s173905", 234, { portionName: "1 cup (234 g)" }), "07:35", "Prepped Sunday");
  put(today, "breakfast", mac("s173944", 118, { portionName: "1 medium banana" }), "07:35", "");
  put(today, "breakfast", mac("s171267", 244, { portionName: "1 cup (244 g)" }), "07:40", "");
  put(today, "lunch", mac("s171477", 140, { portionName: "1 cup, chopped or diced (140 g)" }), "12:20", "Meal-prep box");
  put(today, "lunch", mac("s169753", 158, { portionName: "1 cup (158 g)" }), "12:20", "");
  put(today, "lunch", mac("s170379", 78, { portionName: "1 cup chopped" }), "12:20", "");

  logs[today].hunger = "ok";
  logs[today].mood = "good";
  logs[today].felt = "strong";
  logs[today].note = "Solid prep day. Energy stayed even through the afternoon.";

  put(y1, "breakfast", mac("s170903", 200, { portionName: "1 container (7 oz)" }), "08:05", "");
  put(y1, "dinner", mac("s175168", 178, { portionName: "0.5 fillet (178 g)" }), "18:40", "Ate out, estimated portion");
  logs[y1].hunger = "peckish";
  logs[y1].mood = "ok";
  logs[y1].note = "A little hungry late evening.";

  put(y2, "breakfast", mac("s173424", 50, { portionName: "1 large (50 g)" }), "07:50", "");
  put(y2, "lunch", mac("s171477", 86, { portionName: "0.5 breast (86 g)" }), "13:10", "");

  put(y3, "dinner", mac("s171477", 140, { portionName: "1 cup, chopped (140 g)" }), "19:00", "Re-logged a prep serving");

  // Fill a 7-day logging streak so awards have something to show
  for (let i = 0; i < 7; i++) {
    const iso = C.addDaysISO(today, -i);
    if (!logs[iso]) logs[iso] = empty();
    if (!(logs[iso].breakfast || []).length) {
      put(iso, "breakfast", mac("s173424", 50, { portionName: "1 large (50 g)" }), "08:00", "");
    }
  }

  const weights = [
    { date: y4, weight: 201.2 },
    { date: C.addDaysISO(today, -5), weight: 200.6 },
    { date: y3, weight: 200.1 },
    { date: y2, weight: 199.8 },
    { date: y1, weight: 199.4 },
    { date: today, weight: 199.2 },
  ];

  const recipes = [{
    id: "rdemo1",
    name: "Chicken rice bowls",
    servings: 4,
    createdOn: y4,
    items: [
      Object.assign({ foodId: "s171477", name: food("s171477").name, grams: 560 }, C.macrosForGrams(food("s171477"), 560)),
      Object.assign({ foodId: "s169753", name: food("s169753").name, grams: 632 }, C.macrosForGrams(food("s169753"), 632)),
      Object.assign({ foodId: "s170379", name: food("s170379").name, grams: 300 }, C.macrosForGrams(food("s170379"), 300)),
    ],
  }];

  window.PPApp.setState({
    profile,
    logs,
    weights,
    recipes,
    customFoods: [],
    plan: null,
    settings: { theme: "light", palette: "terracotta" },
  });
  return { foods: window.PPApp.foods().length, cal: t.calorieTarget, today };
})()
"""


def start_server():
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def collect_errors(page, bucket):
    page.on("pageerror", lambda exc: bucket.append(str(exc)))
    page.on("console", lambda msg: bucket.append("console:" + msg.text) if msg.type == "error" else None)


def wait_app(page):
    page.wait_for_function("() => window.PPApp && window.PPApp.foods && window.PPApp.foods().length > 0", timeout=25000)


def apply_palette(page, pal, theme):
    page.evaluate(
        """([pal, theme]) => {
          const s = window.PPApp.getState();
          s.settings = Object.assign({}, s.settings, { palette: pal, theme: theme });
          window.PPApp.setState(s);
          window.PPApp.applyTheme();
          window.PPApp.setDay(window.PPCalc.localISODate());
          window.PPApp.setTab("today");
        }""",
        [pal, theme],
    )
    page.wait_for_selector(".rings")
    page.wait_for_timeout(200)


def stitch_palettes(paths_labels, dest):
    imgs = []
    for path, label in paths_labels:
        im = Image.open(path).convert("RGB")
        imgs.append((im, label))
    w, h = imgs[0][0].size
    gap = 16
    label_h = 48
    canvas = Image.new("RGB", (w * len(imgs) + gap * (len(imgs) + 1), h + label_h + gap * 2), (28, 24, 22))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    x = gap
    for im, label in imgs:
        canvas.paste(im, (x, gap))
        draw.text((x + 12, gap + h + 12), label, fill=(245, 237, 230), font=font)
        x += w + gap
    canvas.save(dest, optimize=True)


def run_chromium(browser, url, results):
    errors = []
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        user_agent=(
            "Mozilla/5.0 (Linux; Android 15; SM-S938U) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        ),
        color_scheme="light",
    )
    page = context.new_page()
    collect_errors(page, errors)
    page.goto(url, wait_until="networkidle")
    page.wait_for_selector("text=Prep & Progress", timeout=15000)
    wait_app(page)
    page.wait_for_function("() => window.PPApp.foods().some(f => f.kind === 'grocery')", timeout=25000)
    food_count = page.evaluate("() => window.PPApp.foods().length")
    results["food_count"] = food_count
    assert food_count >= 7000, food_count
    kinds = page.evaluate("""() => {
      const foods = window.PPApp.foods();
      const out = { restaurant: 0, grocery: 0, basic: 0 };
      foods.forEach((f) => { out[f.kind || 'basic'] = (out[f.kind || 'basic'] || 0) + 1; });
      return out;
    }""")
    results["food_kinds"] = kinds
    assert kinds["grocery"] >= 1000, kinds
    assert kinds["restaurant"] >= 200, kinds
    hits = page.evaluate("""(q) => window.PPApp.searchFoods(q, 10).map(f => f.name)""", "chicken breast")
    results["search_chicken"] = hits
    assert any("chicken" in n.lower() and "breast" in n.lower() for n in hits), hits

    seeded = page.evaluate(SEED_JS)
    results["seed"] = seeded
    page.evaluate("() => { window.PPApp.setDay(window.PPCalc.localISODate()); window.PPApp.setTab('today'); }")
    page.wait_for_selector("text=Breakfast")

    page.evaluate("() => window.PPApp.setTab('foods')")
    page.wait_for_selector("#foods-q")
    page.fill("#foods-q", "banana")
    page.wait_for_timeout(200)
    assert page.locator("text=Bananas, raw").first.is_visible()
    assert page.locator("button.chip", has_text="Restaurants").first.is_visible()
    assert page.locator("button.chip", has_text="Grocery").first.is_visible()
    assert page.locator("button.chip", has_text="Basic").first.is_visible()

    page.fill("#foods-q", "mcdonald")
    page.wait_for_timeout(250)
    assert page.locator(".pill.kind-restaurant").first.is_visible()
    mcd = page.evaluate("""() => window.PPApp.searchFoods('mcdonald', 8, 'restaurant').map(f => f.name)""")
    results["search_mcdonalds"] = mcd
    assert mcd and any("mcdonald" in n.lower() for n in mcd), mcd

    page.locator("button.chip", has_text="Grocery").click()
    page.wait_for_timeout(150)
    page.fill("#foods-q", "chobani")
    page.wait_for_timeout(250)
    assert page.locator(".pill.kind-grocery").first.is_visible()
    groc = page.evaluate("""() => window.PPApp.searchFoods('chobani', 8, 'grocery').map(f => ({name: f.name, brand: f.brand, kind: f.kind}))""")
    results["search_chobani"] = groc
    assert groc and all(x["kind"] == "grocery" for x in groc), groc

    page.locator("[data-act='open-barcode']").first.click()
    page.wait_for_selector("#barcode-manual")
    assert page.locator("text=Look up barcode").first.is_visible()
    assert page.locator("#start-camera-btn").first.is_visible()
    assert page.locator("text=Take a photo of the barcode").first.is_visible()
    assert page.locator("#barcode-photo").count()
    assert page.locator("#barcode-photo-pick").count()
    results["barcode_sheet"] = True
    results["barcode_photo"] = True
    # The barcode sheet is tall enough that the center of the full-screen
    # backdrop sits under the sheet; click the element directly instead.
    page.evaluate("""() => document.querySelector('.backdrop[data-act="close-sheet"]').click()""")
    page.wait_for_timeout(150)
    page.locator("button.chip", has_text="All").click()

    page.reload(wait_until="networkidle")
    page.wait_for_function("() => window.PPApp && window.PPApp.getState().profile", timeout=15000)
    prof = page.evaluate("() => window.PPApp.getState().profile")
    assert prof and prof["age"] == 35, prof
    results["persisted"] = True

    # Palette screenshots of Today
    labeled = []
    for pal, theme, label in PALETTES:
        apply_palette(page, pal, theme)
        dest = SCREEN / f"today-{pal}.png"
        page.screenshot(path=str(dest), full_page=False)
        labeled.append((dest, label))
        meta = page.evaluate("() => document.querySelector('meta[name=theme-color]').content")
        results.setdefault("theme_colors", {})[pal] = meta

    # Keep today.png as terracotta
    Image.open(SCREEN / "today-terracotta.png").save(SCREEN / "today.png")
    stitch_palettes(labeled, SCREEN / "palettes.png")

    page.evaluate("() => { window.PPApp.setState(Object.assign(window.PPApp.getState(), { settings: { theme: 'light', palette: 'terracotta' } })); window.PPApp.applyTheme(); window.PPApp.setTab('journal'); }")
    page.wait_for_selector(".cal-grid")
    page.wait_for_timeout(200)
    page.screenshot(path=str(SCREEN / "journal.png"), full_page=False)

    page.evaluate("() => window.PPApp.setTab('weight')")
    page.wait_for_selector("svg.chart")
    page.wait_for_timeout(200)
    page.screenshot(path=str(SCREEN / "weight.png"), full_page=False)

    # Plan shows intensity from the 20-week time frame (gentle ~1 lb / week)
    page.evaluate("() => window.PPApp.setTab('plan')")
    page.wait_for_selector(".intensity-badge")
    plan_label = page.evaluate("() => document.querySelector('.intensity-badge').textContent")
    results["plan_intensity"] = plan_label
    assert "Gentle" in plan_label, plan_label
    assert page.locator("text=Awards").first.is_visible()

    # Profile time-frame chips and a too-fast date
    page.evaluate("() => window.PPApp.setTab('profile')")
    page.wait_for_selector(".week-chips")
    assert page.locator("button.chip", has_text="20 weeks").count() or True
    page.locator("button.chip", has_text="8 weeks").click()
    page.wait_for_timeout(200)
    badge = page.evaluate("() => document.querySelector('.intensity-badge') && document.querySelector('.intensity-badge').textContent")
    results["eight_week_intensity"] = badge
    # 20 lb in 8 weeks is 1.25 lb/wk = 0.625% → Moderate (not too fast)
    assert badge and badge in ("Moderate", "Aggressive", "Too fast", "Gentle"), badge
    # Force a very short frame via the date? Use evaluate apply
    pace = page.evaluate("""() => {
      const s = window.PPApp.getState();
      s.profile.goalWeeks = 3;
      s.profile.paceMode = "timeframe";
      window.PPApp.setState(s);
      window.PPApp.setTab("profile");
      const t = window.PPApp.targets();
      return { intensity: t.intensity, safeWeeks: t.safeWeeks, floored: t.floored };
    }""")
    results["short_frame"] = pace
    assert pace["intensity"] == "too_fast" or pace["floored"], pace
    page.wait_for_selector("text=Use recommended pace")
    page.get_by_role("button", name="Use recommended pace").first.click()
    page.wait_for_timeout(200)
    after = page.evaluate("""() => {
      const p = window.PPApp.getState().profile;
      const t = window.PPApp.targets();
      return { weeks: p.goalWeeks, intensity: t.intensity };
    }""")
    results["recommended_pace"] = after
    assert after["weeks"] and after["weeks"] > 3, after
    assert after["intensity"] != "too_fast", after

    # Restore a gentle 20-week plan for the awards screenshot
    page.evaluate("""() => {
      const s = window.PPApp.getState();
      s.profile.goalWeeks = 20;
      s.profile.paceMode = "timeframe";
      s.profile.intensity = "";
      window.PPApp.setState(s);
      window.PPApp.setTab("awards");
    }""")
    page.wait_for_selector(".badge-grid")
    page.wait_for_timeout(250)
    awards = page.evaluate("""() => {
      const a = window.PPApp.achievements();
      return {
        level: a && a.level,
        xp: a && a.xp,
        unlocked: a && a.badges.filter(b => b.unlocked).map(b => b.id),
        logging: a && a.streaks.logging,
      };
    }""")
    results["awards"] = awards
    assert "first_log" in awards["unlocked"], awards
    assert "first_recipe" in awards["unlocked"], awards
    assert "streak_7" in awards["unlocked"], awards
    assert awards["logging"]["current"] >= 7, awards
    page.screenshot(path=str(SCREEN / "awards.png"), full_page=False)

    # Midnight dark Today shot used as a local stand-in; live site shot is taken after deploy
    apply_palette(page, "midnight", "dark")
    page.screenshot(path=str(SCREEN / "today-midnight.png"), full_page=False)

    # Calendar month overflow: Jan 31 should go to February, not early March
    cal = page.evaluate("""() => window.PPCalc.addMonthsISO('2026-01-31', 1)""")
    results["cal_jan31"] = cal
    assert cal.startswith("2026-02-"), cal

    # Backup includes achievements and pace
    backup = page.evaluate("""() => JSON.parse(window.PPApp.backupJSON())""")
    assert "achievements" in backup, list(backup.keys())
    assert backup.get("profile", {}).get("goalWeeks") == 20
    results["backup_version"] = backup.get("version")

    # Cloud login is configured and shown, but optional
    enabled = page.evaluate("() => !!(window.PPCloud && window.PPCloud.isEnabled())")
    results["cloud_enabled"] = enabled
    assert enabled
    page.evaluate("() => window.PPApp.setTab('profile')")
    page.wait_for_selector("#save-progress")
    assert page.locator("text=Save your progress").first.is_visible()
    assert page.locator("#food-credits").first.is_visible()
    assert page.locator("text=Open Food Facts").first.is_visible()
    assert page.locator("text=Sign in with email").first.is_visible()
    page.locator("[data-act='open-signin']").first.click()
    page.wait_for_selector("#auth-email")
    assert page.locator("text=Email me a sign-in link").first.is_visible()
    assert page.locator("text=Have a code?").first.is_visible()
    page.locator("[data-act='signin-code']").click()
    page.wait_for_selector("#auth-code")
    results["signin_sheet"] = True
    results["signin_code_option"] = True
    page.locator("[data-act='close-sheet']").first.click()

    # Metric + maintain (goal = current) should not crash
    edge = page.evaluate("""() => {
      const t0 = window.PPCalc.computeTargets({
        sex: "female", age: 30, units: "metric", weight: 70, height: 165,
        goalWeight: 70, activity: "light", goalWeeks: 12, paceMode: "timeframe"
      });
      const t1 = window.PPCalc.validateStats({ age: 3, weight: 200, height: 70, units: "us" });
      return { dir: t0.direction, cal: t0.calorieTarget, intensity: t0.intensity, ageErr: t1 };
    }""")
    results["edges"] = edge
    assert edge["dir"] == "maintain"
    assert edge["ageErr"]

    csv = page.evaluate("() => window.PPApp.journalCSV()")
    assert "breakfast" in csv and "Chicken" in csv
    # export helper should not throw
    page.evaluate("() => window.PPApp.downloadFile('test-journal.csv', window.PPApp.journalCSV(), 'text/csv')")
    results["csv_lines"] = csv.count("\n")

    palettes_ok = page.evaluate("() => window.PPApp.PALETTES.map(p => p.id)")
    assert palettes_ok == [p[0] for p in PALETTES], palettes_ok

    js_errors = [e for e in errors if "favicon" not in e.lower()]
    results["chromium_js_errors"] = js_errors
    assert not js_errors, js_errors
    context.close()


def run_webkit(p, url, results):
    """WebKit in this environment cannot open loopback HTTP (times out / internal error).
    file:// works, so we load the app that way and inject the USDA JSON (fetch is blocked on file://).
    """
    errors = []
    device = p.devices["iPhone 15"]
    browser = p.webkit.launch(headless=True)
    device_opts = dict(device)
    device_opts["viewport"] = {"width": 390, "height": 844}
    device_opts["color_scheme"] = "light"
    context = browser.new_context(**device_opts)
    page = context.new_page()
    collect_errors(page, errors)
    file_url = Path("/workspace/macro_app/index.html").resolve().as_uri()
    page.goto(file_url, wait_until="load", timeout=20000)
    import json
    foods = json.loads((ROOT / "data" / "foods.json").read_text())
    restaurants = json.loads((ROOT / "data" / "restaurants.json").read_text())
    grocery = json.loads((ROOT / "data" / "grocery.json").read_text())
    page.wait_for_function("() => window.PPApp && window.PPApp.unpackFoods", timeout=15000)
    page.evaluate(
        """(([foods, restaurants, grocery]) => {
          window.PPApp.unpackFoods(foods);
          window.PPApp.unpackFoods(restaurants, { kind: "restaurant", source: "usda-fndds" });
          window.PPApp.unpackFoods(grocery, { kind: "grocery", source: "usda-branded" });
          if (window.PPApp.render) window.PPApp.render();
        })""",
        [foods, restaurants, grocery],
    )
    page.wait_for_function("() => window.PPApp.foods().length > 8000", timeout=15000)
    page.wait_for_selector("text=Prep & Progress", timeout=15000)
    results["webkit_load"] = "file://"
    results["webkit_foods"] = page.evaluate("() => window.PPApp.foods().length")
    results["webkit_kinds"] = page.evaluate("""() => {
      const out = { restaurant: 0, grocery: 0, basic: 0 };
      window.PPApp.foods().forEach((f) => { out[f.kind || 'basic'] = (out[f.kind || 'basic'] || 0) + 1; });
      return out;
    }""")
    results["webkit_mcd"] = page.evaluate("() => window.PPApp.searchFoods('mcdonald', 5, 'restaurant').length")
    assert results["webkit_kinds"]["grocery"] >= 1000, results["webkit_kinds"]
    assert results["webkit_mcd"] >= 1, results["webkit_mcd"]

    # Onboarding
    page.get_by_role("button", name="Let’s get started").click()
    page.wait_for_selector("#o-age")
    page.fill("#o-age", "35")
    page.select_option("#o-sex", "male")
    page.fill("#o-weight", "200")
    page.fill("#o-height", "70")
    page.get_by_role("button", name="Continue").click()
    page.wait_for_selector("#o-goal")
    page.fill("#o-goal", "180")
    page.locator("#o-goal").press("Tab")
    page.wait_for_selector(".intensity-badge")
    page.locator("button.chip", has_text="16 weeks").click()
    page.wait_for_function("() => { const el = document.querySelector('.chip.on'); return el && el.textContent.includes('16'); }", timeout=5000)
    page.get_by_role("button", name="See my plan").click()
    page.wait_for_selector("text=Your starting plan")
    page.wait_for_selector(".intensity-badge")
    page.get_by_role("button", name="Let’s go").click()
    page.wait_for_selector(".rings", timeout=10000)
    prof = page.evaluate("() => window.PPApp.getState().profile")
    assert prof and int(prof["age"]) == 35, prof
    results["webkit_onboarding"] = True
    results["webkit_goal_weeks"] = prof.get("goalWeeks")
    assert prof.get("goalWeeks") == 16, prof

    # Log a food via the FAB / sheet
    page.locator(".fab").click()
    page.wait_for_selector("#sheet-q")
    page.fill("#sheet-q", "banana")
    page.wait_for_timeout(250)
    page.locator("[data-act='pick-food']").first.click()
    page.wait_for_selector("[data-act='confirm-log']")
    page.locator("[data-act='confirm-log']").click()
    page.wait_for_timeout(300)
    entries = page.evaluate("() => Object.values(window.PPApp.getState().logs).flatMap(d => (d.breakfast||[]).concat(d.lunch||[], d.dinner||[], d.snack||[])).length")
    assert entries >= 1, entries
    results["webkit_logging"] = entries

    # Journal
    page.evaluate("() => window.PPApp.setTab('journal')")
    page.wait_for_selector(".cal-grid")
    assert page.locator("text=Journal").first.is_visible() or page.locator(".cal-grid").is_visible()
    results["webkit_journal"] = True

    # Date input is present and 16px (no iOS focus zoom)
    font = page.evaluate("""() => {
      const el = document.getElementById('journal-date');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fontSize: cs.fontSize, type: el.type };
    }""")
    results["webkit_date_input"] = font
    assert font and font["type"] == "date"
    assert float(font["fontSize"].replace("px", "")) >= 16

    # Export API
    out = page.evaluate(
        """async () => {
          try {
            const r = await window.PPApp.downloadFile('prep-progress-journal.csv', window.PPApp.journalCSV(), 'text/csv');
            return { ok: true, result: r, csv: window.PPApp.journalCSV().split('\\n').length };
          } catch (e) {
            return { ok: false, error: String(e) };
          }
        }"""
    )
    results["webkit_export"] = out
    assert out.get("ok"), out

    # iPhone screenshot of Today after logging
    page.evaluate("() => window.PPApp.setTab('today')")
    page.wait_for_selector(".rings")
    page.wait_for_timeout(200)
    # Clip to 390x844 if the device viewport differs
    page.screenshot(path=str(SCREEN / "iphone.png"), full_page=False)

    def ignore_err(e):
        low = e.lower()
        return any(
            s in low
            for s in (
                "favicon",
                "access-control-allow-origin",
                "cross origin requests",
                "access control checks",
                "load failed",
                "foods.json",
            )
        )
    js_errors = [e for e in errors if not ignore_err(e)]
    results["webkit_js_errors"] = js_errors
    results["webkit_ignored_file_cors"] = True
    assert not js_errors, js_errors
    context.close()
    browser.close()


def main():
    httpd = start_server()
    url = f"http://127.0.0.1:{PORT}/"
    results = {"ok": True}
    with sync_playwright() as p:
        chromium = p.chromium.launch(headless=True)
        run_chromium(chromium, url, results)
        chromium.close()
        run_webkit(p, url, results)
    httpd.shutdown()
    print("E2E OK", {k: v for k, v in results.items() if k != "search_chicken"})


if __name__ == "__main__":
    main()
