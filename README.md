# Prep & Progress

An offline, phone-friendly web app (installable PWA) for meal-prep macros, a dated food journal, weight tracking, and small weekly goals.

Works well on a Samsung Galaxy phone in Chrome or Samsung Internet. There is no backend — everything stays on the device (localStorage).

## Open it on your phone

This needs a small web server (not a raw `file://` link), so the food database, offline cache, and “Add to Home screen” can work.

On a computer, from this folder:

```bash
python3 -m http.server 8080
```

Then open `http://<your-computer-ip>:8080` on the phone (same Wi‑Fi). In Chrome, use the menu → **Add to Home screen** / **Install app**. After the first visit, the app works offline.

## What’s included

- **Today** — calorie and macro rings, meals you can log, jump into the journal
- **Journal** — calendar, a scrollable history with time / meal / food / portion / macros, daily totals vs targets, edit or delete entries, optional notes (hunger, mood, how you felt), re-log an entry or a whole meal, CSV export
- **Prep** — batch recipes with per-serving macros, then log servings to a day
- **Foods** — search USDA basics, fast-food restaurant items, and name-brand grocery products (with brand, serving size, and type badges); filter All / Restaurants / Grocery / Basic; optional online search and barcode lookup; add/import your own
- **Weight** — weigh-ins, trend chart, 7-day average, progress to goal
- **Plan** — weekly weight milestones at the pace you pick, habit checkoffs, and awards
- **You** (profile icon) — targets, units, light/dark theme, JSON backup import/export

Calories use the Mifflin-St Jeor equation and a cautious pace (about ½–1% of body weight, capped near 1 lb/week), with a floor of ~1,500 kcal (men) / ~1,200 kcal (women). These are estimates, not medical advice.

## Food database

Built from public-domain USDA FoodData Central data (CC0). Values are never invented; foods missing energy or macros are omitted.

