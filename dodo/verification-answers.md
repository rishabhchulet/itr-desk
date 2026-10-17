# Dodo Payments – verification form answers

Paste these into app.dodopayments.com/verification. Replace the website URL
once GitHub Pages is live (Settings → Pages → Deploy from branch → main, /docs).

## Product Information

**Website(s) where customers purchase or access your product**
https://rishabhchulet.github.io/itr-desk/
(after Chrome Web Store approval, add the store listing URL as a second site)

**Briefly describe what your product does**
ITR Desk is a Chrome browser extension for chartered accountants and tax
practitioners in India who work on the government Income Tax e-Filing portal
for many clients. It adds a side panel with a client switcher, autofills the
client's PAN as the login User ID, keeps the portal session from timing out,
organises downloaded tax documents into a folder per client, and shows
upcoming compliance due dates. The free version is limited to 5 clients; the
Pro version (₹999 per year, or $29 per year outside India) unlocks unlimited
clients, a notice tracker and CSV import/export. Pro is delivered as a licence
key that the customer pastes into the extension. All customer data stays on
the customer's own computer; the only server call is the licence validation
through Dodo Payments.

**Which category best describes your product?**
Software / SaaS → Browser extension (pick the closest: "Software", "SaaS" or
"Digital products / Downloads")

**How do customers receive the product after payment?**
☑ Email delivery (attachment, license keys etc)
☑ Instant access (login, download etc) – the extension itself is a free
download from the Chrome Web Store; the licence key unlocks Pro instantly.

**Pricing model** (if asked)
Annual subscription with a 14-day refund window. Single plan: Pro.

**Refund policy URL**
https://rishabhchulet.github.io/itr-desk/refunds.html

**Terms / Privacy URLs**
https://rishabhchulet.github.io/itr-desk/terms.html
https://rishabhchulet.github.io/itr-desk/privacy.html

**Expected monthly volume** (if asked)
Under $1,000 for the first 3 months.

**Customer support email**
Use a real inbox you check – the same address should appear in docs/*.html.

## Personal Information
Your own legal name as on PAN, address, PAN number, date of birth. Individual
(not a company) is fine; Dodo onboards sole proprietors.

## Bank Verification
Indian savings or current account: account number, IFSC, account holder name
(must match the PAN name). Payouts arrive as foreign inward remittance; ask
your bank for the FIRA/FIRC if you need it for GST export records later.

## After verification
1. Products → New → "ITR Desk Pro (1 year)", price ₹999, enable License Keys
   (activations limit 3, expiry 1 year). Add a second price in USD ($29) or
   enable adaptive currency.
2. Copy the checkout link into `extension/lib/limits.js` → `PRICING.checkoutUrl`
   and into `docs/index.html` → the "Buy Pro" button.
3. Switch `DODO_BASE` in `extension/lib/license.js` to live.
4. Test with Dodo test mode first: create a test licence key and activate it in
   the extension's Settings tab.
