/**
 * app.js — public questionnaire frontend.
 *
 * Flow:
 *   1. Fetch CSRF token + current auth state.
 *   2. Load the list of active questions from /api/questions.
 *   3. Render questions one by one, track chosen answers in memory.
 *   4. On completion: POST to /api/recommend (always) and /api/answers (if logged in).
 *   5. Display the top matching formations.
 *
 * Wrapped in an IIFE to avoid leaking helpers onto the global scope.
 */
(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  // Single mutable object shared between the render functions.
  var state = {
    questions:    [],    // List fetched from /api/questions
    answers:      {},    // Map of question_key -> answer payload
    currentIndex: 0,     // Index of the question currently on screen
    currentUser:  null,  // null when visitor is a guest
    csrfToken:    '',    // Required header for state-changing requests
    userLevel:    null,  // Canonical study level (0/5/6/7/8) — set on view-level
    testSlug:     'complet', // Slug of the chosen test variant (was a binary mode flag).
  };

  // Slider position (0..4) → canonical study level passed to the API.
  // Mirrors docs/scope-formations.md "Mapping niveau utilisateur → éligibles".
  var LEVEL_MAP = [
    { value: 0, label: 'Sans diplôme', helper: 'Pas de formation CNAM accessible directement.' },
    { value: 5, label: 'Bac',          helper: 'Niveau 5 (CC, CP, RNCP niv 5).' },
    { value: 6, label: 'Bac+2',        helper: 'Niveaux 5 + 6 (Licences générales/pro).' },
    { value: 7, label: 'Bac+3',        helper: 'Niveaux 5 + 6 + 7 (Ingés, RNCP niv 7).' },
    { value: 8, label: 'Bac+5+',       helper: 'Toutes les formations du périmètre.' },
  ];

  // ── DOM references ────────────────────────────────────────────────────────
  // Cached once at boot so renders avoid repeated getElementById lookups.
  var elements = {
    title:            document.getElementById('app-title'),
    description:      document.getElementById('app-description'),
    progressBarWrap:  document.getElementById('progress-bar-wrap'),
    progressBar:      document.getElementById('progress-bar'),
    userInfo:         document.getElementById('user-info'),
    guestInfo:        document.getElementById('guest-info'),
    usernameDisplay:  document.getElementById('username-display'),
    adminLink:        document.getElementById('admin-link'),
    btnLogout:        document.getElementById('btn-logout'),
    counter:          document.getElementById('question-counter'),
    questionText:     document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    formationsList:   document.getElementById('formations-list'),
    saveCta:          document.getElementById('save-cta'),
    btnStartQuick:    document.getElementById('btn-start-quick'),
    btnStartFull:     document.getElementById('btn-start-full'),
    btnRestart:       document.getElementById('btn-restart'),
    levelInput:       document.getElementById('level-input'),
    levelCurrent:     document.getElementById('level-current'),
    levelWarning:     document.getElementById('level-warning'),
    btnLevelConfirm:  document.getElementById('btn-level-confirm'),
    btnBackQuestion:  document.getElementById('btn-back-question'),
  };

  // Default fallback recipient when a formation has no contact_email — keeps
  // the "Être contacté" link useful even on partially-filled formations.
  var FALLBACK_CONTACT_EMAIL = 'contact@ohvenus.fr';

  /**
   * Toggle which `<section id="view-*">` is visible.
   * Also shows/hides the progress bar (only relevant in the question view).
   *
   * @param {'start'|'level'|'question'|'result'} name Name of the view to activate.
   */
  function showView(name) {
    ['start', 'level', 'question', 'result'].forEach(function (viewName) {
      document.getElementById('view-' + viewName).classList.toggle('active', viewName === name);
    });
    elements.progressBarWrap.classList.toggle('hidden', name !== 'question');
  }

  /**
   * Reflect the current slider position into the live label and toggle the
   * "no-formation" warning when the user picks "Sans diplôme". Pure DOM —
   * the canonical level value is only committed on btn-level-confirm click.
   */
  function updateLevelDisplay() {
    var idx   = parseInt(elements.levelInput.value, 10) || 0;
    var entry = LEVEL_MAP[idx];
    elements.levelCurrent.textContent = entry.label + ' — ' + entry.helper;
    elements.levelWarning.classList.toggle('hidden', entry.value !== 0);
    // Disable the CTA when "Sans diplôme" so we don't push them into a
    // questionnaire whose result will be filtered down to nothing useful.
    elements.btnLevelConfirm.disabled = entry.value === 0;
  }

  /**
   * Recompute and apply the progress-bar width from the current state.
   * Also updates the ARIA attribute so screen readers announce the progress.
   */
  function updateProgress() {
    var total   = state.questions.length;
    var percent = total === 0 ? 0 : (state.currentIndex / total) * 100;
    elements.progressBar.style.width = percent + '%';
    elements.progressBarWrap.setAttribute('aria-valuenow', Math.round(percent));
  }

  /**
   * Render the current question and its option buttons.
   * Each button carries the option value via dataset to keep the handler stateless.
   */
  function renderQuestion() {
    var question = state.questions[state.currentIndex];
    var total    = state.questions.length;

    elements.counter.textContent      = 'Question ' + (state.currentIndex + 1) + ' / ' + total;
    elements.questionText.textContent = question.text;

    elements.optionsContainer.innerHTML = '';
    question.options.forEach(function (option) {
      var btn = document.createElement('button');
      btn.className     = 'option-btn';
      btn.textContent   = option.label;
      btn.dataset.value = option.value;
      btn.addEventListener('click', function () { handleAnswer(question, option); });
      elements.optionsContainer.appendChild(btn);
    });

    updateProgress();
  }

  /**
   * Record the user's choice, disable all buttons to prevent double-click,
   * then move to the next question (or finish the survey).
   *
   * The 180 ms delay gives the "selected" CSS state a moment to flash before
   * the view swaps — pure UX polish.
   *
   * @param {object} question The question currently displayed.
   * @param {object} option   The option the user clicked.
   */
  function handleAnswer(question, option) {
    elements.optionsContainer.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.value === option.value) btn.classList.add('selected');
    });

    state.answers[question.id] = {
      question_key:  question.id,
      question_text: question.text,
      chosen_value:  option.value,
      chosen_label:  option.label,
    };

    state.currentIndex++;

    setTimeout(function () {
      if (state.currentIndex < state.questions.length) {
        renderQuestion();
      } else {
        finishSurvey();
      }
    }, 180);
  }

  /**
   * Called once every question has been answered.
   * Fires two requests in parallel:
   *   - /api/answers to persist the run (only if the user is authenticated).
   *   - /api/recommend to get the top matching formations (always).
   */
  function finishSurvey() {
    // Rebuild the ordered list from the state map so the backend gets them
    // in the same order as the questions array (avoids relying on key order).
    var answersArray = state.questions.map(function (question) {
      return state.answers[question.id];
    });

    var payload = { answers: answersArray };
    // user_level is only sent when the slider was actually used (non-null);
    // both endpoints whitelist 5/6/7/8 server-side, anything else = no filter.
    if (state.userLevel !== null) payload.user_level = state.userLevel;

    // Persist only for logged-in users; guests get results without storage.
    if (state.currentUser) {
      fetch('api/answers', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrfToken },
        body:        JSON.stringify(payload),
      }).catch(function () {}); // best-effort, user already sees results anyway
    }

    // Recommendations work for anyone, no auth required.
    fetch('api/recommend', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    .then(function (response) { return response.ok ? response.json() : { formations: [] }; })
    .then(function (data)     { showResult(data.formations || []); })
    .catch(function ()        { showResult([]); });
  }

  /**
   * Render the result view with the received formations.
   * The first card is flagged as "best match" with a star badge.
   *
   * @param {Array<object>} formations List of matching formations with score/percent.
   */
  function showResult(formations) {
    elements.progressBar.style.width = '100%';
    elements.progressBarWrap.setAttribute('aria-valuenow', 100);

    elements.formationsList.innerHTML = '';

    if (formations.length === 0) {
      var empty = document.createElement('p');
      empty.className   = 'no-result';
      empty.textContent = 'Aucune formation trouvée. Contactez-nous pour être orienté.';
      elements.formationsList.appendChild(empty);
    } else {
      formations.forEach(function (formation, index) {
        var card = document.createElement('div');
        card.className = 'formation-card' + (index === 0 ? ' formation-card--top' : '');

        if (index === 0) {
          var badge = document.createElement('span');
          badge.className   = 'formation-badge';
          badge.textContent = '★ Meilleure correspondance';
          card.appendChild(badge);
        }

        var name = document.createElement('h3');
        name.className   = 'formation-name';
        name.textContent = formation.name;
        card.appendChild(name);

        // Render the compatibility bar only if the backend returned a percent
        // (it doesn't when falling back to the "no scoring data" default set).
        if (typeof formation.percent !== 'undefined') {
          var scoreWrap = document.createElement('div');
          scoreWrap.className = 'formation-score';
          var scoreBar = document.createElement('div');
          scoreBar.className = 'formation-score-bar';
          var scoreFill = document.createElement('div');
          scoreFill.className = 'formation-score-fill';
          scoreFill.style.width = formation.percent + '%';
          var scoreLabel = document.createElement('span');
          scoreLabel.className = 'formation-score-label';
          scoreLabel.textContent = formation.percent + '% de compatibilité';
          scoreBar.appendChild(scoreFill);
          scoreWrap.appendChild(scoreBar);
          scoreWrap.appendChild(scoreLabel);
          card.appendChild(scoreWrap);
        }

        if (formation.description) {
          var desc = document.createElement('p');
          desc.className   = 'formation-desc';
          desc.textContent = formation.description;
          card.appendChild(desc);
        }

        var actions = document.createElement('div');
        actions.className = 'formation-actions';

        if (formation.contact_url) {
          var link = document.createElement('a');
          link.href        = formation.contact_url;
          link.target      = '_blank';
          // noopener+noreferrer: prevents the external page from accessing
          // window.opener (tabnabbing protection).
          link.rel         = 'noopener noreferrer';
          link.className   = 'btn-primary formation-btn';
          link.textContent = 'En savoir plus';
          actions.appendChild(link);
        }

        // Open the device's mail app with subject + body pre-filled. Falls
        // back to the admin inbox when the formation has no contact_email.
        var recipient = formation.contact_email || FALLBACK_CONTACT_EMAIL;
        var mailto    = document.createElement('a');
        mailto.href = 'mailto:' + recipient
          + '?subject=' + encodeURIComponent('Demande de contact - ' + formation.name)
          + '&body='    + encodeURIComponent(
              'Bonjour,\n\n'
              + 'Je vous contacte suite au test d\'orientation : la formation "'
              + formation.name + '" m\'intéresse et je souhaiterais en savoir plus.\n\n'
              + 'Cordialement,\n'
            );
        mailto.className   = 'btn-secondary formation-btn';
        mailto.textContent = 'Être contacté';
        actions.appendChild(mailto);

        if (actions.children.length > 0) card.appendChild(actions);
        elements.formationsList.appendChild(card);
      });
    }

    // Invite guests to sign up so they can save their results next time.
    if (!state.currentUser) {
      elements.saveCta.classList.remove('hidden');
    }

    showView('result');
  }

  /**
   * Go back one step in the questionnaire flow.
   *
   * From a question: drop the answer for the previous question (so the user
   * can pick again) and re-render it. From the very first question, fall
   * back to the level-slider view. The currently displayed question's own
   * answer was never recorded (handleAnswer advances right after recording),
   * so only the previous one needs to be cleared.
   */
  function goBackQuestion() {
    if (state.currentIndex === 0) {
      showView('level');
      return;
    }
    state.currentIndex--;
    var prevQuestion = state.questions[state.currentIndex];
    delete state.answers[prevQuestion.id];
    renderQuestion();
  }

  /**
   * Reset the in-memory state and return to the start screen.
   * Does not clear `state.questions` — those are still valid.
   */
  function restart() {
    state.answers      = {};
    state.currentIndex = 0;
    state.userLevel    = null;
    state.testSlug     = 'complet';
    elements.progressBar.style.width = '0%';
    elements.saveCta.classList.add('hidden');
    // Re-enable the start CTAs disabled by startTest() during the previous run.
    elements.btnStartQuick.disabled = false;
    elements.btnStartFull.disabled  = false;
    showView('start');
  }

  /**
   * Fill the header with user info or show the guest CTA.
   * Also wires up the logout button if the user is authenticated.
   *
   * @param {object|null} user Authenticated user payload, or null for guests.
   */
  function setupHeader(user) {
    if (user) {
      state.currentUser = user;
      elements.usernameDisplay.textContent = user.username;
      elements.userInfo.classList.remove('hidden');
      if (user.role === 'admin') {
        elements.adminLink.classList.remove('hidden');
      }
      elements.btnLogout.addEventListener('click', function () {
        fetch('api/auth', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrfToken },
          body:        JSON.stringify({ action: 'logout' }),
        }).finally(function () {
          // Always redirect, even if the logout call failed — the UI must
          // never stay stuck in a "logging out" state.
          window.location.href = 'login.html';
        });
      });
    } else {
      elements.guestInfo.classList.remove('hidden');
    }
  }

  /**
   * Click handler shared by the two start CTAs. Loads the right question
   * subset for the chosen test, then routes to the level slider.
   *
   * Disables both buttons while the fetch is in flight so a double-click
   * doesn't trigger overlapping requests / inconsistent state.
   *
   * @param {string} slug Test slug — 'rapide' (10q) or 'complet' (30q) by
   *                      default, or any new slug coordinators add.
   */
  function startTest(slug) {
    state.testSlug = slug;
    elements.btnStartQuick.disabled = true;
    elements.btnStartFull.disabled  = true;

    fetch('api/questions?test=' + encodeURIComponent(slug))
      .then(function (response) {
        if (!response.ok) throw new Error('Impossible de charger les questions');
        return response.json();
      })
      .then(function (data) {
        if (!data.questions || data.questions.length === 0) {
          throw new Error('Aucune question disponible');
        }
        state.questions    = data.questions;
        state.answers      = {};
        state.currentIndex = 0;

        // Reset the slider to "Bac+2" so a previous run doesn't leak.
        elements.levelInput.value = 2;
        updateLevelDisplay();
        showView('level');
      })
      .catch(function () {
        // Restore the start screen so the user can retry; failures here are
        // typically transient (network) rather than user errors.
        elements.btnStartQuick.disabled = false;
        elements.btnStartFull.disabled  = false;
        alert('Impossible de charger les questions. Réessayez.');
      });
  }

  /**
   * Bootstrap the app on DOMContentLoaded.
   *
   * The promise chain is ordered:
   *   CSRF token -> auth check -> render start screen.
   * Questions are loaded lazily once the user picks a test mode (see
   * startTest), which avoids fetching the full 30-question payload for
   * visitors who never start a test.
   */
  function init() {
    // Step 1: get the CSRF token (mandatory for the logout POST later).
    fetch('api/csrf', { credentials: 'include' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .catch(function ()         { return null; })
      .then(function (data) {
        if (data) state.csrfToken = data.token;
        // Step 2: check whether the user is already authenticated.
        return fetch('api/auth', { credentials: 'include' });
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .catch(function ()         { return null; })
      .then(function (user) {
        setupHeader(user);

        document.title                   = 'Test d\'orientation';
        elements.title.textContent       = 'Test d\'orientation';
        elements.description.textContent = 'Choisissez la profondeur du test pour découvrir les formations CNAM qui vous correspondent.';

        elements.btnStartQuick.addEventListener('click', function () { startTest('rapide');  });
        elements.btnStartFull.addEventListener('click',  function () { startTest('complet'); });

        elements.levelInput.addEventListener('input',  updateLevelDisplay);
        elements.levelInput.addEventListener('change', updateLevelDisplay);
        elements.btnLevelConfirm.addEventListener('click', function () {
          var idx = parseInt(elements.levelInput.value, 10) || 0;
          state.userLevel = LEVEL_MAP[idx].value;
          showView('question');
          renderQuestion();
        });

        elements.btnRestart.addEventListener('click', restart);
        elements.btnBackQuestion.addEventListener('click', goBackQuestion);

        // "Retour" buttons declared via data-back-target (e.g. on view-level)
        // route straight to the named view without touching question state.
        document.querySelectorAll('.btn-back[data-back-target]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            showView(btn.dataset.backTarget);
          });
        });

        // Initialise the slider label so it reads correctly even if the user
        // never clicks a start CTA (e.g. they navigate via keyboard).
        updateLevelDisplay();
        showView('start');
      })
      .catch(function (err) {
        // Last-resort fallback: wipe the body and show a readable error.
        document.body.innerHTML =
          '<div style="padding:2rem;color:#b91c1c;max-width:480px;margin:2rem auto">' +
          '<h2 style="margin-bottom:.5rem">Erreur</h2>' +
          '<p>' + (err && err.message || 'Erreur inconnue') + '</p></div>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
