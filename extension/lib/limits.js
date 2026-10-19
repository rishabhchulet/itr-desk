// Free vs Pro gates. Keep the free tier genuinely useful for a single
// practitioner; charge for volume and the hours-saving features.

export const FREE_CLIENT_LIMIT = 5;

export const FEATURES = {
  // free
  clients: { pro: false, label: 'Client switcher (up to 5 clients)' },
  autofill: { pro: false, label: 'PAN / User ID autofill on login' },
  keepAlive: { pro: false, label: 'Session keep-alive' },
  dueDates: { pro: false, label: 'Due-date strip' },
  organiseDownloads: { pro: false, label: 'Downloads sorted into ITR Desk/<Client>/' },
  // pro
  unlimitedClients: { pro: true, label: 'Unlimited clients' },
  csv: { pro: true, label: 'Import / export clients as CSV' },
  notices: { pro: true, label: 'Notice & demand tracker with reminders' },
  perFyFolders: { pro: true, label: 'Downloads sorted by client and financial year' },
  tags: { pro: true, label: 'Tags and saved filters' }
};

export const PRICING = {
  inr: { amount: 999, period: 'year', label: '₹999 / year' },
  usd: { amount: 29, period: 'year', label: '$29 / year' },
  // Dodo Payments checkout for 'ITR Desk Pro (1 year)'.
  checkoutUrl: 'https://checkout.dodopayments.com/buy/pdt_0NpvFFUGIHy7gOozbMepj?quantity=1&redirect_url=https%3A%2F%2Frishabhchulet.github.io%2Fitr-desk%2Fthanks.html'
};

export function canAddClient(count, isPro) {
  return isPro || count < FREE_CLIENT_LIMIT;
}

export function isEnabled(feature, isPro) {
  const f = FEATURES[feature];
  if (!f) return false;
  return f.pro ? isPro : true;
}
