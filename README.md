# ITR Desk

Chrome extension (Manifest V3) that sits beside the Income Tax e-Filing portal
(`eportal.incometax.gov.in`) as a side panel for chartered accountants and tax
practitioners in India.

Free: client switcher (5 clients), PAN autofill on login, session keep-alive,
portal downloads sorted into `Downloads/ITR Desk/<Client>/`, due-date strip.
Pro (₹999/yr, $29/yr): unlimited clients, tags, notice & demand tracker,
downloads split by assessment year, CSV import/export.

Everything is local-first. No account, no server, no passwords stored.
Pro licences are sold through Dodo Payments (merchant of record) and verified
with Dodo's public licence endpoints.

## Layout

```
extension/            the unpacked extension (load this folder in chrome://extensions)
  manifest.json
  background.js       service worker: download organiser, licence re-check, messaging
  content/portal.js   runs on the portal: badge, PAN autofill, keep-alive
  sidepanel/          the UI (vanilla JS, no build step)
  lib/                storage, licence (Dodo), limits (free/pro), due dates
  data/due-dates.json compliance calendar rules
docs/                 landing site + privacy/terms/refunds (GitHub Pages, /docs folder)
store/                Chrome Web Store listing copy and promo assets
dodo/                 answers for the Dodo Payments verification form
scripts/package.sh    zips extension/ for store upload
```

## Develop

1. `chrome://extensions` → Developer mode → Load unpacked → pick `extension/`.
2. Open https://eportal.incometax.gov.in/ — the badge appears bottom-right; click the toolbar icon (or Alt+Shift+I) for the side panel.
3. Edit files, then click the reload icon on the extension card.

No bundler. Keep it that way until there's a reason not to.

## Before first release

- [x] Dodo: product `ITR Desk Pro (1 year)` (pdt_0NpvFFUGIHy7gOozbMepj), $29 / ₹999 (India override), licence key 1 year, 3 activations.
- [x] `lib/license.js` on live, `lib/limits.js` + `docs/index.html` point at the Dodo checkout, redirect to `docs/thanks.html`.
- [ ] Verify the User ID field selector on the live login page and, if needed, set a default in `content/portal.js` (`findUserIdInput`).
- [ ] Take 1280×800 screenshots for the store (`store/screenshots/`).
- [ ] `scripts/package.sh` → upload `dist/itr-desk-<version>.zip`.

## Release

```
bash scripts/package.sh        # → dist/itr-desk-0.1.0.zip
```

Bump `version` in `extension/manifest.json` and add a line to `CHANGELOG.md` for every upload.

## Licence

Proprietary. See `LICENSE`.
