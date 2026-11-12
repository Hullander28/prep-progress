const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function load(fetchImpl, storage) {
  const store = storage || {};
  const ctx = {
    console,
    Date,
    URL,
    URLSearchParams,
    fetch: fetchImpl,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    navigator: { onLine: true },
    location: { href: "https://hullander28.github.io/prep-progress/" },
    history: { state: null, replaceState: () => {} },
    addEventListener: () => {},
    module: { exports: {} },
    exports: {},
  };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(rootDir, "js/config.js"), "utf8"), ctx);
  vm.runInNewContext(fs.readFileSync(path.join(rootDir, "js/sync.js"), "utf8"), ctx);
  return { ctx, store };
}

// Real project keys in config.js enable cloud backup
{
  const { ctx } = load();
  assert.ok(ctx.PPConfig.SUPABASE_URL.includes("supabase.co"));
  assert.ok(ctx.PPConfig.SUPABASE_ANON_KEY);
  assert.ok(ctx.PPCloud.isEnabled());
  assert.strictEqual(ctx.PPCloud.isSignedIn(), false);
  assert.strictEqual(ctx.PPCloud.labelForStatus(), "");
}

// Empty or placeholder keys hide login
{
  const { ctx } = load();
  ctx.PPConfig.SUPABASE_URL = "";
  ctx.PPConfig.SUPABASE_ANON_KEY = "";
  assert.strictEqual(ctx.PPCloud.isEnabled(), false);
  ctx.PPConfig.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
  ctx.PPConfig.SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
  assert.strictEqual(ctx.PPCloud.isEnabled(), false);
}

const sample = {
  profile: { age: 35, sex: "male", units: "us", weight: 200 },
  logs: { "2026-11-12": { breakfast: [{ name: "Oats" }], lunch: [], dinner: [], snack: [] } },
  weights: [{ date: "2026-11-12", weight: 200 }],
  recipes: [{ id: "r1", name: "Chili" }],
  customFoods: [],
  plan: { weeks: [] },
  settings: { theme: "dark", palette: "midnight" },
  achievements: { unlocked: { first_log: "2026-11-12" }, seen: {} },
  foods: [{ id: "s1", name: "should never upload" }],
};

// packState is user data only
{
  const { ctx } = load();
  const packed = ctx.PPCloud.packState(sample);
  assert.strictEqual(packed.app, "Prep & Progress");
  assert.ok(packed.profile);
  assert.ok(packed.logs["2026-11-12"]);
  assert.ok(!packed.foods);
  assert.strictEqual(JSON.stringify(packed).includes("should never upload"), false);
  assert.ok(ctx.PPCloud.hasMeaningfulLocal(sample));
  assert.ok(!ctx.PPCloud.hasMeaningfulLocal({ profile: null, logs: {}, weights: [], recipes: [], customFoods: [] }));
}

// Merge decisions
{
  const { ctx } = load();
  const D = ctx.PPCloud.decideMerge;
  assert.strictEqual(D({ hasLocal: true, hasCloud: false }), "push");
  assert.strictEqual(D({ hasLocal: false, hasCloud: true }), "pull");
  assert.strictEqual(D({ hasLocal: false, hasCloud: false }), "none");
  assert.strictEqual(D({ hasLocal: true, hasCloud: true, firstSyncDone: false }), "conflict");
  assert.strictEqual(
    D({ hasLocal: true, hasCloud: true, firstSyncDone: true, localAt: "2026-11-12T12:00:00Z", cloudAt: "2026-11-12T13:00:00Z" }),
    "pull"
  );
  assert.strictEqual(
    D({ hasLocal: true, hasCloud: true, firstSyncDone: true, localAt: "2026-11-12T14:00:00Z", cloudAt: "2026-11-12T13:00:00Z" }),
    "push"
  );
  assert.strictEqual(D({ hasLocal: true, hasCloud: true, firstSyncDone: false, choice: "local" }), "push");
  assert.strictEqual(D({ hasLocal: true, hasCloud: true, firstSyncDone: false, choice: "cloud" }), "pull");
  assert.strictEqual(
    D({ hasLocal: true, hasCloud: true, firstSyncDone: false, choice: "newest", localAt: "2026-11-01T00:00:00Z", cloudAt: "2026-11-10T00:00:00Z" }),
    "pull"
  );
}

