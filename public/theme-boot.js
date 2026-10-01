// Runs before the first paint (classic blocking script, not inline, so a strict Content-Security-Policy
// that forbids inline scripts can apply). Applies the OS theme and a provisional language; ThemeProvider and i18n then apply the stored
// choices from IndexedDB (AD-8: no localStorage, so a stored explicit theme is known only after this).
;(function () {
  var root = document.documentElement
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark')
  } catch {
    // matchMedia unavailable: stay light.
  }
  var language = (navigator.language || '').toLowerCase()
  root.lang = language.indexOf('fr') === 0 ? 'fr' : 'en'
})()
