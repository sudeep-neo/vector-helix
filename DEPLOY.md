# Deploying Vectorhelix — Cloudflare Pages + D1

A static site (`index.html`) with a contact form that posts to a Cloudflare
Pages Function (`functions/api/contact.js`), which stores submissions in a
Cloudflare D1 database. Everything below runs on Cloudflare's free tier.

## What's in this folder

```
index.html                 # the site (contact form posts to /api/contact)
functions/api/contact.js   # Pages Function — validates + inserts into D1
schema.sql                 # D1 table definition
wrangler.toml              # project + D1 binding config
```

---

## 0. Prerequisites

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org) 18+ installed (gives you `npx`)

You do **not** need to install Wrangler globally — `npx wrangler` fetches it.

Log in once:

```bash
npx wrangler login
```

---

## 1. Create the D1 database

```bash
npx wrangler d1 create vectorhelix-contacts
```

This prints a `database_id`. Copy it into **`wrangler.toml`**, replacing
`REPLACE_WITH_YOUR_DATABASE_ID`.

## 2. Create the table

Apply the schema to both your local dev copy and the live (remote) database:

```bash
# local (for `wrangler pages dev`)
npx wrangler d1 execute vectorhelix-contacts --local --file=./schema.sql

# remote (production)
npx wrangler d1 execute vectorhelix-contacts --remote --file=./schema.sql
```

---

## 3. Test locally (optional but recommended)

The plain static preview (e.g. `python -m http.server`) will **not** run the
Function — the form will 404 on `/api/contact`. To exercise the real Function
+ local D1:

```bash
npx wrangler pages dev .
```

Open the printed URL, submit the form, then confirm the row landed:

```bash
npx wrangler d1 execute vectorhelix-contacts --local \
  --command="SELECT id, name, email, created_at FROM contacts ORDER BY id DESC LIMIT 5"
```

---

## 4. Deploy

Pick **one** of the two paths.

### Path A — Git-connected (recommended, auto-deploys on push)

1. Push this folder to a GitHub/GitLab repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
4. **Settings → Functions → D1 database bindings → Add binding:**
   - Variable name: `DB`
   - D1 database: `vectorhelix-contacts`
5. Save and deploy.

### Path B — Direct upload from your machine

```bash
npx wrangler pages deploy .
```

Then add the D1 binding in the dashboard exactly as in Path A step 4
(**Settings → Functions → D1 database bindings**, variable name `DB`).

> The `[[d1_databases]]` block in `wrangler.toml` covers local dev and direct
> deploys. For Git-connected deploys, the **dashboard binding is what counts** —
> make sure the variable name is `DB`.

---

## 5. Read your submissions

```bash
npx wrangler d1 execute vectorhelix-contacts --remote \
  --command="SELECT id, name, email, company, created_at FROM contacts ORDER BY id DESC LIMIT 50"
```

Or browse the table visually in the dashboard: **Workers & Pages → D1 →
vectorhelix-contacts → Console**.

---

## 6. Custom domain

Pages project → **Custom domains → Set up a domain** → enter e.g.
`vectorhelix.ai`. Cloudflare issues the SSL certificate automatically. If the
domain's DNS is already on Cloudflare, it's a one-click attach.

---

## Notes

- **Spam:** the form includes a hidden honeypot field (`website`). Bots that
  fill it are silently accepted and discarded. If you later get real spam,
  add [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
  (free) in front of the form.
- **Email notifications:** D1 stores submissions but doesn't email you. To get
  an email per submission, add a call to a mail API (e.g. Resend/MailChannels)
  inside `functions/api/contact.js` after the insert.
- **Free tier limits:** Pages functions 100k requests/day; D1 5 GB storage,
  5M row reads/day, 100k writes/day. A contact form won't come close.
