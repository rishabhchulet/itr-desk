/* Light and dark mode switch. Pages follow the system setting until the visitor picks one;
   the choice is saved for every page on creet.in. An inline script in each page's <head>
   applies a saved choice before the page paints:
   <script>try{var t=localStorage.getItem('creet-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script> */
(function () {
  var KEY = 'creet-theme';
  var root = document.documentElement;
  var dark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function current() {
    return root.getAttribute('data-theme') || (dark && dark.matches ? 'dark' : 'light');
  }
  function sync() {
    var next = current() === 'dark' ? 'light' : 'dark';
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', 'Switch to ' + next + ' mode');
      buttons[i].title = 'Switch to ' + next + ' mode';
    }
    var meta = document.querySelectorAll('meta[name="theme-color"]');
    for (var j = 0; j < meta.length; j++) {
      meta[j].setAttribute('content', current() === 'dark' ? '#141832' : '#ffffff');
      meta[j].removeAttribute('media');
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('.theme-toggle');
    if (!button) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    sync();
  });
  if (dark && dark.addEventListener) dark.addEventListener('change', sync);
  sync();
})();
