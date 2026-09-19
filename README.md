# Hope Hub — Website

Luxury streetwear site for Hope Hub. Plain HTML/CSS/JS — no build step, no framework.
Product catalog and site text live in `data/products.json` and `data/content.json`,
so once this is on Netlify you (or your friend) can edit them yourself at `/admin`
without touching code.

## What's in here

```
index.html          the site
css/style.css        all styling
js/app.js            cart, checkout, rendering — reads the two data files below
data/products.json    every product: name, price, colours, sizes, images, story
data/content.json     hero text, story text, WhatsApp numbers, payment details
img/, video/          photos and the hero clip
admin/                the editing dashboard (Decap CMS)
manifest.json          lets people add the site to their phone home screen
netlify.toml           basic Netlify config
```

## 1. Put it on GitHub

```
cd hopehub-site
git init
git add .
git commit -m "Hope Hub site"
```

Create a new empty repo on GitHub (no README/gitignore), then:

```
git remote add origin https://github.com/<your-username>/hopehub-site.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Netlify

1. On [netlify.com](https://netlify.com), **Add new site → Import an existing project**.
2. Pick the `hopehub-site` GitHub repo.
3. Build command: leave blank. Publish directory: `.` (already set in `netlify.toml`).
4. Deploy. You'll get a `*.netlify.app` link immediately — that's your live site.
5. Later, add your own domain under **Site configuration → Domain management**.

## 3. Turn on the `/admin` editor (so you can log in and edit)

This is what makes `data/products.json` and `data/content.json` editable from a
web page instead of by editing code:

1. In the Netlify dashboard for this site: **Site configuration → Identity → Enable Identity**.
2. Under Identity settings, set **Registration** to **Invite only** (so strangers can't sign up).
3. Still under Identity: **Services → Git Gateway → Enable Git Gateway**. This is what lets
   the admin page save changes straight back to your GitHub repo.
4. Go to the **Identity** tab (top nav) → **Invite users** → invite your own email
   (and your friend's, when you're ready to hand it over).
5. Check that email, accept the invite, set a password.
6. Visit `https://<your-site>.netlify.app/admin/` and log in.

From there you'll see two sections: **Products** (add, edit, remove t-shirts/caps,
change prices, swap photos) and **Site Text & Contact Details** (hero copy, WhatsApp
numbers, payment details, delivery policy). Every save there commits to GitHub and
Netlify redeploys automatically — usually live within a minute.

## Notes

- **Don't open `index.html` by double-clicking it.** It loads the product data with
  `fetch()`, which browsers block on `file://` links. Always view it through Netlify
  (or run a local server, e.g. `npx serve .`, while testing).
- Colour swatches only swap the product photo when you've added a matching entry
  under "Alternate images by colour" for that colour — otherwise selecting a colour
  just marks it chosen without changing the picture, since there's no photo for it yet.
- The checkout doesn't charge a card — it opens WhatsApp with the order pre-filled to
  your Orders number, matching how you currently take payment (M-Pesa / EcoCash / bank
  transfer, confirmed manually).
