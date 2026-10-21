/* Creet prices: show each price in the visitor's own currency.

   Markup: <span data-price data-inr="999" data-usd="29" data-unit=" a year">₹999 a year</span>
   - data-inr: the price in rupees, for buyers in India (when the product has one)
   - data-usd: the price in US dollars, for everyone else (when the product has one)
   - data-unit: text after the amount; the element's own text is the no-JavaScript fallback
   A <p data-price-note hidden> on the page explains converted prices when there are any.

   The visitor's country comes from the browser's time zone, so nothing is sent anywhere to
   find it. Prices in another currency are converted the way Dodo Payments' Adaptive Currency
   does at checkout: today's rate plus its 4% conversion fee, rounded and marked "about".
   Dodo can charge in the 82 currencies listed below; anyone else sees US dollars. */
(function () {
  var nodes = document.querySelectorAll('[data-price]');
  if (!nodes.length) return;

  var FX_FEE = 1.04;            // Dodo Adaptive Currency fee on orders under $500
  var RATES_URL = 'https://open.er-api.com/v6/latest/USD';
  var CACHE_KEY = 'creet-fx';
  var CACHE_MS = 12 * 60 * 60 * 1000;

  // Generated 21 Oct 2026 from IANA zone.tab, CLDR currencyData and open.er-api.com.
  var INDIA_ZONES = "Asia/Calcutta Asia/Kolkata";
  var ZONES = {
    AED: "Asia/Dubai",
    ALL: "Europe/Tirane",
    AMD: "Asia/Yerevan",
    AUD: "Antarctica/Macquarie Australia/ACT Australia/Adelaide Australia/Brisbane Australia/Broken_Hill Australia/Canberra Australia/Currie Australia/Darwin Australia/Eucla Australia/Hobart Australia/LHI Australia/Lindeman Australia/Lord_Howe Australia/Melbourne Australia/NSW Australia/North Australia/Perth Australia/Queensland Australia/South Australia/Sydney Australia/Tasmania Australia/Victoria Australia/West Australia/Yancowinna Indian/Christmas Indian/Cocos Pacific/Enderbury Pacific/Funafuti Pacific/Kanton Pacific/Kiritimati Pacific/Nauru Pacific/Norfolk Pacific/Tarawa",
    AWG: "America/Aruba",
    AZN: "Asia/Baku",
    BAM: "Europe/Sarajevo",
    BDT: "Asia/Dacca Asia/Dhaka",
    BMD: "Atlantic/Bermuda",
    BND: "Asia/Brunei",
    BOB: "America/La_Paz",
    BRL: "America/Araguaina America/Bahia America/Belem America/Boa_Vista America/Campo_Grande America/Cuiaba America/Eirunepe America/Fortaleza America/Maceio America/Manaus America/Noronha America/Porto_Acre America/Porto_Velho America/Recife America/Rio_Branco America/Santarem America/Sao_Paulo Brazil/Acre Brazil/DeNoronha Brazil/East Brazil/West",
    BSD: "America/Nassau",
    BWP: "Africa/Gaborone",
    BZD: "America/Belize",
    CAD: "America/Atikokan America/Blanc-Sablon America/Cambridge_Bay America/Creston America/Dawson America/Dawson_Creek America/Edmonton America/Fort_Nelson America/Glace_Bay America/Goose_Bay America/Halifax America/Inuvik America/Iqaluit America/Moncton America/Montreal America/Nipigon America/Pangnirtung America/Rainy_River America/Rankin_Inlet America/Regina America/Resolute America/St_Johns America/Swift_Current America/Thunder_Bay America/Toronto America/Vancouver America/Whitehorse America/Winnipeg America/Yellowknife Canada/Atlantic Canada/Central Canada/Eastern Canada/Mountain Canada/Newfoundland Canada/Pacific Canada/Saskatchewan Canada/Yukon",
    CHF: "Europe/Vaduz Europe/Zurich",
    CLP: "America/Coyhaique America/Punta_Arenas America/Santiago Chile/Continental Chile/EasterIsland Pacific/Easter",
    CNY: "Asia/Chongqing Asia/Chungking Asia/Harbin Asia/Kashgar Asia/Shanghai Asia/Urumqi PRC",
    CRC: "America/Costa_Rica",
    CZK: "Europe/Prague",
    DKK: "America/Danmarkshavn America/Godthab America/Nuuk America/Scoresbysund America/Thule Atlantic/Faeroe Atlantic/Faroe Europe/Copenhagen",
    DOP: "America/Santo_Domingo",
    EGP: "Africa/Cairo Egypt",
    ETB: "Africa/Addis_Ababa",
    EUR: "Africa/Ceuta America/Cayenne America/Guadeloupe America/Marigot America/Martinique America/Miquelon America/St_Barthelemy Asia/Famagusta Asia/Nicosia Atlantic/Azores Atlantic/Canary Atlantic/Jan_Mayen Atlantic/Madeira CET EET Eire Europe/Amsterdam Europe/Andorra Europe/Athens Europe/Berlin Europe/Bratislava Europe/Brussels Europe/Busingen Europe/Dublin Europe/Helsinki Europe/Lisbon Europe/Ljubljana Europe/Luxembourg Europe/Madrid Europe/Malta Europe/Mariehamn Europe/Monaco Europe/Nicosia Europe/Paris Europe/Podgorica Europe/Riga Europe/Rome Europe/San_Marino Europe/Sofia Europe/Tallinn Europe/Vatican Europe/Vienna Europe/Vilnius Europe/Zagreb Indian/Kerguelen Indian/Mayotte Indian/Reunion MET Portugal WET",
    FJD: "Pacific/Fiji",
    GBP: "Atlantic/South_Georgia Europe/Belfast Europe/Guernsey Europe/Isle_of_Man Europe/Jersey Europe/London GB GB-Eire",
    GEL: "Asia/Tbilisi",
    GMD: "Africa/Banjul",
    GTQ: "America/Guatemala",
    GYD: "America/Guyana",
    HKD: "Asia/Hong_Kong Hongkong",
    HNL: "America/Tegucigalpa",
    HUF: "Europe/Budapest",
    IDR: "Asia/Jakarta Asia/Jayapura Asia/Makassar Asia/Pontianak Asia/Ujung_Pandang",
    ILS: "Asia/Gaza Asia/Hebron Asia/Jerusalem Asia/Tel_Aviv Israel",
    INR: "Asia/Calcutta Asia/Kolkata",
    JPY: "Asia/Tokyo Japan",
    KRW: "Asia/Seoul ROK",
    KZT: "Asia/Almaty Asia/Aqtau Asia/Aqtobe Asia/Atyrau Asia/Oral Asia/Qostanay Asia/Qyzylorda",
    LKR: "Asia/Colombo",
    LRD: "Africa/Monrovia",
    MAD: "Africa/Casablanca Africa/El_Aaiun",
    MKD: "Europe/Skopje",
    MOP: "Asia/Macao Asia/Macau",
    MUR: "Indian/Mauritius",
    MVR: "Indian/Maldives",
    MWK: "Africa/Blantyre",
    MXN: "America/Bahia_Banderas America/Cancun America/Chihuahua America/Ciudad_Juarez America/Ensenada America/Hermosillo America/Matamoros America/Mazatlan America/Merida America/Mexico_City America/Monterrey America/Ojinaga America/Santa_Isabel America/Tijuana Mexico/BajaNorte Mexico/BajaSur Mexico/General",
    MYR: "Asia/Kuala_Lumpur Asia/Kuching",
    NGN: "Africa/Lagos",
    NOK: "Arctic/Longyearbyen Europe/Oslo",
    NPR: "Asia/Kathmandu Asia/Katmandu",
    NZD: "Antarctica/South_Pole NZ NZ-CHAT Pacific/Auckland Pacific/Chatham Pacific/Fakaofo Pacific/Niue Pacific/Pitcairn Pacific/Rarotonga",
    PEN: "America/Lima",
    PGK: "Pacific/Bougainville Pacific/Port_Moresby Pacific/Truk Pacific/Yap",
    PHP: "Asia/Manila",
    PLN: "Europe/Warsaw Poland",
    PYG: "America/Asuncion",
    QAR: "Asia/Qatar",
    RON: "Europe/Bucharest",
    RSD: "Europe/Belgrade",
    SAR: "Asia/Riyadh",
    SBD: "Pacific/Guadalcanal Pacific/Ponape",
    SCR: "Indian/Mahe",
    SEK: "Europe/Stockholm",
    SGD: "Asia/Singapore Singapore",
    SZL: "Africa/Mbabane",
    THB: "Asia/Bangkok",
    TOP: "Pacific/Tongatapu",
    TRY: "Asia/Istanbul Europe/Istanbul Turkey",
    TWD: "Asia/Taipei ROC",
    TZS: "Africa/Dar_es_Salaam",
    UYU: "America/Montevideo",
    VND: "Asia/Ho_Chi_Minh Asia/Saigon",
    WST: "Pacific/Apia",
    XAF: "Africa/Bangui Africa/Brazzaville Africa/Douala Africa/Libreville Africa/Malabo Africa/Ndjamena",
    XOF: "Africa/Abidjan Africa/Bamako Africa/Bissau Africa/Dakar Africa/Lome Africa/Niamey Africa/Ouagadougou Africa/Porto-Novo Africa/Timbuktu Iceland",
    ZAR: "Africa/Johannesburg Africa/Maseru",
    ZMW: "Africa/Lusaka"
  };
  var FALLBACK_RATES = {"AED":3.6725,"ALL":81.01,"AMD":361.71,"AUD":1.4286,"AWG":1.79,"AZN":1.6999,"BAM":1.7421,"BDT":123.67,"BMD":1,"BND":1.2781,"BOB":11.69,"BRL":5.0231,"BSD":1,"BWP":13.99,"BZD":2,"CAD":1.4061,"CHF":0.8253,"CLP":981.25,"CNY":6.6913,"CRC":454.33,"CZK":21.66,"DKK":6.6633,"DOP":61.51,"EGP":54.49,"ETB":161.29,"EUR":0.8908,"FJD":2.2587,"GBP":0.7483,"GEL":2.5968,"GMD":74.61,"GTQ":7.6443,"GYD":209.1,"HKD":7.8483,"HNL":26.87,"HUF":324.37,"IDR":18001.6,"ILS":3.098,"INR":95.0,"JPY":158.22,"KRW":1327.17,"KZT":450.27,"LKR":331.6,"LRD":170.87,"LSL":16.4,"MAD":9.7993,"MKD":55.08,"MOP":8.0837,"MUR":47.35,"MVR":15.45,"MWK":1742.05,"MXN":18.44,"MYR":4.0829,"NGN":1332.68,"NOK":9.4024,"NPR":151.98,"NZD":1.7604,"PEN":3.4376,"PGK":4.4945,"PHP":63.09,"PLN":3.8923,"PYG":5744.29,"QAR":3.64,"RON":4.7473,"RSD":104.63,"SAR":3.75,"SBD":7.955,"SCR":14.67,"SEK":9.9072,"SGD":1.2782,"SZL":16.4,"THB":33.62,"TOP":2.3903,"TRY":49.6,"TWD":32.63,"TZS":2641.3,"USD":1,"UYU":40.14,"VND":25846.2,"WST":2.7366,"XAF":584.27,"XOF":584.27,"ZAR":16.4,"ZMW":20.17};

  function zoneCurrency(tz) {
    if (!tz) return null;
    if ((' ' + INDIA_ZONES + ' ').indexOf(' ' + tz + ' ') !== -1) return 'INR';
    for (var cur in ZONES) {
      if ((' ' + ZONES[cur] + ' ').indexOf(' ' + tz + ' ') !== -1) return cur;
    }
    return null;
  }

  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var inIndia = (' ' + INDIA_ZONES + ' ').indexOf(' ' + tz + ' ') !== -1;
  var currency = zoneCurrency(tz) || 'USD';
  if (!FALLBACK_RATES[currency]) currency = 'USD';
  var locale = inIndia ? 'en-IN' : (navigator.language || 'en-US');

  function format(amount, cur, approx) {
    var digits = approx && amount < 10 ? 2 : 0;
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: digits }).format(amount);
    } catch (e) {
      return cur + ' ' + Math.round(amount);
    }
  }

  // What to show for one element: an exact price in its own currency, or a conversion.
  function plan(el) {
    var inr = parseFloat(el.getAttribute('data-inr'));
    var usd = parseFloat(el.getAttribute('data-usd'));
    var hasInr = !isNaN(inr), hasUsd = !isNaN(usd);
    if (inIndia && hasInr) return { amount: inr, cur: 'INR' };
    if (!inIndia && hasUsd && currency === 'USD') return { amount: usd, cur: 'USD' };
    var base = hasUsd ? { amount: usd, cur: 'USD' } : hasInr ? { amount: inr, cur: 'INR' } : null;
    if (!base) return null;
    if (base.cur === currency || base.amount === 0) return { amount: base.amount, cur: currency };
    return { from: base, cur: currency };
  }

  function render(rates) {
    var converted = false;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], p = plan(el);
      if (!p) continue;
      var amount = p.amount, approx = false;
      if (p.from) {
        var r = rates[p.cur], rb = p.from.cur === 'USD' ? 1 : rates[p.from.cur];
        if (!r || !rb) continue;
        amount = p.from.amount / rb * r * FX_FEE;
        approx = converted = true;
      }
      el.textContent = '';
      if (approx) {
        var about = document.createElement('span');
        about.className = 'approx';
        about.textContent = 'about ';
        el.appendChild(about);
      }
      el.appendChild(document.createTextNode(format(amount, p.cur, approx) + (el.getAttribute('data-unit') || '')));
    }
    var notes = document.querySelectorAll('[data-price-note]');
    for (var j = 0; j < notes.length; j++) {
      if (!converted) { notes[j].hidden = true; continue; }
      var name = currency;
      try { name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(currency) + ' (' + currency + ')'; } catch (e) {}
      notes[j].textContent = 'Prices marked "about" are shown in ' + name + ' at today\'s exchange rate, including the 4% conversion fee. Checkout shows the exact amount before you pay. ';
      var link = document.createElement('a');
      link.href = 'https://www.exchangerate-api.com';
      link.rel = 'noopener';
      link.textContent = 'Rates by Exchange Rate API';
      notes[j].appendChild(link);
      notes[j].hidden = false;
    }
  }

  var needsRates = false;
  for (var k = 0; k < nodes.length; k++) {
    var pk = plan(nodes[k]);
    if (pk && pk.from) { needsRates = true; break; }
  }
  if (!needsRates) { render({}); return; }

  // Show the snapshot straight away, then today's rates once they arrive.
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
  if (cached && cached.rates && Date.now() - cached.at < CACHE_MS) { render(cached.rates); return; }
  render(cached && cached.rates ? cached.rates : FALLBACK_RATES);
  if (!window.fetch) return;
  fetch(RATES_URL).then(function (res) { return res.json(); }).then(function (data) {
    if (!data || data.result !== 'success' || !data.rates) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rates: data.rates })); } catch (e) {}
    render(data.rates);
  }).catch(function () {});
})();
