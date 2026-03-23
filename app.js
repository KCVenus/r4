(function () {
  'use strict';

  // ── État ──────────────────────────────────────────────────────────────────
  var state = {
    questions:   [],
    answers:     {},
    currentIndex: 0,
    currentUser: null,
  };

  // ── Refs DOM ──────────────────────────────────────────────────────────────
  var els = {
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
    btnStart:         document.getElementById('btn-start'),
    btnRestart:       document.getElementById('btn-restart'),
  };

  // ── Vues ──────────────────────────────────────────────────────────────────
  function showView(name) {
    ['start', 'question', 'result'].forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    els.progressBarWrap.classList.toggle('hidden', name !== 'question');
  }

  // ── Barre de progression ──────────────────────────────────────────────────
  function updateProgress() {
    var total = state.questions.length;
    var pct   = total === 0 ? 0 : (state.currentIndex / total) * 100;
    els.progressBar.style.width = pct + '%';
    els.progressBarWrap.setAttribute('aria-valuenow', Math.round(pct));
  }

  // ── Affichage question ────────────────────────────────────────────────────
  function renderQuestion() {
    var q     = state.questions[state.currentIndex];
    var total = state.questions.length;

    els.counter.textContent      = 'Question ' + (state.currentIndex + 1) + ' / ' + total;
    els.questionText.textContent = q.text;

    els.optionsContainer.innerHTML = '';
    q.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className     = 'option-btn';
      btn.textContent   = opt.label;
      btn.dataset.value = opt.value;
      btn.addEventListener('click', function () { handleAnswer(q, opt); });
      els.optionsContainer.appendChild(btn);
    });

    updateProgress();
  }

  // ── Enregistrement réponse ────────────────────────────────────────────────
  function handleAnswer(question, option) {
    els.optionsContainer.querySelectorAll('.option-btn').forEach(function (b) {
      b.disabled = true;
      if (b.dataset.value === option.value) b.classList.add('selected');
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

  // ── Fin du test ───────────────────────────────────────────────────────────
  function finishSurvey() {
    var answersArray = state.questions.map(function (q) {
      return state.answers[q.id];
    });

    // Sauvegarde en BDD si connecté
    if (state.currentUser) {
      fetch('api/answers', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ answers: answersArray }),
      }).catch(function () {});
    }

    // Recommandations
    fetch('api/recommend', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ answers: answersArray }),
    })
    .then(function (r) { return r.ok ? r.json() : { formations: [] }; })
    .then(function (data) { showResult(data.formations || []); })
    .catch(function ()    { showResult([]); });
  }

  // ── Écran résultat ────────────────────────────────────────────────────────
  function showResult(formations) {
    els.progressBar.style.width = '100%';
    els.progressBarWrap.setAttribute('aria-valuenow', 100);

    els.formationsList.innerHTML = '';

    if (formations.length === 0) {
      var empty = document.createElement('p');
      empty.className   = 'no-result';
      empty.textContent = 'Aucune formation trouvée. Contactez-nous pour être orienté.';
      els.formationsList.appendChild(empty);
    } else {
      formations.forEach(function (f, i) {
        var card = document.createElement('div');
        card.className = 'formation-card' + (i === 0 ? ' formation-card--top' : '');

        if (i === 0) {
          var badge = document.createElement('span');
          badge.className   = 'formation-badge';
          badge.textContent = '★ Meilleure correspondance';
          card.appendChild(badge);
        }

        var name = document.createElement('h3');
        name.className   = 'formation-name';
        name.textContent = f.name;
        card.appendChild(name);

        if (f.description) {
          var desc = document.createElement('p');
          desc.className   = 'formation-desc';
          desc.textContent = f.description;
          card.appendChild(desc);
        }

        var actions = document.createElement('div');
        actions.className = 'formation-actions';

        if (f.contact_url) {
          var link = document.createElement('a');
          link.href        = f.contact_url;
          link.target      = '_blank';
          link.rel         = 'noopener noreferrer';
          link.className   = 'btn-primary formation-btn';
          link.textContent = 'En savoir plus';
          actions.appendChild(link);
        }

        if (f.contact_email) {
          var mailto = document.createElement('a');
          mailto.href        = 'mailto:' + f.contact_email;
          mailto.className   = 'btn-secondary formation-btn';
          mailto.textContent = 'Contacter par e-mail';
          actions.appendChild(mailto);
        }

        if (actions.children.length > 0) card.appendChild(actions);
        els.formationsList.appendChild(card);
      });
    }

    // CTA connexion uniquement pour les visiteurs
    if (!state.currentUser) {
      els.saveCta.classList.remove('hidden');
    }

    showView('result');
  }

  // ── Recommencer ───────────────────────────────────────────────────────────
  function restart() {
    state.answers      = {};
    state.currentIndex = 0;
    els.progressBar.style.width = '0%';
    els.saveCta.classList.add('hidden');
    showView('start');
  }

  // ── En-tête ───────────────────────────────────────────────────────────────
  function setupHeader(user) {
    if (user) {
      state.currentUser = user;
      els.usernameDisplay.textContent = user.username;
      els.userInfo.classList.remove('hidden');
      if (user.role === 'admin') {
        els.adminLink.classList.remove('hidden');
      }
      els.btnLogout.addEventListener('click', function () {
        fetch('api/auth', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({ action: 'logout' }),
        }).finally(function () {
          window.location.href = 'login.html';
        });
      });
    } else {
      els.guestInfo.classList.remove('hidden');
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // Auth optionnelle — pas de redirection si non connecté
    fetch('api/auth', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function ()  { return null; })
      .then(function (user) {
        setupHeader(user);
        return fetch('api/questions');
      })
      .then(function (r) {
        if (!r.ok) throw new Error('Impossible de charger les questions');
        return r.json();
      })
      .then(function (data) {
        if (!data.questions || data.questions.length === 0) {
          throw new Error('Aucune question disponible');
        }
        state.questions = data.questions;

        document.title              = 'Test d\'orientation';
        els.title.textContent       = 'Test d\'orientation';
        els.description.textContent = 'Répondez à quelques questions pour découvrir la formation qui vous correspond le mieux.';

        els.btnStart.addEventListener('click', function () {
          showView('question');
          renderQuestion();
        });

        els.btnRestart.addEventListener('click', restart);

        showView('start');
      })
      .catch(function (err) {
        document.body.innerHTML =
          '<div style="padding:2rem;color:#b91c1c;max-width:480px;margin:2rem auto">' +
          '<h2 style="margin-bottom:.5rem">Erreur</h2>' +
          '<p>' + err.message + '</p></div>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