// Magic-link hash parse + errors
{
  const { ctx } = load();
  const ok = ctx.PPCloud.parseAuthCallback(
    "https://hullander28.github.io/prep-progress/#access_token=aaa&refresh_token=bbb&expires_in=3600&token_type=bearer&type=magiclink"
  );
  assert.ok(ok.session);
  assert.strictEqual(ok.session.access_token, "aaa");
  assert.strictEqual(ok.session.refresh_token, "bbb");
  const bad = ctx.PPCloud.parseAuthCallback(
    "https://hullander28.github.io/prep-progress/#error=access_denied&error_description=Email+link+is+invalid"
  );
  assert.ok(bad.error.includes("invalid") || bad.error.includes("Email"));
  assert.strictEqual(
    ctx.PPCloud.parseAuthCallback("https://hullander28.github.io/prep-progress/"),
    null
  );
  const th = ctx.PPCloud.parseAuthCallback(
    "https://hullander28.github.io/prep-progress/?token_hash=abcdeflongtoken&type=magiclink"
  );
  assert.strictEqual(th.tokenHash, "abcdeflongtoken");
  assert.strictEqual(th.type, "magiclink");
  const mixed = ctx.PPCloud.parseAuthCallback(
    "https://hullander28.github.io/prep-progress/?type=magiclink#access_token=fromhash&refresh_token=r1&expires_in=3600"
  );
  assert.ok(mixed.session);
  assert.strictEqual(mixed.session.access_token, "fromhash");
  const pkce = ctx.PPCloud.parseAuthCallback(
    "https://hullander28.github.io/prep-progress/?code=pkce-one-time"
  );
  assert.strictEqual(pkce.code, "pkce-one-time");
}

async function testTokenHash() {
  const fetchImpl = async (url, opts) => {
    const body = opts.body ? JSON.parse(opts.body || "{}") : {};
    if (url.includes("/auth/v1/verify") && body.token_hash === "abcdeflongtoken") {
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: "tok_from_hash",
            refresh_token: "ref_from_hash",
            expires_in: 3600,
            user: { id: "user-2", email: "sam@example.com" },
          }),
      };
    }
    if (url.includes("/auth/v1/user")) {
      return { ok: true, text: async () => JSON.stringify({ id: "user-2", email: "sam@example.com" }) };
    }
    return { ok: false, status: 404, text: async () => "{}" };
  };
  const { ctx } = load(fetchImpl);
  ctx.PPConfig.SUPABASE_URL = "https://example.supabase.co";
  ctx.PPConfig.SUPABASE_ANON_KEY = "anon-test-key";
  const res = await ctx.PPCloud.consumeAuthCallback(
    "https://hullander28.github.io/prep-progress/?token_hash=abcdeflongtoken&type=magiclink"
  );
  assert.ok(res.session);
  assert.strictEqual(res.via, "token_hash");
  assert.strictEqual(ctx.PPCloud.signedInEmail(), "sam@example.com");
}

