# Changelog

## 0.1.1 – unreleased
- Keep-alive: switching it off now also stops the session-prompt auto-dismiss,
  and re-saving settings no longer stacks extra 15-second timers.
- Removed the unused `PRICING.trialDays` (there is no trial; Pro has a 14-day refund).

## 0.1.0 – 2026-10-17 (Chrome Web Store)
- Login autofill targets `#panAdhaarUserId` (verified on the live portal).
- Dodo checkout wired (ITR Desk Pro, 1 year); licence API on live.
- First scaffold: side panel with client switcher, PAN autofill, session keep-alive,
  download organiser, due-date strip, notice tracker (Pro), CSV import/export (Pro),
  Dodo licence activation/validation.
