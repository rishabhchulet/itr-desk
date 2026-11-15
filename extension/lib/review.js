// When to ask for a store review: only after real use (5 client switches, PAN fills
// or sorted downloads in total, and at least 2 days after first use). "Not now" waits
// 14 days; a second "Not now", "Don't ask again" or opening the review page ends it
// for good. The counts live in local extension storage only (lib/storage.js).

export const REVIEW_AFTER = { actions: 5, days: 2, snoozeDays: 14 };
const DAY = 86400000;

export function actionCount(e) {
  return (e?.switches || 0) + (e?.fills || 0) + (e?.filed || 0);
}

export function reviewDue(e, now = Date.now()) {
  if (!e || !e.review || e.review.state === 'done' || e.review.state === 'never') return false;
  if (e.review.until && now < e.review.until) return false;
  const used = actionCount(e) >= REVIEW_AFTER.actions;
  const aged = !!e.firstSeen && now - e.firstSeen >= REVIEW_AFTER.days * DAY;
  return used && aged;
}

// State after "Not now": the first one snoozes, the second one stops asking.
export function afterNotNow(e, now = Date.now()) {
  return (e?.review?.asks || 0) >= 1
    ? { state: 'never', until: 0 }
    : { state: 'snoozed', until: now + REVIEW_AFTER.snoozeDays * DAY };
}

// Review pages per store. Edge has no separate reviews URL; ratings are on the listing.
const STORES = {
  chrome: {
    name: 'the Chrome Web Store',
    review: 'https://chromewebstore.google.com/detail/leoeaiapcfpdppdipnkhppdlckkdifen/reviews'
  },
  edge: {
    name: 'Edge Add-ons',
    review: 'https://microsoftedge.microsoft.com/addons/detail/angkkgcjkfbhljkkooamojjpgiipnnba'
  },
  firefox: {
    name: 'Firefox Add-ons',
    review: 'https://addons.mozilla.org/firefox/addon/itr-desk-income-tax-companion/reviews/'
  }
};

export function browserName() {
  try {
    if (chrome.runtime.getURL('').startsWith('moz-extension:')) return 'firefox';
  } catch { /* not running as an extension (tests) */ }
  return /\bEdg\//.test(globalThis.navigator?.userAgent || '') ? 'edge' : 'chrome';
}

export const storeName = () => STORES[browserName()].name;
export const reviewLink = () => STORES[browserName()].review;
