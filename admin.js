(function () {
  'use strict';

  var content   = document.getElementById('admin-content');
  var tabsNav   = document.getElementById('admin-tabs');
  var btnLogout = document.getElementById('btn-logout');
  var csrfToken = '';
  var activeTab = 'stats';

  // ── Auth guard + init ─────────────────────────────────────
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
      setupTabs();
      loadTab('stats');
    })
    .catch(function () { window.location.href = 'login.html'; });

  // ── Déconnexion ───────────────────────────────────────────
  btnLogout.addEventListener('click', function () {
    fetch('api/auth', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body:        JSON.stringify({ action: 'logout' }),
    }).finally(function () { window.location.href = 'login.html'; });
  });

  // ── Navigation par onglets ────────────────────────────────
  function setupTabs() {
    tabsNav.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabsNav.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        loadTab(activeTab);
      });
    });
  }

  function loadTab(tab) {
    content.innerHTML = '<div class="admin-loading">Chargement…</div>';
    switch (tab) {
      case 'stats':      loadStats();      break;
      case 'questions':  loadQuestions();  break;
      case 'formations': loadFormations(); break;
      case 'export':     renderExport();   break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ONGLET STATISTIQUES
  // ═══════════════════════════════════════════════════════════

  function loadStats() {
    fetch('api/stats', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) throw new Error('Erreur lors du chargement des statistiques');
        return r.json();
      })
      .then(renderStats)
      .catch(function (err) {
        content.innerHTML = '<p class="admin-error">' + escHtml(err.message) + '</p>';
      });
  }

  function renderStats(data) {
    var html = '';

    html += '<section class="admin-section"><div class="stat-cards">';
    html += statCard('Utilisateurs', data.totals.total_users, '👤');
    html += statCard('Réponses', data.totals.total_responses, '📋');
    html += '</div></section>';

    if (data.distribution.length > 0) {
      html += '<section class="admin-section">';
      html += '<h2 class="admin-section-title">Résultats par question</h2>';
      data.distribution.forEach(function (q) { html += renderQuestionCard(q); });
      html += '</section>';
    } else {
      html += '<section class="admin-section"><p class="muted">Aucune réponse pour l\'instant.</p></section>';
    }

    html += '<section class="admin-section">';
    html += '<h2 class="admin-section-title">Réponses par utilisateur</h2>';
    html += renderUserTable(data.users, data.distribution);
    html += '</section>';

    content.innerHTML = html;
  }

  function statCard(label, value, icon) {
    return '<div class="stat-card"><span class="stat-card-icon">' + icon + '</span>' +
           '<span class="stat-card-value">' + value + '</span>' +
           '<span class="stat-card-label">' + label + '</span></div>';
  }

  function renderQuestionCard(q) {
    var total = q.options.reduce(function (s, o) { return s + o.count; }, 0);
    var html = '<div class="q-card"><p class="q-card-text">' + escHtml(q.question_text) + '</p><div class="q-bars">';
    q.options.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
      html += '<div class="q-bar-row"><span class="q-bar-label">' + escHtml(opt.label) + '</span>' +
              '<div class="q-bar-track"><div class="q-bar-fill" style="width:' + pct + '%"></div></div>' +
              '<span class="q-bar-count">' + opt.count + ' <span class="muted">(' + pct + '%)</span></span></div>';
    });
    return html + '</div></div>';
  }

  function renderUserTable(users, distribution) {
    var questionKeys  = distribution.map(function (q) { return q.question_key; });
    var questionTexts = {};
    distribution.forEach(function (q) { questionTexts[q.question_key] = q.question_text; });

    var html = '<div class="table-wrap"><table class="user-table"><thead><tr>';
    html += '<th>Utilisateur</th><th>Rôle</th><th>Inscription</th><th>Dernier test</th>';
    questionKeys.forEach(function (k) {
      html += '<th class="q-col" title="' + escHtml(questionTexts[k]) + '">' + escHtml(k) + '</th>';
    });
    html += '</tr></thead><tbody>';

    users.forEach(function (user) {
      var ansMap = {};
      user.answers.forEach(function (a) { ansMap[a.question_key] = a.chosen_label; });
      html += '<tr><td><strong>' + escHtml(user.username) + '</strong></td>' +
              '<td><span class="role-badge role-' + user.role + '">' + user.role + '</span></td>' +
              '<td class="muted">' + formatDate(user.created_at) + '</td>' +
              '<td class="muted">' + (user.completed_at ? formatDate(user.completed_at) : '—') + '</td>';
      questionKeys.forEach(function (k) {
        var ans = ansMap[k];
        html += '<td>' + (ans ? '<span class="answer-chip">' + escHtml(ans) + '</span>' : '<span class="muted">—</span>') + '</td>';
      });
      html += '</tr>';
    });

    return html + '</tbody></table></div>';
  }

  // ═══════════════════════════════════════════════════════════
  // ONGLET QUESTIONS
  // ═══════════════════════════════════════════════════════════

  function loadQuestions() {
    fetch('api/admin/questions', { credentials: 'include' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(renderQuestions)
      .catch(function () { content.innerHTML = '<p class="admin-error">Erreur lors du chargement des questions.</p>'; });
  }

  function renderQuestions(data) {
    var html = '<section class="admin-section">';
    html += '<div class="admin-section-header">';
    html += '<h2 class="admin-section-title">Questions (' + data.questions.length + ')</h2>';
    html += '<button class="btn-primary btn-sm" id="btn-add-question">+ Ajouter</button>';
    html += '</div>';
    html += '<div id="question-form-area"></div>';

    data.questions.forEach(function (q) {
      html += '<div class="crud-item" id="q-item-' + q.id + '">';
      html += '<div class="crud-item-header">';
      html += '<div>';
      html += '<span class="crud-item-key">' + escHtml(q.question_key) + '</span> ';
      html += '<span class="crud-badge ' + (q.active ? 'badge-active' : 'badge-inactive') + '">' +
              (q.active ? 'Actif' : 'Inactif') + '</span>';
      html += '<p class="crud-item-text">' + escHtml(q.text) + '</p>';
      var optLabels = q.options.map(function (o) { return escHtml(o.label); }).join(' / ');
      html += '<p class="crud-item-meta">Options : ' + optLabels + '</p>';
      html += '</div>';
      html += '<div class="crud-item-actions">';
      html += '<button class="btn-secondary btn-sm btn-edit-question" data-id="' + q.id + '" ' +
              'data-text="' + escHtml(q.text) + '" data-sort="' + q.sort_order + '" data-active="' + q.active + '">Modifier</button>';
      html += '<button class="btn-danger btn-sm btn-delete-question" data-id="' + q.id + '">Supprimer</button>';
      html += '</div></div></div>';
    });

    html += '</section>';
    content.innerHTML = html;

    document.getElementById('btn-add-question').addEventListener('click', function () {
      showQuestionForm(null);
    });
    document.querySelectorAll('.btn-edit-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showQuestionForm({
          id:         parseInt(btn.dataset.id),
          text:       btn.dataset.text,
          sort_order: parseInt(btn.dataset.sort),
          active:     btn.dataset.active === '1',
        });
      });
    });
    document.querySelectorAll('.btn-delete-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette question ? (ses options et scores seront supprimés)')) return;
        deleteQuestion(parseInt(btn.dataset.id));
      });
    });
  }

  function showQuestionForm(q) {
    var area = document.getElementById('question-form-area');
    if (!area) return;
    var isNew = !q;
    area.innerHTML =
      '<div class="crud-form">' +
      '<h3>' + (isNew ? 'Nouvelle question' : 'Modifier la question') + '</h3>' +
      (isNew ? '<div class="field"><label>Clé (ex: q11)</label><input id="qf-key" type="text" value=""></div>' : '') +
      '<div class="field"><label>Texte</label><input id="qf-text" type="text" value="' + (q ? escHtml(q.text) : '') + '"></div>' +
      '<div class="field"><label>Ordre</label><input id="qf-sort" type="number" value="' + (q ? q.sort_order : 0) + '"></div>' +
      (!isNew ? '<div class="field"><label><input id="qf-active" type="checkbox"' + (q.active ? ' checked' : '') + '> Active</label></div>' : '') +
      '<div class="crud-form-actions">' +
      '<button class="btn-primary btn-sm" id="qf-submit">' + (isNew ? 'Créer' : 'Enregistrer') + '</button>' +
      '<button class="btn-secondary btn-sm" id="qf-cancel">Annuler</button>' +
      '</div></div>';

    document.getElementById('qf-cancel').addEventListener('click', function () {
      area.innerHTML = '';
    });

    document.getElementById('qf-submit').addEventListener('click', function () {
      var text = document.getElementById('qf-text').value.trim();
      var sort = parseInt(document.getElementById('qf-sort').value) || 0;
      if (!text) { alert('Le texte est requis.'); return; }

      if (isNew) {
        var key = document.getElementById('qf-key').value.trim();
        if (!key) { alert('La clé est requise.'); return; }
        apiCall('POST', 'api/admin/questions', { question_key: key, text: text, sort_order: sort }, function () { loadQuestions(); });
      } else {
        var active = document.getElementById('qf-active').checked;
        apiCall('PUT', 'api/admin/questions?id=' + q.id, { text: text, sort_order: sort, active: active }, function () { loadQuestions(); });
      }
    });
  }

  function deleteQuestion(id) {
    apiCall('DELETE', 'api/admin/questions?id=' + id, null, function () { loadQuestions(); });
  }

  // ═══════════════════════════════════════════════════════════
  // ONGLET FORMATIONS
  // ═══════════════════════════════════════════════════════════

  function loadFormations() {
    fetch('api/admin/formations', { credentials: 'include' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(renderFormations)
      .catch(function () { content.innerHTML = '<p class="admin-error">Erreur lors du chargement des formations.</p>'; });
  }

  function renderFormations(data) {
    var html = '<section class="admin-section">';
    html += '<div class="admin-section-header">';
    html += '<h2 class="admin-section-title">Formations (' + data.formations.length + ')</h2>';
    html += '<button class="btn-primary btn-sm" id="btn-add-formation">+ Ajouter</button>';
    html += '</div>';
    html += '<div id="formation-form-area"></div>';

    data.formations.forEach(function (f) {
      html += '<div class="crud-item" id="f-item-' + f.id + '">';
      html += '<div class="crud-item-header">';
      html += '<div>';
      html += '<strong>' + escHtml(f.name) + '</strong> ';
      html += '<span class="crud-badge ' + (f.active ? 'badge-active' : 'badge-inactive') + '">' +
              (f.active ? 'Active' : 'Inactive') + '</span>';
      if (f.description) html += '<p class="crud-item-text">' + escHtml(f.description) + '</p>';
      var meta = [];
      if (f.contact_email) meta.push('✉ ' + escHtml(f.contact_email));
      if (f.contact_url)   meta.push('🔗 ' + escHtml(f.contact_url));
      if (meta.length) html += '<p class="crud-item-meta">' + meta.join(' · ') + '</p>';
      html += '</div>';
      html += '<div class="crud-item-actions">';
      html += '<button class="btn-secondary btn-sm btn-edit-formation" data-id="' + f.id + '" ' +
              'data-name="' + escHtml(f.name) + '" ' +
              'data-desc="' + escHtml(f.description || '') + '" ' +
              'data-email="' + escHtml(f.contact_email || '') + '" ' +
              'data-url="' + escHtml(f.contact_url || '') + '" ' +
              'data-active="' + f.active + '">Modifier</button>';
      html += '<button class="btn-danger btn-sm btn-delete-formation" data-id="' + f.id + '">Supprimer</button>';
      html += '</div></div></div>';
    });

    html += '</section>';
    content.innerHTML = html;

    document.getElementById('btn-add-formation').addEventListener('click', function () {
      showFormationForm(null);
    });
    document.querySelectorAll('.btn-edit-formation').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showFormationForm({
          id:            parseInt(btn.dataset.id),
          name:          btn.dataset.name,
          description:   btn.dataset.desc,
          contact_email: btn.dataset.email,
          contact_url:   btn.dataset.url,
          active:        btn.dataset.active === '1',
        });
      });
    });
    document.querySelectorAll('.btn-delete-formation').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette formation ?')) return;
        deleteFormation(parseInt(btn.dataset.id));
      });
    });
  }

  function showFormationForm(f) {
    var area = document.getElementById('formation-form-area');
    if (!area) return;
    var isNew = !f;
    area.innerHTML =
      '<div class="crud-form">' +
      '<h3>' + (isNew ? 'Nouvelle formation' : 'Modifier la formation') + '</h3>' +
      '<div class="field"><label>Nom</label><input id="ff-name" type="text" value="' + (f ? escHtml(f.name) : '') + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="ff-desc" rows="3">' + (f ? escHtml(f.description) : '') + '</textarea></div>' +
      '<div class="field"><label>Email contact</label><input id="ff-email" type="email" value="' + (f ? escHtml(f.contact_email) : '') + '"></div>' +
      '<div class="field"><label>URL</label><input id="ff-url" type="url" value="' + (f ? escHtml(f.contact_url) : '') + '"></div>' +
      (!isNew ? '<div class="field"><label><input id="ff-active" type="checkbox"' + (f.active ? ' checked' : '') + '> Active</label></div>' : '') +
      '<div class="crud-form-actions">' +
      '<button class="btn-primary btn-sm" id="ff-submit">' + (isNew ? 'Créer' : 'Enregistrer') + '</button>' +
      '<button class="btn-secondary btn-sm" id="ff-cancel">Annuler</button>' +
      '</div></div>';

    document.getElementById('ff-cancel').addEventListener('click', function () { area.innerHTML = ''; });

    document.getElementById('ff-submit').addEventListener('click', function () {
      var name  = document.getElementById('ff-name').value.trim();
      var desc  = document.getElementById('ff-desc').value.trim() || null;
      var email = document.getElementById('ff-email').value.trim() || null;
      var url   = document.getElementById('ff-url').value.trim() || null;
      if (!name) { alert('Le nom est requis.'); return; }

      if (isNew) {
        apiCall('POST', 'api/admin/formations', { name: name, description: desc, contact_email: email, contact_url: url }, function () { loadFormations(); });
      } else {
        var active = document.getElementById('ff-active').checked;
        apiCall('PUT', 'api/admin/formations?id=' + f.id, { name: name, description: desc, contact_email: email, contact_url: url, active: active }, function () { loadFormations(); });
      }
    });
  }

  function deleteFormation(id) {
    apiCall('DELETE', 'api/admin/formations?id=' + id, null, function () { loadFormations(); });
  }

  // ═══════════════════════════════════════════════════════════
  // ONGLET EXPORT
  // ═══════════════════════════════════════════════════════════

  function renderExport() {
    content.innerHTML =
      '<section class="admin-section">' +
      '<h2 class="admin-section-title">Export des réponses</h2>' +
      '<p>Téléchargez l\'ensemble des réponses au questionnaire au format CSV (compatible Excel).</p>' +
      '<a href="api/admin/export" class="btn-primary" download>⬇ Télécharger le CSV</a>' +
      '</section>';
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  function apiCall(method, url, body, onSuccess) {
    var opts = {
      method:      method,
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    fetch(url, opts)
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (result) {
        if (result.ok) {
          onSuccess();
        } else {
          alert('Erreur : ' + (result.data.error || 'Inconnue'));
        }
      })
      .catch(function () { alert('Erreur réseau.'); });
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
})();
