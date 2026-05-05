/**
 * admin.js — dashboard frontend for /admin.html.
 *
 * Responsibilities:
 *   - Guard the page: redirect non-admins immediately.
 *   - Render four tabs: stats, questions, formations, export.
 *   - Provide CRUD UI for questions and formations via the /api/admin endpoints.
 *
 * All mutating requests include the CSRF token in the X-CSRF-Token header —
 * see api/index.php for the server-side verification.
 */
(function () {
  'use strict';

  var contentRoot = document.getElementById('admin-content');
  var tabsNav     = document.getElementById('admin-tabs');
  var btnLogout   = document.getElementById('btn-logout');
  var csrfToken   = '';
  var activeTab   = 'stats';

  // ── Auth guard + init ─────────────────────────────────────
  // Sequential promise chain: check auth, verify admin role, then load CSRF + initial tab.
  // Any failure anywhere falls through to the catch and redirects to /login.html.
  fetch('api/auth', { credentials: 'include' })
    .then(function (response) {
      if (!response.ok) { window.location.href = 'login.html'; return null; }
      return response.json();
    })
    .then(function (user) {
      if (!user) return;
      // Non-admin logged-in users are bounced back to the main questionnaire.
      if (user.role !== 'admin') { window.location.href = 'index.html'; return; }
      return fetch('api/csrf', { credentials: 'include' });
    })
    .then(function (response) {
      if (!response) return;
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      if (data) csrfToken = data.token;
      setupTabs();
      loadTab('stats');
    })
    .catch(function () { window.location.href = 'login.html'; });

  // ── Logout ────────────────────────────────────────────────
  btnLogout.addEventListener('click', function () {
    fetch('api/auth', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body:        JSON.stringify({ action: 'logout' }),
    }).finally(function () { window.location.href = 'login.html'; });
  });

  /**
   * Wire up the tab bar: clicking a tab updates `activeTab` and re-renders.
   */
  function setupTabs() {
    tabsNav.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabsNav.querySelectorAll('.tab-btn').forEach(function (other) { other.classList.remove('active'); });
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        loadTab(activeTab);
      });
    });
  }

  /**
   * Dispatch to the loader of the requested tab and show a transient spinner.
   *
   * @param {'stats'|'questions'|'formations'|'export'} tab Tab id.
   */
  function loadTab(tab) {
    contentRoot.innerHTML = '<div class="admin-loading">Chargement…</div>';
    switch (tab) {
      case 'stats':      loadStats();      break;
      case 'questions':  loadQuestions();  break;
      case 'formations': loadFormations(); break;
      case 'export':     renderExport();   break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STATS TAB
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch the aggregated stats payload and delegate rendering.
   */
  function loadStats() {
    fetch('api/stats', { credentials: 'include' })
      .then(function (response) {
        if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
        return response.json();
      })
      .then(renderStats)
      .catch(function (err) {
        contentRoot.innerHTML = '<p class="admin-error">' + escapeHtml(err.message) + '</p>';
      });
  }

  /**
   * Build the full stats HTML from the payload returned by /api/stats.
   *
   * @param {object} data Payload with totals, distribution[], users[].
   */
  function renderStats(data) {
    var html = '';

    html += '<section class="admin-section"><div class="stat-cards">';
    html += statCard('Utilisateurs', data.totals.total_users, '👤');
    html += statCard('Réponses', data.totals.total_responses, '📋');
    html += '</div></section>';

    if (data.distribution.length > 0) {
      html += '<section class="admin-section">';
      html += '<h2 class="admin-section-title">Résultats par question</h2>';
      data.distribution.forEach(function (question) { html += renderQuestionCard(question); });
      html += '</section>';
    } else {
      html += '<section class="admin-section"><p class="muted">Aucune réponse pour l\'instant.</p></section>';
    }

    html += '<section class="admin-section">';
    html += '<h2 class="admin-section-title">Réponses par utilisateur</h2>';
    html += renderUserTable(data.users, data.distribution);
    html += '</section>';

    contentRoot.innerHTML = html;
  }

  /**
   * Build a single "big number" card markup string.
   *
   * @param {string} label Description shown below the number.
   * @param {number} value The number to display.
   * @param {string} icon  Emoji or glyph.
   * @returns {string}     HTML string.
   */
  function statCard(label, value, icon) {
    return '<div class="stat-card"><span class="stat-card-icon">' + icon + '</span>' +
           '<span class="stat-card-value">' + value + '</span>' +
           '<span class="stat-card-label">' + label + '</span></div>';
  }

  /**
   * Render the per-question bar chart card.
   * Percentages are computed client-side against the sum of all counts.
   *
   * @param {object} question Entry from data.distribution.
   * @returns {string}        HTML string.
   */
  function renderQuestionCard(question) {
    var total = question.options.reduce(function (sum, opt) { return sum + opt.count; }, 0);
    var html  = '<div class="q-card"><p class="q-card-text">' + escapeHtml(question.question_text) + '</p><div class="q-bars">';
    question.options.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
      html += '<div class="q-bar-row"><span class="q-bar-label">' + escapeHtml(opt.label) + '</span>' +
              '<div class="q-bar-track"><div class="q-bar-fill" style="width:' + pct + '%"></div></div>' +
              '<span class="q-bar-count">' + opt.count + ' <span class="muted">(' + pct + '%)</span></span></div>';
    });
    return html + '</div></div>';
  }

  /**
   * Render the big "answers per user" table.
   *
   * Column layout: user / role / signup / last run + one column per question.
   * Questions columns come from the distribution (keeps the column set
   * consistent even for users with zero or partial answers).
   *
   * @param {Array<object>} users        List of users with their latest answers.
   * @param {Array<object>} distribution Used only to build the column headers.
   * @returns {string}                   HTML string.
   */
  function renderUserTable(users, distribution) {
    var questionKeys  = distribution.map(function (q) { return q.question_key; });
    var questionTexts = {};
    distribution.forEach(function (q) { questionTexts[q.question_key] = q.question_text; });

    var html = '<div class="table-wrap"><table class="user-table"><thead><tr>';
    html += '<th>Utilisateur</th><th>Rôle</th><th>Inscription</th><th>Dernier test</th>';
    questionKeys.forEach(function (key) {
      html += '<th class="q-col" title="' + escapeHtml(questionTexts[key]) + '">' + escapeHtml(key) + '</th>';
    });
    html += '</tr></thead><tbody>';

    users.forEach(function (user) {
      // Turn the flat answers list into a key->label map for O(1) lookup per column.
      var answerByKey = {};
      user.answers.forEach(function (answer) { answerByKey[answer.question_key] = answer.chosen_label; });
      html += '<tr><td><strong>' + escapeHtml(user.username) + '</strong></td>' +
              '<td><span class="role-badge role-' + user.role + '">' + user.role + '</span></td>' +
              '<td class="muted">' + formatDate(user.created_at) + '</td>' +
              '<td class="muted">' + (user.completed_at ? formatDate(user.completed_at) : '—') + '</td>';
      questionKeys.forEach(function (key) {
        var answer = answerByKey[key];
        html += '<td>' + (answer ? '<span class="answer-chip">' + escapeHtml(answer) + '</span>' : '<span class="muted">—</span>') + '</td>';
      });
      html += '</tr>';
    });

    return html + '</tbody></table></div>';
  }

  // ═══════════════════════════════════════════════════════════
  // QUESTIONS TAB
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch the full question list for the admin (active + inactive).
   */
  function loadQuestions() {
    fetch('api/admin/questions', { credentials: 'include' })
      .then(function (response) { if (!response.ok) throw new Error(); return response.json(); })
      .then(renderQuestions)
      .catch(function () { contentRoot.innerHTML = '<p class="admin-error">Erreur lors du chargement des questions.</p>'; });
  }

  /**
   * Render the questions CRUD list and wire up edit/delete/add buttons.
   *
   * @param {object} data Payload with a `questions` array.
   */
  function renderQuestions(data) {
    // Captured in the click handlers below so the form can clamp the
    // `sort_order` input to a valid range without re-fetching.
    var totalCount = data.questions.length;

    var html = '<section class="admin-section">';
    html += '<div class="admin-section-header">';
    html += '<h2 class="admin-section-title">Questions (' + data.questions.length + ')</h2>';
    html += '<button class="btn-primary btn-sm" id="btn-add-question">+ Ajouter</button>';
    html += '</div>';
    html += '<div id="question-form-area"></div>';

    data.questions.forEach(function (question) {
      html += '<div class="crud-item" id="q-item-' + question.id + '">';
      html += '<div class="crud-item-header">';
      html += '<div>';
      html += '<span class="crud-item-key">' + escapeHtml(question.question_key) + '</span> ';
      html += '<span class="crud-badge ' + (question.active ? 'badge-active' : 'badge-inactive') + '">' +
              (question.active ? 'Actif' : 'Inactif') + '</span>';
      html += '<p class="crud-item-text">' + escapeHtml(question.text) + '</p>';
      var optionLabels = question.options.map(function (o) { return escapeHtml(o.label); }).join(' / ');
      html += '<p class="crud-item-meta">Options : ' + optionLabels + '</p>';
      html += '</div>';
      html += '<div class="crud-item-actions">';
      // Serialise the question into data-* attrs so the edit handler needs no extra fetch.
      html += '<button class="btn-secondary btn-sm btn-edit-question" data-id="' + question.id + '" ' +
              'data-text="' + escapeHtml(question.text) + '" data-sort="' + question.sort_order + '" data-active="' + question.active + '">Modifier</button>';
      html += '<button class="btn-danger btn-sm btn-delete-question" data-id="' + question.id + '">Supprimer</button>';
      html += '</div></div></div>';
    });

    html += '</section>';
    contentRoot.innerHTML = html;

    document.getElementById('btn-add-question').addEventListener('click', function () {
      showQuestionForm(null, totalCount);
    });
    document.querySelectorAll('.btn-edit-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showQuestionForm({
          id:         parseInt(btn.dataset.id),
          text:       btn.dataset.text,
          sort_order: parseInt(btn.dataset.sort),
          active:     btn.dataset.active === '1',
        }, totalCount);
      });
    });
    document.querySelectorAll('.btn-delete-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette question ? (ses options et scores seront supprimés)')) return;
        deleteQuestion(parseInt(btn.dataset.id));
      });
    });
  }

  /**
   * Render the inline "create / edit question" form.
   *
   * @param {object|null} question   Existing question for edit mode, null for create.
   * @param {number}      totalCount Current row count, used to clamp the position input.
   */
  function showQuestionForm(question, totalCount) {
    var area = document.getElementById('question-form-area');
    if (!area) return;
    var isNew = !question;
    // On create the new row appends after the last one, so the legal range is
    // [1, count+1]. On edit the row is already in `count`, so [1, count].
    var maxPos     = isNew ? (totalCount + 1) : Math.max(1, totalCount);
    var defaultPos = isNew ? maxPos : question.sort_order;

    area.innerHTML =
      '<div class="crud-form">' +
      '<h3>' + (isNew ? 'Nouvelle question' : 'Modifier la question') + '</h3>' +
      // question_key is only editable at creation — it's referenced elsewhere.
      (isNew ? '<div class="field"><label>Clé (ex: q11)</label><input id="qf-key" type="text" value=""></div>' : '') +
      '<div class="field"><label>Texte</label><input id="qf-text" type="text" value="' + (question ? escapeHtml(question.text) : '') + '"></div>' +
      '<div class="field"><label>Ordre (1 à ' + maxPos + ')</label>' +
        '<input id="qf-sort" type="number" min="1" max="' + maxPos + '" step="1" value="' + defaultPos + '"></div>' +
      (!isNew ? '<div class="field"><label><input id="qf-active" type="checkbox"' + (question.active ? ' checked' : '') + '> Active</label></div>' : '') +
      '<div class="crud-form-actions">' +
      '<button class="btn-primary btn-sm" id="qf-submit">' + (isNew ? 'Créer' : 'Enregistrer') + '</button>' +
      '<button class="btn-secondary btn-sm" id="qf-cancel">Annuler</button>' +
      '</div></div>';

    document.getElementById('qf-cancel').addEventListener('click', function () {
      area.innerHTML = '';
    });

    document.getElementById('qf-submit').addEventListener('click', function () {
      var text = document.getElementById('qf-text').value.trim();
      var sortRaw = document.getElementById('qf-sort').value;
      var sort    = parseInt(sortRaw, 10);
      if (!text) { showError('Le texte est requis.'); return; }
      if (isNaN(sort) || sort < 1 || sort > maxPos) {
        showError('Position invalide (entre 1 et ' + maxPos + ').');
        return;
      }

      if (isNew) {
        var key = document.getElementById('qf-key').value.trim();
        if (!key) { showError('La clé est requise.'); return; }
        apiCall('POST', 'api/admin/questions', { question_key: key, text: text, sort_order: sort }, function () { loadQuestions(); });
      } else {
        var active = document.getElementById('qf-active').checked;
        apiCall('PUT', 'api/admin/questions?id=' + question.id, { text: text, sort_order: sort, active: active }, function () { loadQuestions(); });
      }
    });
  }

  /**
   * Send a DELETE to the API and reload the questions tab on success.
   *
   * @param {number} id Question id to delete.
   */
  function deleteQuestion(id) {
    apiCall('DELETE', 'api/admin/questions?id=' + id, null, function () { loadQuestions(); });
  }

  // ═══════════════════════════════════════════════════════════
  // FORMATIONS TAB
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch the full formations list (active + inactive).
   */
  function loadFormations() {
    fetch('api/admin/formations', { credentials: 'include' })
      .then(function (response) { if (!response.ok) throw new Error(); return response.json(); })
      .then(renderFormations)
      .catch(function () { contentRoot.innerHTML = '<p class="admin-error">Erreur lors du chargement des formations.</p>'; });
  }

  /**
   * Render the formations CRUD list and wire up edit/delete/add buttons.
   *
   * @param {object} data Payload with a `formations` array.
   */
  function renderFormations(data) {
    var html = '<section class="admin-section">';
    html += '<div class="admin-section-header">';
    html += '<h2 class="admin-section-title">Formations (' + data.formations.length + ')</h2>';
    html += '<button class="btn-primary btn-sm" id="btn-add-formation">+ Ajouter</button>';
    html += '</div>';
    html += '<div id="formation-form-area"></div>';

    data.formations.forEach(function (formation) {
      html += '<div class="crud-item" id="f-item-' + formation.id + '">';
      html += '<div class="crud-item-header">';
      html += '<div>';
      html += '<strong>' + escapeHtml(formation.name) + '</strong> ';
      html += '<span class="crud-badge ' + (formation.active ? 'badge-active' : 'badge-inactive') + '">' +
              (formation.active ? 'Active' : 'Inactive') + '</span>';
      if (formation.description) html += '<p class="crud-item-text">' + escapeHtml(formation.description) + '</p>';
      var meta = [];
      if (formation.contact_email) meta.push('✉ ' + escapeHtml(formation.contact_email));
      if (formation.contact_url)   meta.push('🔗 ' + escapeHtml(formation.contact_url));
      if (meta.length) html += '<p class="crud-item-meta">' + meta.join(' · ') + '</p>';
      html += '</div>';
      html += '<div class="crud-item-actions">';
      html += '<button class="btn-secondary btn-sm btn-edit-formation" data-id="' + formation.id + '" ' +
              'data-name="' + escapeHtml(formation.name) + '" ' +
              'data-desc="' + escapeHtml(formation.description || '') + '" ' +
              'data-email="' + escapeHtml(formation.contact_email || '') + '" ' +
              'data-url="' + escapeHtml(formation.contact_url || '') + '" ' +
              'data-active="' + formation.active + '">Modifier</button>';
      html += '<button class="btn-danger btn-sm btn-delete-formation" data-id="' + formation.id + '">Supprimer</button>';
      html += '</div></div></div>';
    });

    html += '</section>';
    contentRoot.innerHTML = html;

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

  /**
   * Render the inline "create / edit formation" form.
   *
   * @param {object|null} formation Existing formation for edit mode, null for create.
   */
  function showFormationForm(formation) {
    var area = document.getElementById('formation-form-area');
    if (!area) return;
    var isNew = !formation;
    area.innerHTML =
      '<div class="crud-form">' +
      '<h3>' + (isNew ? 'Nouvelle formation' : 'Modifier la formation') + '</h3>' +
      '<div class="field"><label>Nom</label><input id="ff-name" type="text" value="' + (formation ? escapeHtml(formation.name) : '') + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="ff-desc" rows="3">' + (formation ? escapeHtml(formation.description) : '') + '</textarea></div>' +
      '<div class="field"><label>Email contact</label><input id="ff-email" type="email" value="' + (formation ? escapeHtml(formation.contact_email) : '') + '"></div>' +
      '<div class="field"><label>URL</label><input id="ff-url" type="url" value="' + (formation ? escapeHtml(formation.contact_url) : '') + '"></div>' +
      (!isNew ? '<div class="field"><label><input id="ff-active" type="checkbox"' + (formation.active ? ' checked' : '') + '> Active</label></div>' : '') +
      '<div class="crud-form-actions">' +
      '<button class="btn-primary btn-sm" id="ff-submit">' + (isNew ? 'Créer' : 'Enregistrer') + '</button>' +
      '<button class="btn-secondary btn-sm" id="ff-cancel">Annuler</button>' +
      '</div></div>';

    document.getElementById('ff-cancel').addEventListener('click', function () { area.innerHTML = ''; });

    document.getElementById('ff-submit').addEventListener('click', function () {
      var name  = document.getElementById('ff-name').value.trim();
      // Coerce empty strings to null so the backend stores proper NULLs.
      var desc  = document.getElementById('ff-desc').value.trim() || null;
      var email = document.getElementById('ff-email').value.trim() || null;
      var url   = document.getElementById('ff-url').value.trim() || null;
      if (!name) { showError('Le nom est requis.'); return; }

      if (isNew) {
        apiCall('POST', 'api/admin/formations', { name: name, description: desc, contact_email: email, contact_url: url }, function () { loadFormations(); });
      } else {
        var active = document.getElementById('ff-active').checked;
        apiCall('PUT', 'api/admin/formations?id=' + formation.id, { name: name, description: desc, contact_email: email, contact_url: url, active: active }, function () { loadFormations(); });
      }
    });
  }

  /**
   * Send a DELETE to the API and reload the formations tab on success.
   *
   * @param {number} id Formation id to delete.
   */
  function deleteFormation(id) {
    apiCall('DELETE', 'api/admin/formations?id=' + id, null, function () { loadFormations(); });
  }

  // ═══════════════════════════════════════════════════════════
  // TOASTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Lazily create the toast container on first use. Kept out of admin.html
   * so the markup is owned by the script that pushes notifications into it.
   *
   * @returns {HTMLElement} The container `<div>`.
   */
  function getToastContainer() {
    var container = document.getElementById('admin-toast');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Push a transient toast and auto-dismiss after `timeoutMs` (default 5s).
   *
   * @param {string}                       message Text to display (escaped).
   * @param {'error'|'warn'|'success'}     kind    Visual variant.
   * @param {number}                       [timeoutMs] Auto-dismiss delay.
   */
  function showToast(message, kind, timeoutMs) {
    var container = getToastContainer();
    var node = document.createElement('div');
    node.className = 'toast toast-' + kind;
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    node.textContent = message;
    container.appendChild(node);

    // Slide-in next frame so the CSS transition runs from the initial state.
    requestAnimationFrame(function () { node.classList.add('toast-visible'); });

    var delay = timeoutMs || 5000;
    setTimeout(function () {
      node.classList.remove('toast-visible');
      setTimeout(function () { node.remove(); }, 300);
    }, delay);
  }

  function showError(message)   { showToast(message, 'error'); }
  function showWarn(message)    { showToast(message, 'warn'); }
  function showSuccess(message) { showToast(message, 'success', 3000); }

  // ═══════════════════════════════════════════════════════════
  // EXPORT TAB
  // ═══════════════════════════════════════════════════════════

  /**
   * Render the static "download CSV" panel. The link points directly at the
   * backend route so the browser handles the file download.
   */
  function renderExport() {
    contentRoot.innerHTML =
      '<section class="admin-section">' +
      '<h2 class="admin-section-title">Export des réponses</h2>' +
      '<p>Téléchargez l\'ensemble des réponses au questionnaire au format CSV (compatible Excel).</p>' +
      '<a href="api/admin/export" class="btn-primary" download>⬇ Télécharger le CSV</a>' +
      '</section>';
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Tiny wrapper around fetch for admin CRUD calls.
   * Always includes credentials + CSRF token and parses JSON.
   *
   * Error UX is split across three buckets so the toast message tells the
   * admin what went wrong:
   *   - 422 (validation)         → server's `error` text, surfaced as-is
   *   - 5xx (DB / server)        → "Erreur base de données…"
   *   - 4xx other / fetch reject → server's `error` text or "Connexion réseau perdue"
   *
   * @param {string}   method    HTTP verb.
   * @param {string}   url       Endpoint URL.
   * @param {object?}  body      JSON body, or null for DELETE calls.
   * @param {Function} onSuccess Callback invoked only when the server returned 2xx.
   */
  function apiCall(method, url, body, onSuccess) {
    var options = {
      method:      method,
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    };
    if (body !== null) options.body = JSON.stringify(body);

    fetch(url, options)
      // Always try to read the body as JSON so we can surface the server's
      // error message; tolerate non-JSON 5xx responses (returns null payload).
      .then(function (response) {
        return response.json()
          .catch(function () { return {}; })
          .then(function (data) { return { ok: response.ok, status: response.status, data: data }; });
      })
      .then(function (result) {
        if (result.ok) {
          onSuccess(result.data);
          return;
        }
        var serverMsg = result.data && result.data.error;
        if (result.status >= 500) {
          showError('Erreur base de données, réessayez dans un instant.');
        } else if (result.status === 422) {
          showError(serverMsg || 'Données invalides.');
        } else {
          showError(serverMsg || 'Erreur inconnue (' + result.status + ').');
        }
      })
      .catch(function () { showError('Connexion réseau perdue, vérifiez votre connexion.'); });
  }

  /**
   * Escape a value for safe interpolation into an HTML attribute or text node.
   * Handles null/undefined by stringifying to an empty string.
   *
   * @param {*} str Any value.
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Format a MySQL DATETIME string to a short French localised date.
   *
   * @param {string|null} str ISO-like datetime or null.
   * @returns {string}        Localised "02 juin 2025" style, or em dash if empty.
   */
  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
})();
