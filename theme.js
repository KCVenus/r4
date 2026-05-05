/**
 * theme.js — manual light/dark/auto theme override.
 *
 * Reads/writes `localStorage['r4-theme']` and mirrors the choice to the
 * `data-theme` attribute on <html>. CSS in style.css honours both the
 * system `prefers-color-scheme` media query and the manual override:
 *   - data-theme absent or "auto" → follow system
 *   - data-theme = "light"        → force light
 *   - data-theme = "dark"         → force dark
 *
 * The first half (initialisation) runs immediately to avoid a flash of
 * the wrong theme on load. The second half wires up any `[data-theme-toggle]`
 * buttons after DOMContentLoaded so headers can drop in the trigger.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'r4-theme';

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStored(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else       localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* private mode / quota — ignore */ }
  }

  function apply(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }

  // 1. Apply stored theme as early as possible (script must be in <head>
  //    for this to run before paint).
  var initial = getStored();
  if (initial === 'light' || initial === 'dark') {
    apply(initial);
  }

  // 2. Wire up toggle buttons after DOM is parsed.
  function currentTheme() {
    return document.documentElement.dataset.theme || 'auto';
  }

  // Cycle order: auto → light → dark → auto
  function nextTheme(current) {
    if (current === 'auto')  return 'light';
    if (current === 'light') return 'dark';
    return 'auto';
  }

  function labelFor(theme) {
    if (theme === 'dark')  return '🌙';
    if (theme === 'light') return '☀️';
    return '🌗';
  }

  function titleFor(theme) {
    if (theme === 'dark')  return 'Thème : sombre (cliquer pour automatique)';
    if (theme === 'light') return 'Thème : clair (cliquer pour sombre)';
    return 'Thème : automatique (cliquer pour clair)';
  }

  function refreshButton(btn) {
    var theme = currentTheme();
    btn.textContent = labelFor(theme);
    btn.title       = titleFor(theme);
    btn.setAttribute('aria-label', titleFor(theme));
  }

  function bind() {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function (btn) {
      refreshButton(btn);
      btn.addEventListener('click', function () {
        var next = nextTheme(currentTheme());
        if (next === 'auto') { setStored(null); apply(null); }
        else                 { setStored(next); apply(next); }
        // Refresh every toggle on the page (multiple headers, future-proof).
        buttons.forEach(refreshButton);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
