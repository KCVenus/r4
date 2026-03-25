(function () {
  'use strict';

  var content   = document.getElementById('admin-content');
  var btnLogout = document.getElementById('btn-logout');
  var csrfToken = '';

  // ── Auth guard: must be admin ─────────────────────────────
  fetch('api/auth', { credentials: 'include' })
    .then(function (r) {
      if (!r.ok) { window.location.href = 'login.html'; return null; }
      return r.json();
    })
    .then(function (user) {
      if (!user) return;
      if (user.role !== 'admin') { window.location.href = 'index.html'; return; }
      return fetch('api/csrf', { credentials: 'include' });
    })
    .then(function (r) {
      if (!r) return;
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (data) csrfToken = data.token;
      loadStats();
    })
    .catch(function () { window.location.href = 'login.html'; });

  // ── Déconnexion ───────────────────────────────────────────
  btnLogout.addEventListener('click', function () {
    fetch('api/auth', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body:        JSON.stringify({ action: 'logout' }),
    }).finally(function () {
      window.location.href = 'login.html';
    });
  });

  // ── Chargement des statistiques ───────────────────────────
  function loadStats() {
    fetch('api/stats', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) throw new Error('Erreur lors du chargement des statistiques');
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        content.innerHTML = '<p class="admin-error">' + err.message + '</p>';
      });
  }

  function render(data) {
    var html = '';

    // ── Cartes totaux ────────────────────────────────────────
    html += '<section class="admin-section">';
    html += '<div class="stat-cards">';
    html += statCard('Utilisateurs', data.totals.total_users, '👤');
    html += statCard('Réponses', data.totals.total_responses, '📋');
    html += '</div></section>';

    // ── Distribution par question ────────────────────────────
    if (data.distribution.length > 0) {
      html += '<section class="admin-section">';
      html += '<h2 class="admin-section-title">Résultats par question</h2>';
      data.distribution.forEach(function (q) {
        html += renderQuestionCard(q);
      });
      html += '</section>';
    } else {
      html += '<section class="admin-section"><p class="muted">Aucune réponse pour l\'instant.</p></section>';
    }

    // ── Tableau utilisateurs ─────────────────────────────────
    html += '<section class="admin-section">';
    html += '<h2 class="admin-section-title">Réponses par utilisateur</h2>';
    html += renderUserTable(data.users, data.distribution);
    html += '</section>';

    content.innerHTML = html;
  }

  function statCard(label, value, icon) {
    return (
      '<div class="stat-card">' +
        '<span class="stat-card-icon">' + icon + '</span>' +
        '<span class="stat-card-value">' + value + '</span>' +
        '<span class="stat-card-label">' + label + '</span>' +
      '</div>'
    );
  }

  function renderQuestionCard(q) {
    var total = q.options.reduce(function (sum, o) { return sum + o.count; }, 0);

    var html = '<div class="q-card">';
    html += '<p class="q-card-text">' + escHtml(q.question_text) + '</p>';
    html += '<div class="q-bars">';

    q.options.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
      html +=
        '<div class="q-bar-row">' +
          '<span class="q-bar-label">' + escHtml(opt.label) + '</span>' +
          '<div class="q-bar-track">' +
            '<div class="q-bar-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<span class="q-bar-count">' + opt.count + ' <span class="muted">(' + pct + '%)</span></span>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
  }

  function renderUserTable(users, distribution) {
    var questionKeys  = distribution.map(function (q) { return q.question_key; });
    var questionTexts = {};
    distribution.forEach(function (q) { questionTexts[q.question_key] = q.question_text; });

    var html = '<div class="table-wrap"><table class="user-table">';
    html += '<thead><tr>';
    html += '<th>Utilisateur</th>';
    html += '<th>Rôle</th>';
    html += '<th>Inscription</th>';
    html += '<th>Dernier test</th>';

    questionKeys.forEach(function (k) {
      html += '<th class="q-col" title="' + escHtml(questionTexts[k]) + '">' + escHtml(k) + '</th>';
    });
    html += '</tr></thead><tbody>';

    users.forEach(function (user) {
      var ansMap = {};
      user.answers.forEach(function (a) { ansMap[a.question_key] = a.chosen_label; });

      html += '<tr>';
      html += '<td><strong>' + escHtml(user.username) + '</strong></td>';
      html += '<td><span class="role-badge role-' + user.role + '">' + user.role + '</span></td>';
      html += '<td class="muted">' + formatDate(user.created_at) + '</td>';
      html += '<td class="muted">' + (user.completed_at ? formatDate(user.completed_at) : '—') + '</td>';

      questionKeys.forEach(function (k) {
        var ans = ansMap[k];
        html += '<td>' + (ans ? '<span class="answer-chip">' + escHtml(ans) + '</span>' : '<span class="muted">—</span>') + '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  // ── Utilitaires ───────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(str) {
    if (!str) return '—';
    var d = new Date(str);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
})();