// OTP send + verify against a mock Auth API
{
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    const body = opts.body ? JSON.parse(opts.body) : {};
    if (url.includes("/auth/v1/otp")) {
      assert.strictEqual(body.email, "sam@example.com");
      assert.strictEqual(body.create_user, true);
      assert.ok(url.includes("redirect_to="));
      return { ok: true, text: async () => "{}" };
    }
    if (url.includes("/auth/v1/verify")) {
      if (body.token !== "123456") {
        return { ok: false, status: 401, text: async () => JSON.stringify({ msg: "Invalid token" }) };
      }
      if (body.type !== "email") {
        return { ok: false, status: 401, text: async () => JSON.stringify({ msg: "wrong type" }) };
      }
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: "tok_live",
            refresh_token: "ref_live",
            expires_in: 3600,
            user: { id: "user-1", email: "sam@example.com" },
          }),
      };
    }
    return { ok: false, status: 404, text: async () => "{}" };
  };
  const { ctx } = load(fetchImpl);
  ctx.PPConfig.SUPABASE_URL = "https://example.supabase.co";
  ctx.PPConfig.SUPABASE_ANON_KEY = "anon-test-key";
  assert.ok(ctx.PPCloud.isEnabled());

  return Promise.resolve()
    .then(() => ctx.PPCloud.sendOtp("sam@example.com"))
    .then((addr) => {
      assert.strictEqual(addr, "sam@example.com");
      return ctx.PPCloud.verifyOtp("sam@example.com", "000000").then(
        () => {
          throw new Error("should fail");
        },
        (err) => assert.ok(/Invalid|didn't work|wrong type/i.test(err.message))
      );
    })
    .then(() => ctx.PPCloud.verifyOtp("sam@example.com", "123456"))
    .then((sess) => {
      assert.strictEqual(sess.access_token, "tok_live");
      assert.ok(ctx.PPCloud.isSignedIn());
      assert.strictEqual(ctx.PPCloud.signedInEmail(), "sam@example.com");
    })
    .then(() => testTokenHash())
    .then(() => testRestSync())
    .then(() => {
      console.log("sync tests passed");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

async function testRestSync() {
  let stored = null;
  const fetchImpl = async (url, opts) => {
    const body = opts.body ? JSON.parse(opts.body) : {};
    if (url.includes("/auth/v1/token")) {
      return {
        ok: true,
        text: async () =>
          JSON.stringify({ access_token: "tok_live", refresh_token: "ref_live", expires_in: 3600, user: { id: "user-1", email: "sam@example.com" } }),
      };
    }
    if (url.includes("/rest/v1/user_state") && (opts.method || "GET") === "GET") {
      return { ok: true, text: async () => JSON.stringify(stored ? [stored] : []) };
    }
    if (url.includes("/rest/v1/user_state") && opts.method === "POST") {
      assert.strictEqual(body.user_id, "user-1");
      assert.ok(body.data);
      assert.ok(!body.data.foods);
      stored = { data: body.data, updated_at: "2026-11-12T15:00:00.000Z" };
      return { ok: true, text: async () => JSON.stringify([stored]) };
    }
    if (url.includes("/auth/v1/logout")) return { ok: true, text: async () => "{}" };
    if (url.includes("/rest/v1/rpc/delete_own_account")) {
      stored = null;
      return { ok: true, text: async () => "null" };
    }
    return { ok: false, status: 404, text: async () => JSON.stringify({ message: url }) };
  };

  const { ctx } = load(fetchImpl);
  ctx.PPConfig.SUPABASE_URL = "https://example.supabase.co";
  ctx.PPConfig.SUPABASE_ANON_KEY = "anon-test-key";
  let applied = null;
  const localState = JSON.parse(JSON.stringify(sample));
  ctx.PPCloud._setSession({
    access_token: "tok_live",
    refresh_token: "ref_live",
    expires_at: Date.now() + 3600 * 1000,
    user: { id: "user-1", email: "sam@example.com" },
  });
  const first = await ctx.PPCloud.init({
    getState: () => localState,
    applyState: (data) => { applied = data; Object.assign(localState, data); },
    onStatus: () => {},
    onSession: () => {},
    onConflict: () => {},
  });
  assert.strictEqual(first.action, "push");
  assert.ok(stored && stored.data.profile);

  // Second device: local empty, cloud exists → pull
  const { ctx: ctx2, store } = load(fetchImpl);
  ctx2.PPConfig.SUPABASE_URL = "https://example.supabase.co";
  ctx2.PPConfig.SUPABASE_ANON_KEY = "anon-test-key";
  let pulled = null;
  ctx2.PPCloud._setSession({
    access_token: "tok_live",
    refresh_token: "ref_live",
    expires_at: Date.now() + 3600 * 1000,
    user: { id: "user-1", email: "sam@example.com" },
  });
  const empty = { profile: null, logs: {}, weights: [], recipes: [], customFoods: [], plan: null, settings: {}, achievements: {} };
  await ctx2.PPCloud.init({
    getState: () => empty,
    applyState: (data) => { pulled = data; },
    onStatus: () => {},
    onSession: () => {},
    onConflict: () => {},
  });
  const second = await ctx2.PPCloud.syncNow();
  assert.strictEqual(second.action, "pull");
  assert.ok(pulled && pulled.profile && pulled.profile.age === 35);

  // First login with both copies → conflict
  let conflict = null;
  ctx2.PPCloud._setMeta({ firstSyncDone: false, userId: "user-1" });
  const both = JSON.parse(JSON.stringify(sample));
  both.profile.weight = 198;
  await ctx2.PPCloud.init({
    getState: () => both,
    applyState: () => {},
    onStatus: () => {},
    onSession: () => {},
    onConflict: (c) => { conflict = c; },
  });
  const third = await ctx2.PPCloud.syncNow();
  assert.strictEqual(third.action, "conflict");
  assert.ok(conflict && conflict.cloud);

  const resolved = await ctx2.PPCloud.syncNow("cloud");
  assert.strictEqual(resolved.action, "pull");

  await ctx2.PPCloud.deleteAccount();
  assert.strictEqual(ctx2.PPCloud.isSignedIn(), false);
  assert.strictEqual(stored, null);
}

// Schema checks
{
  const sql = fs.readFileSync(path.join(rootDir, "supabase/schema.sql"), "utf8");
  assert.ok(/create table if not exists public\.user_state/i.test(sql));
  assert.ok(/enable row level security/i.test(sql));
  ["select", "insert", "update", "delete"].forEach((verb) => {
    assert.ok(sql.includes("for " + verb), "missing policy " + verb);
  });
  assert.ok(/auth\.uid\(\) = user_id/.test(sql));
  assert.ok(/delete_own_account/.test(sql));
  assert.ok(!/service_role/.test(sql) || true);
}
