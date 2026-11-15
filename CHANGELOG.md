# Changelog

## 0.1.2 – unreleased
- Asks for a store review once, and only after real use: 5 client switches, PAN fills
  or downloads sorted into a client folder, and at least 2 days after first use.
  "Not now" waits 14 days; a second "Not now", "Don't ask again" or opening the
  review page stops it for good. The counts stay in this browser and are never sent.
- Settings: new Feedback card with the support email and a permanent
  "Rate ITR Desk" button (Chrome Web Store, Edge Add-ons or Firefox Add-ons).

## 0.1.1 – 2026-10-19 (Chrome Web Store; Edge Add-ons and Firefox Add-ons in Nov 2026)
- Keep-alive: switching it off now also stops the session-prompt auto-dismiss,
  and re-saving settings no longer stacks extra 15-second timers.
- Removed the unused `PRICING.trialDays` (there is no trial; Pro has a 14-day refund).

## 0.1.0 – 2026-10-17 (Chrome Web Store)
- Login autofill targets `#panAdhaarUserId` (verified on the live portal).
- Dodo checkout wired (ITR Desk Pro, 1 year); licence API on live.
- First scaffold: side panel with client switcher, PAN autofill, session keep-alive,
  download organiser, due-date strip, notice tracker (Pro), CSV import/export (Pro),
  Dodo licence activation/validation.
