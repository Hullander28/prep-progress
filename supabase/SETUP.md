# Supabase setup for Prep & Progress cloud backup

The app stays fully usable offline without any of this. Fill in `js/config.js` only after the project exists, then bump the service-worker version and ship.

## 1. Create the project

1. In the Supabase dashboard, create a free project (the account is the one being set up for `hullanderink-nsfp5v@mail.grokbot.com`).
2. Wait until the project is healthy.
3. Copy **Project URL** and the **anon public** key from **Project Settings → API**. Never put the `service_role` key in the app.

Paste them into `js/config.js`:

```js
root.PPConfig = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...the-anon-key...",
  REDIRECT_URL: "https://hullander28.github.io/prep-progress/",
};
```

## 2. Authentication URLs

**Authentication → URL Configuration:**

- **Site URL:** `https://hullander28.github.io/prep-progress/`
- **Redirect URLs** (add each, no trailing issues if you include both):
  - `https://hullander28.github.io/prep-progress/`
  - `https://hullander28.github.io/prep-progress/**`
  - `http://127.0.0.1:*/*` and `http://localhost:*/*` if you want to test locally

## 3. Email (passwordless) provider

**Authentication → Providers → Email:**

- Enable the Email provider.
- Leave **Confirm email** on if you want; the 6-digit code (or magic link) confirms the address.
- Do **not** require a password. This app is OTP / magic-link only.
- Keep **Secure email change** as you prefer (not used by the app today).

The app sends `POST /auth/v1/otp` with `create_user: true` and `Redirect-To: https://hullander28.github.io/prep-progress/`. Sign-in prefers the **magic link** (the default free-tier email template). A 6-digit code field is still available if you later add custom SMTP and put `{{ .Token }}` in the template. On iPhone, the link opens in Safari, which does not share storage with a Home Screen app — after tapping the link, stay in Safari for cloud backup.

## 4. Email template — include the OTP code

**Authentication → Email Templates → Magic Link** (and **Confirm sign up** if that template is used for a first-time OTP):

Include the token in the body, not only the confirmation URL. Example:

```
Sign in to Prep & Progress

Your one-time code is: {{ .Token }}

It expires shortly. Enter this code in the app.

If you opened this email on a computer, you can also use this link:
{{ .ConfirmationURL }}

If you didn't request this, you can ignore the message.
```

`{{ .Token }}` is required for the in-app 6-digit field. `{{ .ConfirmationURL }}` is the magic-link fallback (tokens land in the page URL hash and the app will pick them up).

Optional: lower **OTP expiry** only if you want a shorter window; the default is fine.

## 5. Database

In the **SQL Editor**, run `supabase/schema.sql`. That creates:

- `public.user_state (user_id, data jsonb, updated_at)` with `user_id` pointing at `auth.users`
- Row Level Security so a user can only `select` / `insert` / `update` / `delete` their own row (`auth.uid() = user_id`)
- `delete_own_account()` so a signed-in user can erase their cloud row and auth user

Confirm in **Authentication → Policies** / the Table Editor that RLS is on.

## 6. Ship the app

After the URL and anon key are in `js/config.js`:

- Bump `VERSION` in `sw.js` (already prepared as `pp-v4-2026-11-12-auth` in this working tree) so clients fetch the new config and `js/sync.js`.
- Commit and push when asked — do not push keys to a public repo if you ever switch to a restricted key; the **anon** key is designed to be public and is protected by RLS.

## What is synced

Profile, settings, journal, weights, recipes, custom foods, plan, and awards. The USDA food database stays on the device only.
