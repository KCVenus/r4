/**
 * account.js — user account page.
 *
 * Two sections rendered side-by-side: past tests (F8) and the formations
 * catalogue (F9). The page is auth-gated; unauthenticated visitors are
 * redirected to login.html.
 */
(function () {
  'use strict';

  // Mirrors LEVEL_MAP in app.js so we can convert raw study-level integers
  // back into human labels for the test history cards.
  var LEVEL_LABELS = {
    0: 'Sans diplôme',
    5: 'Bac',
    6: 'Bac+2',
    7: 'Bac+3',
    8: 'Bac+5+',
  };

  var elements = {
    usernameDisplay: document.getElementById('username-display'),
    adminLink:       document.getElementById('admin-link'),
    btnLogout:       document.getElementById('btn-logout'),
    testsList:       document.getElementById('tests-list'),
    testsEmpty:      document.getElementById('tests-empty'),
    catalogList:     document.getElementById('catalog-list'),
  };

  var csrfToken = '';

  /**
   * Format an ISO/MySQL timestamp into a short French date.
   * Falls back to the raw string when the input is unparseable.
   *
   * @param {string} isoLike Something Date can parse.
   * @returns {string}
   */
  function formatDate(isoLike) {
    var d = new Date((isoLike || '').replace(' ', 'T'));
    if (isNaN(d.getTime())) return isoLike || '';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  /**
   * Render the past-tests section.
   *
   * @param {Array<object>} tests From GET /api/me/tests.
   */
  function renderTests(tests) {
    if (!tests || tests.length === 0) {
      elements.testsEmpty.classList.remove('hidden');
      return;
    }

    tests.forEach(function (test) {
      var card = document.createElement('article');
      card.className = 'test-card';

      var header = document.createElement('header');
      header.className = 'test-card-header';

      var date = document.createElement('time');
      date.textContent = formatDate(test.completed_at);
      header.appendChild(date);

      // Surface the chosen study level so the user remembers which "version"
      // of the test they took (the recommendations vary with the level).
      if (test.user_level !== null && test.user_level !== undefined) {
        var levelBadge = document.createElement('span');
        levelBadge.className   = 'test-level-badge';
        levelBadge.textContent = 'Niveau : ' + (LEVEL_LABELS[test.user_level] || ('niv ' + test.user_level));
        header.appendChild(levelBadge);
      }

      card.appendChild(header);

      var title = document.createElement('h3');
      title.className = 'test-card-title';
      title.textContent = 'Formations recommandées';
      card.appendChild(title);

      if (!test.formations || test.formations.length === 0) {
        var none = document.createElement('p');
        none.className   = 'test-empty';
        none.textContent = 'Aucune formation correspondante au niveau choisi.';
        card.appendChild(none);
      } else {
        var ul = document.createElement('ul');
        ul.className = 'test-formations';
        test.formations.forEach(function (formation, index) {
          var li = document.createElement('li');
          if (index === 0) li.className = 'test-formation--top';
          var name = document.createElement('strong');
          name.textContent = formation.name;
          li.appendChild(name);
          if (typeof formation.percent !== 'undefined') {
            var pct = document.createElement('span');
            pct.className   = 'test-formation-pct';
            pct.textContent = formation.percent + '% de compatibilité';
            li.appendChild(pct);
          }
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      elements.testsList.appendChild(card);
    });
  }

  /**
   * Render the formations catalogue grouped by RNCP level.
   *
   * @param {Array<object>} formations From GET /api/formations.
   */
  function renderCatalog(formations) {
    if (!formations || formations.length === 0) {
      elements.catalogList.textContent = 'Aucune formation active dans le catalogue.';
      return;
    }

    // Group by level so each band gets a clear heading.
    var groups = {};
    formations.forEach(function (formation) {
      var level = formation.level || 'autre';
      (groups[level] = groups[level] || []).push(formation);
    });

    Object.keys(groups).sort().forEach(function (level) {
      var section = document.createElement('section');
      section.className = 'catalog-group';

      var heading = document.createElement('h3');
      heading.textContent = level === 'autre'
        ? 'Sans niveau renseigné'
        : 'Niveau ' + level + ' — ' + (LEVEL_LABELS[+level] || '');
      section.appendChild(heading);

      groups[level].forEach(function (formation) {
        var card = document.createElement('div');
        card.className = 'catalog-card';

        var title = document.createElement('h4');
        title.textContent = formation.name;
        card.appendChild(title);

        if (formation.description) {
          var desc = document.createElement('p');
          desc.textContent = formation.description;
          card.appendChild(desc);
        }

        if (formation.contact_url) {
          var link = document.createElement('a');
          link.href        = formation.contact_url;
          link.target      = '_blank';
          // tabnabbing protection on cross-origin links.
          link.rel         = 'noopener noreferrer';
          link.className   = 'link-btn';
          link.textContent = 'Fiche CNAM ↗';
          card.appendChild(link);
        }

        section.appendChild(card);
      });

      elements.catalogList.appendChild(section);
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  // Step 1: ensure we have a session and a CSRF token; otherwise redirect.
  // Step 2: fan out the two read endpoints in parallel and render.
  fetch('api/csrf', { credentials: 'include' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data)     { csrfToken = (data && data.token) || ''; })
    .then(function () {
      return fetch('api/auth', { credentials: 'include' });
    })
    .then(function (response) {
      if (!response.ok) { window.location.href = 'login.html'; throw new Error('redirect'); }
      return response.json();
    })
    .then(function (user) {
      elements.usernameDisplay.textContent = user.username;
      if (user.role === 'admin') elements.adminLink.classList.remove('hidden');
      elements.btnLogout.addEventListener('click', function () {
        fetch('api/auth', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body:        JSON.stringify({ action: 'logout' }),
        }).finally(function () { window.location.href = 'login.html'; });
      });

      return Promise.all([
        fetch('api/me/tests',  { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : { tests: [] }; }),
        fetch('api/formations').then(function (r) { return r.ok ? r.json() : { formations: [] }; }),
      ]);
    })
    .then(function (results) {
      renderTests(results[0].tests || []);
      renderCatalog(results[1].formations || []);
    })
    .catch(function () { /* redirect already triggered, swallow */ });
})();