| Dataset | Release | Included |
| --- | --- | --- |
| SR Legacy | April 2018 (`FoodData_Central_sr_legacy_food_csv_2018-04.zip`) | 7,793 basic foods, including 174 named chain items (McDonald's, Burger King, Wendy's, Taco Bell, Chick-fil-A, Subway, KFC, Popeyes, Pizza Hut, Domino's, Little Caesars, Papa John's, Arby's) and 160 generic “Fast foods” / “Restaurant” items |
| Foundation Foods | April 2026 (`FoodData_Central_foundation_food_csv_2026-04-30.zip`) | 237 unique foods (140 name overlaps with SR skipped; 92 omitted because energy/macros were missing) |
| Survey Foods (FNDDS 2021–2023) | October 2024 (`FoodData_Central_survey_food_json_2024-10-31.zip`) | 146 additional fast-food / restaurant items not already in SR (`data/restaurants.json`, ~34 KB) |
| Branded Foods | October 2026 (`FoodData_Central_branded_food_csv_2026-10-29.zip`) | 10,000 curated US grocery products from widely sold national and store brands, with brand name, label serving, and barcode when present (`data/grocery.json`, ~1.3 MB). Not the full branded database. |

**Offline total: 8,030 basic + 146 restaurant extras + 10,000 grocery = 18,176 foods.** Nutrient values are per 100 g. Restaurant and grocery items use the published serving size as the default portion when USDA provided one.

The October 2026 Foundation CSV archive was incomplete (no `food.csv` / `food_nutrient.csv` / `food_portion.csv`), so April 2026 was used instead.

If something isn’t in the offline list, search online (needs a connection). That lookup uses [Open Food Facts](https://world.openfoodfacts.org), a collaborative database under the Open Database License (ODbL), and caches matches on the phone. Barcode lookup uses the same source. On phones that support the Barcode Detection API (typically Android Chrome) the live camera uses that. On iPhone Safari and the Home Screen app, the same camera preview is decoded with a bundled ZXing-js library (loaded the first time you open the scanner). If the live camera is blocked or doesn’t work in the Home Screen app, use **Take a photo of the barcode**, or type the number. The decoder is loaded the first time you open the scanner (then cached offline). UPC-A, EAN-13, and EAN-8 are the most reliable; short UPC-E codes may need a photo retry or typing the number.

Rebuild (CSVs/JSON under `/tmp/usda`):

```bash
python3 scripts/build_foods.py
python3 scripts/build_catalog.py
```

Import your own foods with `data/import-template.csv` (`name,serving_name,serving_grams,kcal,protein,carbs,fat` — values are for that serving).

## Goal time frame

In onboarding or **You**, pick a target date or a chip (8 / 12 / 16 / 24 / 36 / 52 weeks). The app estimates the weekly change and daily calorie adjustment, then labels the plan **Gentle**, **Moderate**, **Aggressive**, or **Too fast**. You can also pick a pace and we’ll suggest a date. If a plan is faster than about 1% of body weight per week (or 0.5% when gaining), or would push calories below a sensible floor (~1500 for men, ~1200 for women), you’ll get a recommended date you can apply in one tap. Faster plans add a couple of extra habits (steps, a bit more protein). These numbers are an estimate, not medical advice.

## Awards

The trophy in the header (and a section on **Plan**) opens streaks and badges. Logging, protein, weigh-in, and prep streaks show current and best. Badges cover firsts, 7/30/100-day logging streaks, progress toward your goal at a sustainable pace, weekly milestones, journal notes, and consistency levels/XP. Extreme deficits or too-fast weight change do not unlock goal awards. Unlocks are recomputed from your data (including after a backup import) and celebrate with a short toast — confetti is skipped when you prefer reduced motion.

## Cloud backup (optional)

The app works fully offline on your phone with no account. If you want a cloud backup, sign in with email from **You** (or the short prompt after setup). You’ll get a 6-digit code — that’s more reliable on iPhone than a sign-in link, which often opens Safari instead of the installed app.

Setup for the hosted copy is in `supabase/SETUP.md` (SQL, Auth site URL, and the email template). Your journal, plan, and awards sync; the food databases stay on the device (online search results are cached locally, not synced).

## Color schemes

Choose a palette in **You → Appearance**. Each has a light and dark variant (or follow the system). Text colors meet WCAG AA contrast against backgrounds and cards.

| Palette | Accent (light) | Accent (dark) | Dark background |
| --- | --- | --- | --- |
| Terracotta (default) | `#BE5324` | `#E8926A` | `#171311` |
| Ocean | `#0C6E86` | `#2EB5C9` | `#0B171D` |
| Fresh | `#1B7A4A` | `#3DCA82` | `#0F1A14` |
| Midnight | `#5B45C6` | `#8B7CFF` | `#0D0B14` |
| Citrus | `#C45000` | `#FF9F3A` | `#1A140A` |

## iPhone / Safari

- Install: **Safari → Share → Add to Home Screen** (not Chrome on iOS).
- The app uses the 180×180 Apple touch icon, `viewport-fit=cover`, and safe-area padding for the notch and home indicator.
- Input fields stay at 16px so iOS won’t zoom on focus. Date and time use the native Safari pickers.
- Export uses the system Share sheet when possible; otherwise iOS opens the file in a new tab so you can Save or Share. `<input type="file">` imports work in Safari.
- The tab bar hides while the keyboard is open so it doesn’t jump over the form.
- Needs https or localhost for Add to Home Screen and offline use.

## Optional hosting (GitHub Pages)

This app was **not** deployed or pushed to a repository (on purpose). To host it later:

1. Create a GitHub repo and copy these files to the root (or a `docs/` folder).
2. GitHub → Settings → Pages → Deploy from the `main` branch (root or `/docs`).
3. After a minute, open `https://<user>.github.io/<repo>/` on your phone and Add to Home screen.

Any static host (Netlify, Cloudflare Pages, Render static) also works. It must be served over HTTPS for the install and offline features.

## Tests

```bash
node tests/test_calc.js
node tests/test_achievements.js
node tests/test_sync.js
node tests/test_foods.js
node tests/test_catalog.js
python3 tests/test_barcode_scan.py
python3 tests/run_e2e.py
```

Phone-size screenshots (390×844) are in `screens/`.

## Limits

- Data stays on this device unless you export a backup or journal CSV. There is no account or cloud sync.
- USDA names can be long or formal (e.g. “Cereals, oats…”).
- Restaurant items come from published USDA SR and FNDDS data, not a live chain menu feed, so limited-time or very new items may be missing or slightly dated. Chipotle, Starbucks, and some other chains have little or no named USDA menu coverage; try online search, a barcode, or a custom food.
- The grocery list is a curated subset of USDA Branded Foods (popular US brands), not every product on the shelf. Online search and barcodes fill gaps when you have a connection.
- Offline use requires one successful load over http(s). `file://` will not register the service worker.
