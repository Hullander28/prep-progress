/* Prep & Progress — food catalog helpers (kinds, search, Open Food Facts). */
(function (root) {
  const CACHE_KEY = "prepProgress.foodsCache.v1";
  const CACHE_CAP = 400;
  const OFF_SEARCH = "https://search.openfoodfacts.org";
  const OFF_HOSTS = ["https://us.openfoodfacts.org", "https://world.openfoodfacts.net", "https://world.openfoodfacts.org"];
  const OFF_UA = "PrepProgress/1.0 (https://hullander28.github.io/prep-progress; meal-prep nutrition app)";
  const OFF_FIELDS =
    "code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,nutrition_data_per,categories_tags,countries_tags";
  const OFF_ATTRIBUTION =
    "Grocery items found online come from Open Food Facts, a collaborative database published under the Open Database License (ODbL). openfoodfacts.org";

  const CHAIN_START = new RegExp(
    "^(McDONALD'?S|BURGER KING|WENDY'?S|TACO BELL|SUBWAY|CHICK-FIL-A|KFC|" +
      "POPEYES|PIZZA HUT|DOMINO'?S|DUNKIN|STARBUCKS|CHIPOTLE|SONIC|ARBY'?S|" +
      "DAIRY QUEEN|PAPA JOHN|LITTLE CAESAR|PAPA JOHN'?S|KENTUCKY FRIED|" +
      "PANDA EXPRESS|FIVE GUYS|WHATABURGER|JACK IN THE BOX|PANERA|" +
      "OLIVE GARDEN|APPLEBEE|WHITE CASTLE|RAISING CANE|IN-N-OUT|" +
      "BUFFALO WILD|WINGSTOP|CULVER)",
    "i"
  );
  const GENERIC_REST = /^(Fast foods?|Restaurant)\b/i;
  const CHAIN_WORD = new RegExp(
    "\\b(mcdonald'?s|mcdonalds|burger king|wendy'?s|wendys|taco bell|" +
      "chick-fil-a|chickfila|chipotle|subway|starbucks|kfc|popeyes|" +
      "pizza hut|domino'?s|dunkin|arby'?s|dairy queen|panda express|" +
      "five guys|whataburger|panera|olive garden)\\b",
    "i"
  );
  const OFF_RESTAURANT_CAT = /fast-food|restaurant|cafeteria|ice-cream-shop/i;

  const KIND_LABEL = {
    restaurant: "Fast food",
    grocery: "Grocery brand",
    basic: "Basic",
    custom: "Yours",
  };

  function classifyKind(name, brand, explicit) {
    if (explicit) return explicit;
    const n = String(name || "");
    if (CHAIN_START.test(n) || GENERIC_REST.test(n)) return "restaurant";
    if (brand && CHAIN_START.test(String(brand))) return "restaurant";
    return "basic";
  }

  function unpackRow(row, fallback) {
    fallback = fallback || {};
    const food = {
      id: row[0],
      name: row[1],
      kcal: row[2],
      protein: row[3],
      carbs: row[4],
      fat: row[5],
      portions: (row[6] || []).map((p) => ({ name: p[0], grams: p[1] })),
    };
    if (row[7]) food.brand = row[7];
    food.kind = row[8] || classifyKind(food.name, food.brand);
    if (!food.kind) food.kind = "basic";
    food.source = row[9] || (fallback && fallback.source) || "usda";
    if (row[10]) food.barcode = String(row[10]);
    return food;
  }

  function unpack(payload, fallback) {
    const list = (payload && payload.foods) || [];
    return list.map((row) => unpackRow(row, fallback));
  }

  function haystack(f) {
    return ((f && f.name) || "") + " " + ((f && f.brand) || "") + " " + ((f && f.barcode) || "");
  }

  function servingPortion(food) {
    const p = (food && food.portions) || [];
    return p.length ? p[0] : { name: "100 g", grams: 100 };
  }

  function servingMacros(food) {
    const p = servingPortion(food);
    const g = p.grams || 100;
    const scale = g / 100;
    const r1 = (n) => Math.round((Number(n) || 0) * scale * 10) / 10;
    return {
      grams: g,
      label: p.name || "serving",
      kcal: Math.round((Number(food.kcal) || 0) * scale),
      protein: r1(food.protein),
      carbs: r1(food.carbs),
      fat: r1(food.fat),
    };
  }

  function badge(food) {
    if (food && food.custom) return { kind: "custom", label: KIND_LABEL.custom };
    const kind = (food && food.kind) || "basic";
    return { kind: kind, label: KIND_LABEL[kind] || "Basic" };
  }

  function mergeFoods(base, incoming) {
    const out = (base || []).slice();
    const seen = {};
    for (let i = 0; i < out.length; i++) seen[out[i].id] = i;
    (incoming || []).forEach((f) => {
      if (!f || !f.id) return;
      if (seen[f.id] != null) out[seen[f.id]] = f;
      else {
        seen[f.id] = out.length;
        out.push(f);
      }
    });
    return out;
  }

  function search(list, q, opts) {
    opts = opts || {};
    const limit = opts.limit || 40;
    const kind = opts.kind || "all";
    const query = String(q || "").trim().toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    const scored = [];
    const wantsChain = query && CHAIN_WORD.test(query);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (kind && kind !== "all") {
        const k = f.custom ? "custom" : f.kind || "basic";
        if (kind === "restaurant" && k !== "restaurant") continue;
        if (kind === "grocery" && k !== "grocery") continue;
        if (kind === "basic" && k !== "basic") continue;
      }
      if (!query) {
        scored.push([0, f]);
        if (scored.length >= Math.min(20, limit)) break;
        continue;
      }
      const n = haystack(f).toLowerCase();
      let ok = true;
      for (let w = 0; w < words.length; w++) {
        if (!n.includes(words[w])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const name = (f.name || "").toLowerCase();
      const brand = (f.brand || "").toLowerCase();
      let score = 0;
      if (name.startsWith(query)) score += 200;
      else if (name.includes(" " + query) || name.includes("," + query)) score += 80;
      if (brand && brand === query) score += 120;
      else if (brand && brand.startsWith(query)) score += 60;
      else if (brand && query.includes(brand)) score += 40;
      const idx = name.indexOf(words[0]);
      if (idx >= 0) score += Math.max(0, 40 - idx);
      score -= Math.min(name.length, 80) * 0.15;
      if (f.custom) score += 15;
      if (wantsChain && f.kind === "restaurant") score += 50;
      if (f.source === "openfoodfacts" || (f.id && String(f.id).charAt(0) === "o")) score -= 8;
      scored.push([score, f]);
    }
    if (query) scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit).map((x) => x[1]);
  }

  function loadCache() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((f) => f && f.id && f.name) : [];
    } catch (err) {
      return [];
    }
  }

  function saveCache(items) {
    try {
      if (!root.localStorage) return;
      const slim = (items || []).slice(0, CACHE_CAP).map((f) => ({
        id: f.id,
        name: f.name,
        kcal: f.kcal,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        portions: f.portions || [],
        brand: f.brand || "",
        kind: f.kind || "grocery",
        source: f.source || "openfoodfacts",
        barcode: f.barcode || "",
        cached: true,
      }));
      root.localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    } catch (err) {
      /* quota — ignore */
    }
  }

  function remember(food, cache) {
    if (!food || !food.id) return cache || loadCache();
    const next = mergeFoods(
      [food],
      (cache || loadCache()).filter((f) => f.id !== food.id)
    );
    saveCache(next);
    return next;
  }

  function lookupBarcodeLocal(list, code) {
    const c = String(code || "").replace(/\s+/g, "");
    if (!c) return null;
    const variants = uniqueCodes(c);
    for (let i = 0; i < list.length; i++) {
      const b = String(list[i].barcode || "").replace(/\s+/g, "");
      if (b && variants.indexOf(b) >= 0) return list[i];
      if (list[i].id === "o" + c || list[i].id === "b" + c) return list[i];
    }
    return null;
  }

  function uniqueCodes(code) {
    const c = String(code || "").replace(/\D/g, "") || String(code || "");
    const out = [String(code), c];
    if (/^\d{12}$/.test(c)) out.push("0" + c); // UPC-A -> EAN-13
    if (/^\d{13}$/.test(c) && c.charAt(0) === "0") out.push(c.slice(1));
    return out.filter((x, i, a) => x && a.indexOf(x) === i);
  }

  function offKind(product) {
    const brands = String((product && product.brands) || "");
    const cats = ((product && product.categories_tags) || []).join(" ");
    if (OFF_RESTAURANT_CAT.test(cats) || CHAIN_WORD.test(brands) || CHAIN_START.test(brands)) {
      return "restaurant";
    }
    return "grocery";
  }

  function num(v) {
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  function fromOpenFoodFacts(product) {
    if (!product) return null;
    const name = String(product.product_name || product.generic_name || "").trim();
    if (!name) return null;
    const n = product.nutriments || {};
    let kcal = num(n["energy-kcal_100g"]);
    if (kcal == null) kcal = num(n["energy-kcal"]);
    if (kcal == null && n["energy-kj_100g"] != null) {
      const kj = num(n["energy-kj_100g"]);
      if (kj != null) kcal = kj / 4.184;
    } else if (kcal == null && n.energy_100g != null && String(n.energy_unit || "").toLowerCase() === "kj") {
      kcal = num(n.energy_100g) / 4.184;
    }
    const protein = num(n.proteins_100g);
    const carbs = num(n.carbohydrates_100g);
    const fat = num(n.fat_100g);
    if (kcal == null || protein == null || carbs == null || fat == null) return null;
    if (kcal < 0 || kcal > 900 || protein < 0 || carbs < 0 || fat < 0) return null;
    if (protein > 100 || carbs > 100 || fat > 100) return null;
    const brandRaw = Array.isArray(product.brands) ? product.brands[0] : product.brands;
    const brand = String(brandRaw || "").split(",")[0].trim();
    const code = String(product.code || "").trim();
    const portions = [];
    const sq = num(product.serving_quantity);
    const servingLabel = String(product.serving_size || "").trim();
    if (sq && sq > 0 && sq <= 2000) {
      portions.push({ name: servingLabel || "1 serving", grams: Math.round(sq * 10) / 10 });
    } else if (servingLabel) {
      const m = servingLabel.match(/(\d+(?:\.\d+)?)\s*g\b/i);
      if (m) {
        const g = Number(m[1]);
        if (g > 0 && g <= 2000) portions.push({ name: servingLabel, grams: g });
      } else {
        const ml = servingLabel.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
        if (ml) {
          const g = Number(ml[1]);
          if (g > 0 && g <= 2000) portions.push({ name: servingLabel, grams: g });
        }
      }
    }
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      id: "o" + (code || name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24)),
      name: name,
      kcal: Math.round(kcal * 10) / 10,
      protein: r1(protein),
      carbs: r1(carbs),
      fat: r1(fat),
      portions: portions,
      brand: brand,
      kind: offKind(product),
      source: "openfoodfacts",
      barcode: code,
    };
  }

  function offHeaders() {
    return { Accept: "application/json", "User-Agent": OFF_UA };
  }

  function fetchJson(url) {
    return fetch(url, { headers: offHeaders(), mode: "cors" }).then((res) => {
      if (!res.ok) throw new Error("Open Food Facts " + res.status);
      return res.json();
    });
  }

  function firstOk(urls) {
    let chain = Promise.reject(new Error("No hosts"));
    urls.forEach((url) => {
      chain = chain.catch(function () {
        return fetchJson(url);
      });
    });
    return chain;
  }

  function withOffHost(pathAndQuery) {
    return firstOk(OFF_HOSTS.map((h) => h + pathAndQuery));
  }

  function mapOffProducts(data) {
    const products = (data && (data.products || data.hits)) || [];
    const out = [];
    const seen = {};
    products.forEach((p) => {
      const f = fromOpenFoodFacts(p);
      if (!f || seen[f.id]) return;
      seen[f.id] = true;
      out.push(f);
    });
    return out;
  }

  function searchOpenFoodFacts(query) {
    const q = String(query || "").trim();
    if (q.length < 2) return Promise.resolve([]);
    const encoded = encodeURIComponent(q);
    const urls = [
      OFF_SEARCH + "/search?q=" + encoded + "&page_size=20",
      ...OFF_HOSTS.map(
        (h) =>
          h +
          "/cgi/search.pl?search_terms=" +
          encoded +
          "&search_simple=1&action=process&json=1&page_size=20&fields=" +
          encodeURIComponent(OFF_FIELDS)
      ),
    ];
    return firstOk(urls).then(mapOffProducts);
  }

  function lookupBarcode(code) {
    const c = String(code || "").replace(/\s+/g, "");
    if (!/^\d{8,14}$/.test(c)) {
      return Promise.reject(new Error("Enter an 8 to 14 digit barcode."));
    }
    const path = "/api/v2/product/" + encodeURIComponent(c) + ".json?fields=" + encodeURIComponent(OFF_FIELDS);
    return withOffHost(path).then((data) => {
      if (!data || (data.status !== 1 && data.status !== "1" && !data.product)) {
        const err = new Error("No product found for that barcode.");
        err.code = "not_found";
        throw err;
      }
      const f = fromOpenFoodFacts(data.product);
      if (!f) {
        const err = new Error("That product is missing calories or macros, so it wasn’t added.");
        err.code = "incomplete";
        throw err;
      }
      return f;
    });
  }

  function hasBarcodeDetector() {
    return typeof root.BarcodeDetector === "function";
  }

  function canUseCamera() {
    return !!(root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia);
  }

  root.PPCatalog = {
    CACHE_KEY: CACHE_KEY,
    OFF_ATTRIBUTION: OFF_ATTRIBUTION,
    KIND_LABEL: KIND_LABEL,
    classifyKind: classifyKind,
    unpackRow: unpackRow,
    unpack: unpack,
    haystack: haystack,
    servingPortion: servingPortion,
    servingMacros: servingMacros,
    badge: badge,
    mergeFoods: mergeFoods,
    search: search,
    loadCache: loadCache,
    saveCache: saveCache,
    remember: remember,
    lookupBarcodeLocal: lookupBarcodeLocal,
    uniqueCodes: uniqueCodes,
    fromOpenFoodFacts: fromOpenFoodFacts,
    searchOpenFoodFacts: searchOpenFoodFacts,
    lookupBarcode: lookupBarcode,
    hasBarcodeDetector: hasBarcodeDetector,
    canUseCamera: canUseCamera,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
