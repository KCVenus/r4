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

  // Cache the formations list once per tab load — needed by the editor modal
  // to render the per-option scoring grid. Refreshed on every loadQuestions().
  var formationsCache = [];
  // Captured by renderQuestions so both modals can clamp the sort_order input
  // without re-fetching. Mirrors the server-side bound in AdminController.
  var lastQuestionsCount = 0;

  /**
   * Load both the questions list and the formations catalogue in parallel,
   * then hand off to renderQuestions. Formations are cached for the modal.
   */
  function loadQuestions() {
    Promise.all([
      fetch('api/admin/questions',  { credentials: 'include' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      fetch('api/admin/formations', { credentials: 'include' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
    ])
      .then(function (results) {
        formationsCache = results[1].formations || [];
        renderQuestions(results[0]);
      })
      .catch(function () {
        contentRoot.innerHTML = '<p class="admin-error">Erreur lors du chargement des questions.</p>';
      });
  }

  /**
   * Render the modern question grid: one card per question with key, badges,
   * full text, options as pills, and inline edit/delete buttons.
   *
   * @param {object} data Payload with a `questions` array.
   */
  function renderQuestions(data) {
    lastQuestionsCount = data.questions.length;

    var html = '<section class="admin-section">';
    html += '<div class="admin-section-header">';
    html += '<h2 class="admin-section-title">Questions <span class="muted">(' + data.questions.length + ')</span></h2>';
    html += '<button class="btn-primary btn-sm" id="btn-add-question">+ Nouvelle question</button>';
    html += '</div>';

    if (data.questions.length === 0) {
      html += '<div class="empty-state"><p>Aucune question pour le moment.</p>' +
              '<p class="muted">Cliquez sur « Nouvelle question » pour commencer.</p></div>';
    } else {
      html += '<div class="q-grid">';
      data.questions.forEach(function (question) {
        html += renderQuestionCard2(question);
      });
      html += '</div>';
    }

    html += '</section>';
    contentRoot.innerHTML = html;

    document.getElementById('btn-add-question').addEventListener('click', function () {
      openQuestionModal(null);
    });
    document.querySelectorAll('.btn-edit-question').forEach(function (btn) {
      btn.addEventListener('click', function () { openQuestionModal(parseInt(btn.dataset.id)); });
    });
    document.querySelectorAll('.btn-delete-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette question ? (ses options et scores seront supprimés)')) return;
        deleteQuestion(parseInt(btn.dataset.id));
      });
    });
  }

  /**
   * Build one question card (modern grid view).
   *
   * @param {object} question Question with options[].
   * @returns {string}        HTML.
   */
  function renderQuestionCard2(question) {
    var html = '<article class="q-grid-card">';
    html += '<header class="q-grid-card-head">';
    html += '<div class="q-grid-card-tags">';
    html += '<span class="tag tag-key">' + escapeHtml(question.question_key) + '</span>';
    html += '<span class="tag ' + (question.active ? 'tag-on' : 'tag-off') + '">' +
            (question.active ? '● Actif' : '○ Inactif') + '</span>';
    if (question.quick) html += '<span class="tag tag-quick">⚡ Quick</span>';
    html += '</div>';
    html += '<div class="q-grid-card-actions">';
    html += '<button class="icon-btn btn-edit-question" data-id="' + question.id + '" title="Modifier">✎</button>';
    html += '<button class="icon-btn icon-btn-danger btn-delete-question" data-id="' + question.id + '" title="Supprimer">✕</button>';
    html += '</div>';
    html += '</header>';
    html += '<p class="q-grid-card-text">' + escapeHtml(question.text) + '</p>';

    if (question.options && question.options.length > 0) {
      html += '<div class="q-grid-card-options">';
      question.options.forEach(function (opt) {
        html += '<span class="option-pill">' + escapeHtml(opt.label) + '</span>';
      });
      html += '</div>';
    }
    html += '</article>';
    return html;
  }

  /**
   * Open the question editor modal.
   *
   * For an existing question, the full payload (question + options + scores)
   * is fetched first and used to pre-populate the form. For creation, the
   * server uses the legacy POST /admin/questions endpoint (key + text only),
   * then the user reopens it for full edit.
   *
   * @param {number|null} id Question id, or null to create.
   */
  function openQuestionModal(id) {
    if (id === null) {
      openCreateQuestionModal();
      return;
    }
    fetch('api/admin/question?id=' + id, { credentials: 'include' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        renderQuestionEditorModal(data.question);
      })
      .catch(function () { showError('Erreur lors du chargement de la question.'); });
  }

  /**
   * Modal step 1 for creating a new question: ask for key + text only.
   * After save, immediately open the full editor on the newly-created row.
   */
  function openCreateQuestionModal() {
    var modal = createModalShell('Nouvelle question');
    // New row appends after the last → legal range is [1, count + 1].
    var maxPos = lastQuestionsCount + 1;

    modal.body.innerHTML =
      '<div class="field"><label>Identifiant court (ex : q11, q24q)</label>' +
      '<input id="nq-key" type="text" placeholder="ex : q11" autocomplete="off"></div>' +
      '<div class="field"><label>Énoncé de la question</label>' +
      '<textarea id="nq-text" rows="3" placeholder="ex : Je préfère travailler en équipe."></textarea></div>' +
      '<div class="field"><label>Ordre d\'affichage (1 à ' + maxPos + ')</label>' +
      '<input id="nq-sort" type="number" min="1" max="' + maxPos + '" step="1" value="' + maxPos + '"></div>';

    modal.footer.innerHTML =
      '<button class="btn-secondary" data-modal-close>Annuler</button>' +
      '<button class="btn-primary" id="nq-create">Créer puis configurer</button>';
    wireModalClose(modal);

    modal.body.querySelector('#nq-key').focus();
    modal.footer.querySelector('#nq-create').addEventListener('click', function () {
      var key  = modal.body.querySelector('#nq-key').value.trim();
      var text = modal.body.querySelector('#nq-text').value.trim();
      var sort = parseInt(modal.body.querySelector('#nq-sort').value, 10);
      if (!key || !text) { showError('Identifiant et énoncé requis.'); return; }
      if (isNaN(sort) || sort < 1 || sort > maxPos) {
        showError('Position invalide (entre 1 et ' + maxPos + ').');
        return;
      }
      apiCall('POST', 'api/admin/questions', { question_key: key, text: text, sort_order: sort }, function (resp) {
        closeModal(modal);
        // Re-open the freshly-created row in the full editor so the admin
        // can immediately add options and assign formations.
        openQuestionModal(resp.id);
      });
    });
  }

  /**
   * The big editor modal: question text + options (with their values + labels)
   * + per-option formation scoring grid.
   *
   * Local state lives on the modal element. On save, the whole tree is sent
   * to PUT /admin/question?id=X which reconciles the diff server-side.
   *
   * @param {object} q Full question payload from GET /admin/question.
   */
  function renderQuestionEditorModal(q) {
    var modal = createModalShell('Modifier la question — ' + q.question_key, 'modal-wide');
    // Question already exists, so the upper bound is the current count.
    var maxPos = Math.max(1, lastQuestionsCount);

    // Internal state mutated by the option/score editors below.
    // Cloned from q.options so we can edit freely without touching the source.
    var state = {
      text:       q.text,
      sort_order: q.sort_order,
      active:     !!q.active,
      quick:      !!q.quick,
      options:    (q.options || []).map(function (o) {
        return {
          id:         o.id,
          value:      o.value,
          label:      o.label,
          sort_order: o.sort_order,
          // Normalise scores to a plain object keyed by formation id.
          scores:    Object.assign({}, o.scores || {}),
        };
      }),
    };
    if (state.options.length === 0) {
      // Bootstrap with two empty options for a brand-new question.
      state.options = [
        { id: null, value: 'A', label: '', sort_order: 0, scores: {} },
        { id: null, value: 'B', label: '', sort_order: 1, scores: {} },
      ];
    }

    rerender();
    wireModalClose(modal);

    // ── Body markup is rebuilt on every state change for simplicity.
    function rerender() {
      var html = '';

      // Question metadata.
      html += '<div class="modal-section">';
      html += '<div class="field"><label>Énoncé de la question</label>' +
              '<textarea id="ed-text" rows="3">' + escapeHtml(state.text) + '</textarea></div>';
      html += '<div class="field-row">';
      html += '<div class="field"><label>Ordre (1 à ' + maxPos + ')</label>' +
              '<input id="ed-sort" type="number" min="1" max="' + maxPos + '" step="1" value="' + state.sort_order + '"></div>';
      html += '<div class="field-checks">';
      html += '<label class="check"><input id="ed-active" type="checkbox"' + (state.active ? ' checked' : '') + '> Active</label>';
      html += '<label class="check"><input id="ed-quick" type="checkbox"' + (state.quick ? ' checked' : '') + '> Test rapide (10 questions)</label>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Options + scores.
      html += '<div class="modal-section">';
      html += '<div class="modal-section-head">';
      html += '<h4>Réponses possibles & formations associées</h4>';
      html += '<button class="btn-secondary btn-sm" id="ed-add-opt">+ Ajouter une réponse</button>';
      html += '</div>';

      state.options.forEach(function (opt, idx) {
        html += renderOptionEditor(opt, idx);
      });

      html += '</div>';

      modal.body.innerHTML = html;
      bindEditorEvents();
    }

    /**
     * Render the editor block for one option: meta inputs + scoring grid.
     *
     * @param {object} opt Option state slice.
     * @param {number} idx Position in state.options.
     */
    function renderOptionEditor(opt, idx) {
      var html = '<div class="opt-editor" data-idx="' + idx + '">';
      html += '<div class="opt-editor-head">';
      html += '<div class="opt-meta">';
      html += '<div class="field field-tight"><label>Code</label>' +
              '<input class="opt-value" type="text" value="' + escapeHtml(opt.value) + '" maxlength="20"></div>';
      html += '<div class="field field-tight field-grow"><label>Libellé affiché</label>' +
              '<input class="opt-label" type="text" value="' + escapeHtml(opt.label) + '"></div>';
      html += '</div>';
      // Don't allow deleting below 2 options (binary test minimum).
      var canRemove = state.options.length > 2;
      html += '<button class="icon-btn icon-btn-danger opt-remove" ' +
              (canRemove ? '' : 'disabled title="Au moins 2 options requises"') +
              ' title="Retirer cette réponse">✕</button>';
      html += '</div>';

      // Formation scoring grid.
      html += '<div class="score-grid">';
      html += '<p class="score-grid-help">Cochez les formations recommandées si l\'utilisateur choisit cette réponse, ' +
              'puis ajustez le poids (1 = peu, 5 = très fort).</p>';
      if (formationsCache.length === 0) {
        html += '<p class="muted">Aucune formation disponible. Créez-en dans l\'onglet Formations.</p>';
      } else {
        html += '<ul class="formation-list">';
        formationsCache.forEach(function (f) {
          var pts = parseInt(opt.scores[f.id] || 0);
          var on  = pts > 0;
          html += '<li class="formation-row' + (on ? ' is-on' : '') + '">';
          html += '<label class="formation-toggle">';
          html += '<input type="checkbox" class="opt-formation-on" data-fid="' + f.id + '"' + (on ? ' checked' : '') + '>';
          html += '<span class="formation-name">' + escapeHtml(f.name) + '</span>';
          html += '</label>';
          html += '<div class="formation-points' + (on ? '' : ' is-hidden') + '">';
          html += '<input type="range" class="opt-formation-pts" data-fid="' + f.id + '" min="1" max="5" value="' + (on ? pts : 1) + '">';
          html += '<output class="formation-pts-out">' + (on ? pts : 1) + '</output>';
          html += '</div>';
          html += '</li>';
        });
        html += '</ul>';
      }
      html += '</div></div>';
      return html;
    }

    /**
     * Wire all interactive handlers after a re-render.
     * Inputs write back to `state` immediately so the model stays in sync.
     */
    function bindEditorEvents() {
      modal.body.querySelector('#ed-text').addEventListener('input', function (e) { state.text = e.target.value; });
      modal.body.querySelector('#ed-sort').addEventListener('input', function (e) { state.sort_order = parseInt(e.target.value) || 0; });
      modal.body.querySelector('#ed-active').addEventListener('change', function (e) { state.active = e.target.checked; });
      modal.body.querySelector('#ed-quick').addEventListener('change', function (e) { state.quick = e.target.checked; });

      modal.body.querySelector('#ed-add-opt').addEventListener('click', function () {
        state.options.push({ id: null, value: '', label: '', sort_order: state.options.length, scores: {} });
        rerender();
      });

      modal.body.querySelectorAll('.opt-editor').forEach(function (el) {
        var idx = parseInt(el.dataset.idx);
        el.querySelector('.opt-value').addEventListener('input', function (e) { state.options[idx].value = e.target.value; });
        el.querySelector('.opt-label').addEventListener('input', function (e) { state.options[idx].label = e.target.value; });
        var rm = el.querySelector('.opt-remove');
        if (rm && !rm.disabled) {
          rm.addEventListener('click', function () {
            if (!confirm('Retirer cette réponse ? Les pondérations associées seront supprimées.')) return;
            state.options.splice(idx, 1);
            rerender();
          });
        }

        // Toggle formation on/off + reveal/hide its points slider.
        el.querySelectorAll('.opt-formation-on').forEach(function (chk) {
          chk.addEventListener('change', function (e) {
            var fid = parseInt(e.target.dataset.fid);
            var row = e.target.closest('.formation-row');
            var pts = row.querySelector('.formation-points');
            if (e.target.checked) {
              var slider = row.querySelector('.opt-formation-pts');
              state.options[idx].scores[fid] = parseInt(slider.value) || 1;
              row.classList.add('is-on');
              pts.classList.remove('is-hidden');
            } else {
              delete state.options[idx].scores[fid];
              row.classList.remove('is-on');
              pts.classList.add('is-hidden');
            }
          });
        });
        el.querySelectorAll('.opt-formation-pts').forEach(function (sl) {
          sl.addEventListener('input', function (e) {
            var fid = parseInt(e.target.dataset.fid);
            var pts = parseInt(e.target.value) || 1;
            // Keep the live readout in sync alongside the slider.
            e.target.parentElement.querySelector('.formation-pts-out').textContent = pts;
            // Only persist if the formation is currently checked.
            if (state.options[idx].scores[fid] !== undefined) {
              state.options[idx].scores[fid] = pts;
            }
          });
        });
      });
    }

    // Footer with Save + Cancel.
    modal.footer.innerHTML =
      '<button class="btn-secondary" data-modal-close>Annuler</button>' +
      '<button class="btn-primary" id="ed-save">Enregistrer</button>';
    modal.footer.querySelector('#ed-save').addEventListener('click', function () {
      // Final guards mirroring the server checks.
      if (!state.text.trim())       { showError('Un énoncé est requis.'); return; }
      if (state.options.length < 2) { showError('Au moins 2 réponses sont requises.'); return; }
      var bad = state.options.some(function (o) { return !o.value.trim() || !o.label.trim(); });
      if (bad) { showError('Chaque réponse doit avoir un code et un libellé.'); return; }
      if (isNaN(state.sort_order) || state.sort_order < 1 || state.sort_order > maxPos) {
        showError('Position invalide (entre 1 et ' + maxPos + ').');
        return;
      }

      apiCall('PUT', 'api/admin/question?id=' + q.id, state, function () {
        closeModal(modal);
        loadQuestions();
      });
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
   * @param {string}                       message Text to display.
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

  function showError(message) { showToast(message, 'error'); }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Tiny wrapper around fetch for admin CRUD calls.
   * Always includes credentials + CSRF token and parses JSON.
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
        // Split feedback so the admin knows what went wrong:
        //   - 5xx → DB / server outage
        //   - 422 → validation (server's message is meaningful)
        //   - other 4xx → server's message or generic fallback
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

  // ═══════════════════════════════════════════════════════════
  // MODAL UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Build and append a modal shell (overlay + dialog + header + body + footer).
   * Returns references the caller fills in directly.
   *
   * @param {string} title      Header text.
   * @param {string} extraClass Optional additional class for sizing variants
   *                            (e.g. 'modal-wide').
   * @returns {{root: HTMLElement, body: HTMLElement, footer: HTMLElement}}
   */
  function createModalShell(title, extraClass) {
    var root = document.createElement('div');
    root.className = 'modal-overlay' + (extraClass ? ' ' + extraClass : '');
    root.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '  <header class="modal-head">' +
      '    <h3>' + escapeHtml(title) + '</h3>' +
      '    <button class="icon-btn modal-x" aria-label="Fermer" data-modal-close>✕</button>' +
      '  </header>' +
      '  <div class="modal-body"></div>' +
      '  <footer class="modal-foot"></footer>' +
      '</div>';
    document.body.appendChild(root);
    document.body.classList.add('modal-open');

    return {
      root:   root,
      body:   root.querySelector('.modal-body'),
      footer: root.querySelector('.modal-foot'),
    };
  }

  /**
   * Wire close buttons (any element with [data-modal-close]) and overlay
   * click + Escape key to close the modal.
   *
   * @param {{root: HTMLElement}} modal Shell from createModalShell.
   */
  function wireModalClose(modal) {
    modal.root.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(modal); });
    });
    // Click outside the dialog (on the overlay) closes too.
    modal.root.addEventListener('click', function (e) {
      if (e.target === modal.root) closeModal(modal);
    });
    // Escape closes — bound at document level, removed when modal closes.
    function onKey(e) { if (e.key === 'Escape') closeModal(modal); }
    document.addEventListener('keydown', onKey);
    modal.root._onKey = onKey;
  }

  /**
   * Tear down a modal: detach event handler and remove the DOM tree.
   *
   * @param {{root: HTMLElement}} modal Shell from createModalShell.
   */
  function closeModal(modal) {
    if (modal.root._onKey) document.removeEventListener('keydown', modal.root._onKey);
    if (modal.root.parentNode) modal.root.parentNode.removeChild(modal.root);
    document.body.classList.remove('modal-open');
  }
})();
