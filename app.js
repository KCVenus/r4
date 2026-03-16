(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  var state = {
    questions:    [],
    answers:      {},   // { q1: { label, value }, ... }
    currentIndex: 0,
    meta:         {},
    currentUser:  null,
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var els = {
    title:            document.getElementById('app-title'),
    description:      document.getElementById('app-description'),
    progressBarWrap:  document.getElementById('progress-bar-wrap'),
    progressBar:      document.getElementById('progress-bar'),
    userInfo:         document.getElementById('user-info'),
    usernameDisplay:  document.getElementById('username-display'),
    adminLink:        document.getElementById('admin-link'),
    btnLogout:        document.getElementById('btn-logout'),
    viewStart:        document.getElementById('view-start'),
    viewQuestion:     document.getElementById('view-question'),
    viewSummary:      document.getElementById('view-summary'),
    lastTestCard:     document.getElementById('last-test-card'),
    lastTestList:     document.getElementById('last-test-list'),
    lastTestDate:     document.getElementById('last-test-date'),
    counter:          document.getElementById('question-counter'),
    questionText:     document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    summaryList:      document.getElementById('summary-list'),
    btnStart:         document.getElementById('btn-start'),
    btnRestart:       document.getElementById('btn-restart'),
  };

  // ── View switching ────────────────────────────────────────────────────────
  function showView(name) {
    ['start', 'question', 'summary'].forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    els.progressBarWrap.classList.toggle('hidden', name === 'start');
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  function updateProgress() {
    var total = state.questions.length;
    var pct   = total === 0 ? 0 : (state.currentIndex / total) * 100;
    els.progressBar.style.width = pct + '%';
    els.progressBarWrap.setAttribute('aria-valuenow', Math.round(pct));
  }

  // ── Question rendering ────────────────────────────────────────────────────
  function renderQuestion() {
    var q     = state.questions[state.currentIndex];
    var total = state.questions.length;

    els.counter.textContent    = 'Question ' + (state.currentIndex + 1) + ' of ' + total;
    els.questionText.textContent = q.text;

    els.optionsContainer.innerHTML = '';
    q.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className   = 'option-btn';
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      btn.setAttribute('aria-label', opt.label);
      btn.addEventListener('click', function () { handleAnswer(q, opt); });
      els.optionsContainer.appendChild(btn);
    });

    updateProgress();
  }

  // ── Answer recording ──────────────────────────────────────────────────────
  function handleAnswer(question, option) {
    els.optionsContainer.querySelectorAll('.option-btn').forEach(function (b) {
      b.disabled = true;
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
        submitAndShowSummary();
      }
    }, 180);
  }

  // ── Submit answers to API then show summary ───────────────────────────────
  function submitAndShowSummary() {
    var answersArray = state.questions.map(function (q) {
      return state.answers[q.id];
    });

    fetch('api/answers.php', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ answers: answersArray }),
    })
    .catch(function () { /* save failed silently — survey still shows */ })
    .finally(function () {
      showSummary();
    });
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  function showSummary() {
    els.progressBar.style.width = '100%';
    els.progressBarWrap.setAttribute('aria-valuenow', 100);
    els.summaryList.innerHTML = '';

    state.questions.forEach(function (q, i) {
      var answer = state.answers[q.id];
      var li  = document.createElement('li');
      var qEl = document.createElement('div');
      var aEl = document.createElement('div');

      qEl.className   = 'summary-question';
      qEl.textContent = (i + 1) + '. ' + q.text;
      aEl.className   = 'summary-answer';
      aEl.textContent = answer ? answer.chosen_label : '—';

      li.appendChild(qEl);
      li.appendChild(aEl);
      els.summaryList.appendChild(li);
    });

    showView('summary');
  }

  // ── Restart ───────────────────────────────────────────────────────────────
  function restart() {
    state.answers      = {};
    state.currentIndex = 0;
    els.progressBar.style.width = '0%';
    // Refresh last test card after completing a new survey
    fetchLastTest();
    showView('start');
  }

  // ── Last test card ────────────────────────────────────────────────────────
  function fetchLastTest() {
    fetch('api/answers.php?action=last', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.answers || data.answers.length === 0) {
          els.lastTestCard.classList.add('hidden');
          return;
        }

        els.lastTestList.innerHTML = '';
        data.answers.forEach(function (a) {
          var li  = document.createElement('li');
          var qEl = document.createElement('span');
          var aEl = document.createElement('span');

          qEl.className   = 'lt-question';
          qEl.textContent = a.question_text;
          aEl.className   = 'lt-answer';
          aEl.textContent = a.chosen_label;

          li.appendChild(qEl);
          li.appendChild(aEl);
          els.lastTestList.appendChild(li);
        });

        var d = new Date(data.completed_at);
        els.lastTestDate.textContent = 'Completed on ' + d.toLocaleDateString(undefined, {
          day: '2-digit', month: 'long', year: 'numeric',
        });

        els.lastTestCard.classList.remove('hidden');
        els.btnStart.textContent = 'Retake survey';
      })
      .catch(function () {
        els.lastTestCard.classList.add('hidden');
      });
  }

  // ── Auth: populate header ─────────────────────────────────────────────────
  function setupHeader(user) {
    els.usernameDisplay.textContent = user.username;
    els.userInfo.classList.remove('hidden');

    if (user.role === 'admin') {
      els.adminLink.classList.remove('hidden');
    }

    els.btnLogout.addEventListener('click', function () {
      fetch('api/auth.php', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ action: 'logout' }),
      }).finally(function () {
        window.location.href = 'login.html';
      });
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  function loadQuestions() {
    return fetch('questions.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load questions.json');
        return r.json();
      })
      .then(function (data) {
        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('questions.json must have a "questions" array');
        }
        data.questions.forEach(function (q, i) {
          if (!q.options || q.options.length !== 2) {
            throw new Error('Question at index ' + i + ' must have exactly 2 options');
          }
        });
        state.questions = data.questions;
        state.meta      = data.meta || {};
      });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // 1. Check auth — redirect to login if not logged in
    fetch('api/auth.php', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) { window.location.href = 'login.html'; return null; }
        return r.json();
      })
      .then(function (user) {
        if (!user) return;

        state.currentUser = user;
        setupHeader(user);

        // 2. Load questions and last test in parallel
        return Promise.all([loadQuestions(), fetchLastTest()]);
      })
      .then(function () {
        if (!state.currentUser) return;

        document.title           = state.meta.title || 'Survey';
        els.title.textContent    = state.meta.title || 'Survey';
        els.description.textContent = state.meta.description || '';

        els.btnStart.addEventListener('click', function () {
          showView('question');
          renderQuestion();
        });

        els.btnRestart.addEventListener('click', restart);

        showView('start');
      })
      .catch(function (err) {
        document.body.innerHTML =
          '<div style="padding:2rem;font-family:sans-serif;color:#b91c1c;max-width:480px;margin:2rem auto">' +
          '<h2 style="margin-bottom:.75rem">Error</h2>' +
          '<p>' + err.message + '</p>' +
          '</div>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
