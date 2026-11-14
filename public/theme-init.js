// Apply the saved/device theme before first paint; external so CSP needs no inline scripts.
(function () {
  try {
    var theme = localStorage.getItem('hb-theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
  } catch { /* Storage can be unavailable; the application still supplies its default theme. */ }
})();
