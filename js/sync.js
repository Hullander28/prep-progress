/* Prep & Progress — optional Supabase email sign-in and user-data sync.
   Uses the Auth + REST HTTP APIs directly (no CDN, no supabase-js). */
(function (root) {
  const AUTH_KEY = "prepProgress.auth.v1";
  const META_KEY = "prepProgress.sync.v1";
  const DEBOUNCE_MS = 2500;

  let hooks = {
    getState: function () { return null; },
    applyState: function () {},
    onStatus: function () {},
    onSession: function () {},
    onConflict: function () {},
  };
  let status = "idle";
  let statusDetail = "";
  let applyingRemote = false;
  let pushTimer = 0;
  let pendingPush = false;
  let online = typeof navigator === "undefined" ? true : navigator.onLine !== false;

  function cfg() {
    const c = root.PPConfig || {};
    const url = String(c.SUPABASE_URL || "").replace(/\/$/, "").trim();
    const key = String(c.SUPABASE_ANON_KEY || "").trim();
    const redirect = String(c.REDIRECT_URL || "https://hullander28.github.io/prep-progress/").trim();
    const placeholder = !url || !key || /YOUR_|PLACEHOLDER|TODO/i.test(url + key);
    return { url: url, key: key, redirect: redirect, enabled: !placeholder };
  }

  function isEnabled() {
    return cfg().enabled;
  }

  function readJson(key, fallback) {
    try {
      const raw = root.localStorage && localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      if (val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(val));
    } catch (err) {}
  }

  function getSession() {
    return readJson(AUTH_KEY, null);
  }

  function setSession(sess) {
    if (sess && sess.access_token) writeJson(AUTH_KEY, sess);
    else writeJson(AUTH_KEY, null);
    hooks.onSession(getUser());
  }

  function getMeta() {
    return Object.assign(
      { firstSyncDone: false, lastLocalEditAt: null, lastSyncedAt: null, lastCloudUpdatedAt: null, userId: null },
      readJson(META_KEY, {})
    );
  }

  function setMeta(patch) {
    writeJson(META_KEY, Object.assign(getMeta(), patch || {}));
  }

  function getUser() {
    const s = getSession();
    return (s && s.user) || null;
  }

  function isSignedIn() {
    return !!(getSession() && getSession().access_token);
  }

  function signedInEmail() {
    const u = getUser();
    return (u && (u.email || (u.user_metadata && u.user_metadata.email))) || "";
  }

  function setStatus(next, detail) {
    status = next;
    statusDetail = detail || "";
    hooks.onStatus(status, statusDetail);
  }

  function getStatus() {
    return { status: status, detail: statusDetail, online: online, signedIn: isSignedIn(), email: signedInEmail() };
  }

  function labelForStatus() {
    if (!isEnabled() || !isSignedIn()) return "";
    if (!online) return "Offline";
    if (status === "syncing") return "Syncing";
    if (status === "error") return statusDetail || "Couldn't save";
    if (status === "saved" || status === "idle") return "Saved";
    return "Saved";
  }

  function authError(payload, fallback) {
    if (!payload) return fallback || "Something went wrong.";
    if (typeof payload === "string") return payload;
    return payload.msg || payload.message || payload.error_description || payload.error || fallback || "Something went wrong.";
  }

  async function request(path, opts) {
    const c = cfg();
    if (!c.enabled) throw new Error("Cloud backup is not configured.");
    opts = opts || {};
    const headers = Object.assign(
      {
        apikey: c.key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      opts.headers || {}
    );
    const sess = getSession();
    if (opts.auth !== false) {
      const token = (opts.token || (sess && sess.access_token) || c.key);
      headers.Authorization = "Bearer " + token;
    } else {
      headers.Authorization = "Bearer " + c.key;
    }
    const res = await fetch(c.url + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (err) {
        json = { message: text };
      }
    }
    if (!res.ok) {
      const err = new Error(authError(json, "Request failed (" + res.status + ")"));
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  function sessionFromAuth(json) {
    if (!json || !json.access_token) return null;
    const expiresIn = Number(json.expires_in) || 3600;
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      token_type: json.token_type || "bearer",
      expires_at: Date.now() + expiresIn * 1000,
      user: json.user || (json.session && json.session.user) || null,
    };
  }

  async function refreshIfNeeded(force) {
    const sess = getSession();
    if (!sess || !sess.refresh_token) return sess;
    const soon = !sess.expires_at || sess.expires_at < Date.now() + 60 * 1000;
    if (!force && !soon) return sess;
    try {
      const json = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        auth: false,
        body: { refresh_token: sess.refresh_token },
      });
      const next = sessionFromAuth(json);
      if (next) {
        if (!next.user && sess.user) next.user = sess.user;
        setSession(next);
        return next;
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setSession(null);
        setStatus("idle", "");
      }
      throw err;
    }
    return sess;
  }

  async function sendOtp(email) {
    const c = cfg();
    const addr = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) throw new Error("Please enter a valid email address.");
    const path =
      "/auth/v1/otp?redirect_to=" + encodeURIComponent(c.redirect);
    await request(path, {
      method: "POST",
      auth: false,
      headers: { "Redirect-To": c.redirect },
      body: { email: addr, create_user: true },
    });
    return addr;
  }

  async function verifyOtp(email, token) {
    const addr = String(email || "").trim().toLowerCase();
    const code = String(token || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code from your email.");
    const types = ["email", "signup", "magiclink"];
    let lastErr = null;
    for (let i = 0; i < types.length; i++) {
      try {
        const json = await request("/auth/v1/verify", {
          method: "POST",
          auth: false,
          body: { type: types[i], email: addr, token: code },
        });
        const sess = sessionFromAuth(json);
        if (!sess) throw new Error("Sign-in did not return a session.");
        setSession(sess);
        return sess;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("That code didn't work. Try again or request a new one.");
  }

  function collectUrlParams(href) {
    const src = href || (root.location && (location.href || "")) || "";
    let hash = "";
    let search = "";
    try {
      const u = new URL(src, "https://hullander28.github.io/prep-progress/");
      hash = (u.hash || "").replace(/^#/, "");
      search = (u.search || "").replace(/^\?/, "");
    } catch (err) {
      const hashAt = src.indexOf("#");
      const qAt = src.indexOf("?");
      if (qAt >= 0) search = src.slice(qAt + 1, hashAt >= 0 ? hashAt : undefined);
      if (hashAt >= 0) hash = src.slice(hashAt + 1);
    }
    const params = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((val, key) => params.set(key, val));
    return params;
  }

  function parseAuthCallback(href) {
    const params = collectUrlParams(href);
    const rawErr = params.get("error_description") || params.get("error");
    if (rawErr) return { error: decodeURIComponent(String(rawErr).replace(/\+/g, " ")) };
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    if (access) {
      const expiresIn = Number(params.get("expires_in")) || 3600;
      return {
        session: {
          access_token: access,
          refresh_token: refresh,
          token_type: params.get("token_type") || "bearer",
          expires_at: Date.now() + expiresIn * 1000,
          user: null,
        },
        via: "hash",
      };
    }
    const tokenHash = params.get("token_hash") || params.get("token");
    const type = params.get("type");
    if (tokenHash && tokenHash.length > 8 && !/^\d{6}$/.test(tokenHash)) {
      return { tokenHash: tokenHash, type: type || "magiclink", via: "token_hash" };
    }
    const code = params.get("code");
    if (code) return { code: code, via: "pkce" };
    return null;
  }

  async function verifyTokenHash(tokenHash, type) {
    const types = [];
    [type, "magiclink", "signup", "email", "recovery"].forEach((t) => {
      if (t && types.indexOf(t) < 0) types.push(t);
    });
    let lastErr = null;
    for (let i = 0; i < types.length; i++) {
      try {
        const json = await request("/auth/v1/verify", {
          method: "POST",
          auth: false,
          body: { type: types[i], token_hash: tokenHash },
        });
        const sess = sessionFromAuth(json);
        if (sess) {
          setSession(sess);
          return sess;
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("That sign-in link is invalid or expired. Request a new one.");
  }

  async function consumeAuthCallback(href) {
    const parsed = parseAuthCallback(href);
    if (!parsed) return null;
    if (parsed.error) {
      clearAuthParams();
      return parsed;
    }
    if (parsed.session) {
      setSession(parsed.session);
      clearAuthParams();
      await hydrateUser(getSession());
      return { session: getSession(), via: "hash" };
    }
    if (parsed.tokenHash) {
      try {
        const sess = await verifyTokenHash(parsed.tokenHash, parsed.type);
        clearAuthParams();
        await hydrateUser(getSession());
        return { session: sess, via: "token_hash" };
      } catch (err) {
        clearAuthParams();
        return { error: err.message || "That sign-in link is invalid or expired." };
      }
    }
    if (parsed.code) {
      clearAuthParams();
      return {
        error:
          "This sign-in link couldn't be finished in this browser. Request a new link and open it in the same browser you used to ask for it.",
      };
    }
    return null;
  }

  function clearAuthParams() {
    try {
      if (!root.history || !root.location) return;
      const u = new URL(location.href);
      if (!u.hash && !u.search) return;
      const params = new URLSearchParams((u.hash || "").replace(/^#/, ""));
      const q = new URLSearchParams(u.search);
      const keys = ["access_token", "refresh_token", "expires_in", "token_type", "type", "error", "error_description", "error_code", "code", "token_hash", "token"];
      let touched = false;
      keys.forEach((k) => {
        if (params.has(k)) {
          params.delete(k);
          touched = true;
        }
        if (q.has(k)) {
          q.delete(k);
          touched = true;
        }
      });
      if (!touched) return;
      const next =
        u.pathname + (q.toString() ? "?" + q.toString() : "") + (params.toString() ? "#" + params.toString() : "");
      history.replaceState(history.state, "", next || u.pathname);
    } catch (err) {}
  }

  async function hydrateUser(sess) {
    if (!sess || !sess.access_token) return sess;
    if (sess.user && sess.user.email) return sess;
    try {
      const user = await request("/auth/v1/user", { token: sess.access_token });
      sess.user = user;
      setSession(sess);
    } catch (err) {}
    return sess;
  }

  async function signOut() {
    const sess = getSession();
    try {
      if (sess && sess.access_token) {
        await request("/auth/v1/logout", { method: "POST", token: sess.access_token });
      }
    } catch (err) {}
    setSession(null);
    setMeta({ userId: null });
    setStatus("idle", "");
  }

  async function deleteAccount() {
    await refreshIfNeeded();
    if (!isSignedIn()) throw new Error("You need to be signed in to delete the cloud account.");
    await request("/rest/v1/rpc/delete_own_account", { method: "POST", body: {} });
    setSession(null);
    writeJson(META_KEY, null);
    setStatus("idle", "");
  }

  function packState(state) {
    const s = state || {};
    return {
      app: "Prep & Progress",
      version: 2,
      profile: s.profile || null,
      logs: s.logs || {},
      weights: s.weights || [],
      recipes: s.recipes || [],
      customFoods: s.customFoods || [],
      plan: s.plan || null,
      settings: s.settings || {},
      achievements: s.achievements || { unlocked: {}, seen: {} },
    };
  }

  function hasMeaningfulLocal(state) {
    const s = state || {};
    if (s.profile) return true;
    if (s.weights && s.weights.length) return true;
    if (s.recipes && s.recipes.length) return true;
    if (s.customFoods && s.customFoods.length) return true;
    if (s.logs && Object.keys(s.logs).length) return true;
    return false;
  }

  function localTimestamp(state, meta) {
    if (meta && meta.lastLocalEditAt) return meta.lastLocalEditAt;
    return null;
  }

  function decideMerge(opts) {
    const o = opts || {};
    const localYes = !!o.hasLocal;
    const cloudYes = !!o.hasCloud;
    if (o.choice === "local") return "push";
    if (o.choice === "cloud") return "pull";
    if (o.choice === "newest") {
      const l = o.localAt ? Date.parse(o.localAt) : 0;
      const c = o.cloudAt ? Date.parse(o.cloudAt) : 0;
      if (c && l && c > l) return "pull";
      return "push";
    }
    if (!localYes && !cloudYes) return "none";
    if (localYes && !cloudYes) return "push";
    if (!localYes && cloudYes) return "pull";
    if (!o.firstSyncDone) return "conflict";
    const l = o.localAt ? Date.parse(o.localAt) : 0;
    const c = o.cloudAt ? Date.parse(o.cloudAt) : 0;
    if (c && l && c > l) return "pull";
    return "push";
  }

  async function fetchCloud() {
    await refreshIfNeeded();
    const rows = await request("/rest/v1/user_state?select=data,updated_at", { method: "GET" });
    if (!rows || !rows.length) return null;
    return { data: rows[0].data, updated_at: rows[0].updated_at };
  }

  async function pushCloud(state) {
    await refreshIfNeeded();
    const sess = getSession();
    if (!sess || !sess.user || !sess.user.id) {
      await hydrateUser(sess);
    }
    const user = getUser();
    if (!user || !user.id) throw new Error("Missing user id for sync.");
    const body = { user_id: user.id, data: packState(state) };
    const rows = await request("/rest/v1/user_state?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: body,
    });
    const updated = rows && rows[0] && rows[0].updated_at;
    setMeta({
      firstSyncDone: true,
      lastSyncedAt: new Date().toISOString(),
      lastCloudUpdatedAt: updated || new Date().toISOString(),
      userId: user.id,
    });
    return updated;
  }

  function applyCloudData(data) {
    applyingRemote = true;
    try {
      hooks.applyState(packState(data));
    } finally {
      applyingRemote = false;
    }
  }

  async function syncNow(choice) {
    if (!isEnabled() || !isSignedIn()) return { action: "none" };
    if (!online) {
      setStatus("offline", "Offline");
      pendingPush = true;
      return { action: "offline" };
    }
    setStatus("syncing", "Syncing");
    try {
      const state = hooks.getState();
      const meta = getMeta();
      const cloud = await fetchCloud();
      const action = decideMerge({
        hasLocal: hasMeaningfulLocal(state),
        hasCloud: !!(cloud && cloud.data),
        localAt: localTimestamp(state, meta) || meta.lastSyncedAt,
        cloudAt: cloud && cloud.updated_at,
        firstSyncDone: !!meta.firstSyncDone && meta.userId === (getUser() && getUser().id),
        choice: choice,
      });
      if (action === "conflict") {
        setStatus("conflict", "Choose which copy to keep");
        hooks.onConflict({
          local: packState(state),
          cloud: cloud.data,
          localAt: meta.lastLocalEditAt || meta.lastSyncedAt,
          cloudAt: cloud.updated_at,
        });
        return { action: "conflict", cloud: cloud };
      }
      if (action === "pull") {
        applyCloudData(cloud.data);
        setMeta({
          firstSyncDone: true,
          lastSyncedAt: new Date().toISOString(),
          lastCloudUpdatedAt: cloud.updated_at,
          lastLocalEditAt: cloud.updated_at,
          userId: getUser() && getUser().id,
        });
        setStatus("saved", "Saved");
        return { action: "pull" };
      }
      if (action === "push") {
        await pushCloud(state);
        setStatus("saved", "Saved");
        pendingPush = false;
        return { action: "push" };
      }
      setStatus("saved", "Saved");
      return { action: "none" };
    } catch (err) {
      if (!online || (err && /failed to fetch|network|offline/i.test(String(err.message || err)))) {
        setStatus("offline", "Offline");
        pendingPush = true;
        return { action: "offline", error: err };
      }
      setStatus("error", err.message || "Couldn't sync");
      throw err;
    }
  }

  function notifyLocalChange() {
    if (applyingRemote || !isEnabled() || !isSignedIn()) return;
    setMeta({ lastLocalEditAt: new Date().toISOString() });
    pendingPush = true;
    if (!online) {
      setStatus("offline", "Offline");
      return;
    }
    setStatus("syncing", "Syncing");
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      syncNow("local").catch(function () {});
    }, DEBOUNCE_MS);
  }

  async function afterLogin() {
    const user = getUser();
    const meta = getMeta();
    if (user && meta.userId && meta.userId !== user.id) {
      setMeta({ firstSyncDone: false, lastCloudUpdatedAt: null, userId: user.id });
    } else if (user) {
      setMeta({ userId: user.id });
    }
    return syncNow();
  }

  async function init(nextHooks) {
    hooks = Object.assign(hooks, nextHooks || {});
    if (typeof window !== "undefined") {
      window.addEventListener("online", function () {
        online = true;
        if (pendingPush && isSignedIn()) syncNow().catch(function () {});
        else if (isSignedIn()) setStatus("saved", "Saved");
      });
      window.addEventListener("offline", function () {
        online = false;
        if (isSignedIn()) setStatus("offline", "Offline");
      });
    }
    if (!isEnabled()) {
      setStatus("idle", "");
      return { enabled: false };
    }
    const fromUrl = await consumeAuthCallback();
    if (fromUrl && fromUrl.error) {
      setStatus("error", fromUrl.error);
      return { enabled: true, error: fromUrl.error, via: null };
    }
    if (fromUrl && fromUrl.session) {
      /* session already stored */
    } else if (isSignedIn()) {
      try {
        await refreshIfNeeded();
        await hydrateUser(getSession());
      } catch (err) {}
    }
    if (isSignedIn()) {
      try {
        return Object.assign({ enabled: true, via: fromUrl && fromUrl.via }, await afterLogin());
      } catch (err) {
        return { enabled: true, error: err.message, via: fromUrl && fromUrl.via };
      }
    }
    setStatus("idle", "");
    return { enabled: true, signedIn: false };
  }

  const api = {
    AUTH_KEY: AUTH_KEY,
    META_KEY: META_KEY,
    isEnabled: isEnabled,
    isSignedIn: isSignedIn,
    signedInEmail: signedInEmail,
    getUser: getUser,
    getSession: getSession,
    getStatus: getStatus,
    labelForStatus: labelForStatus,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    signOut: signOut,
    deleteAccount: deleteAccount,
    packState: packState,
    hasMeaningfulLocal: hasMeaningfulLocal,
    decideMerge: decideMerge,
    parseAuthCallback: parseAuthCallback,
    consumeAuthCallback: consumeAuthCallback,
    notifyLocalChange: notifyLocalChange,
    syncNow: syncNow,
    afterLogin: afterLogin,
    init: init,
    _setOnline: function (v) { online = !!v; },
    _setSession: setSession,
    _setMeta: setMeta,
    _getMeta: getMeta,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPCloud = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
