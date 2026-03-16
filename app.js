(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    questions:    [],
    answers:      {},
    currentIndex: 0,
    meta:         {}
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const els = {
    title:            document.getElementById('app-title'),
    description:      document.getElementById('app-description'),
    progressBarWrap:  document.getElementById('progress-bar-wrap'),
    progressBar:      document.getElementById('progress-bar'),
    viewStart:        document.getElementById('view-start'),
    viewQuestion:     document.getElementById('view-question'),
    viewSummary:      document.getElementById('view-summary'),
    counter:          document.getElementById('question-counter'),
    questionText:     document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    summaryList:      document.getElementById('summary-list'),
    btnStart:         document.getElementById('btn-start'),
    btnRestart:       document.getElementById('btn-restart')
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
    var pct = total === 0 ? 0 : (state.currentIndex / total) * 100;
    els.progressBar.style.width = pct + '%';
    els.progressBarWrap.setAttribute('aria-valuenow', Math.round(pct));
  }

  // ── Question rendering ────────────────────────────────────────────────────
  function renderQuestion() {
    var q = state.questions[state.currentIndex];
    var total = state.questions.length;

    els.counter.textContent = 'Question ' + (state.currentIndex + 1) + ' of ' + total;
    els.questionText.textContent = q.text;

    els.optionsContainer.innerHTML = '';
    q.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      btn.setAttribute('aria-label', opt.label);
      btn.addEventListener('click', function () {
        handleAnswer(q.id, opt);
      });
      els.optionsContainer.appendChild(btn);
    });

    updateProgress();
  }

  // ── Answer recording ──────────────────────────────────────────────────────
  function handleAnswer(questionId, option) {
    // Disable all buttons immediately to prevent double-tap
    els.optionsContainer.querySelectorAll('.option-btn').forEach(function (b) {
      b.disabled = true;
    });

    state.answers[questionId] = {
      label: option.label,
      value: option.value
    };

    state.currentIndex++;

    // Brief delay lets the :active CSS style be perceived before advancing
    setTimeout(function () {
      if (state.currentIndex < state.questions.length) {
        renderQuestion();
      } else {
        showSummary();
      }
    }, 180);
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  function showSummary() {
    els.progressBar.style.width = '100%';
    els.progressBarWrap.setAttribute('aria-valuenow', 100);

    els.summaryList.innerHTML = '';

    state.questions.forEach(function (q, i) {
      var answer = state.answers[q.id];
      var li = document.createElement('li');

      var qEl = document.createElement('div');
      qEl.className = 'summary-question';
      qEl.textContent = (i + 1) + '. ' + q.text;

      var aEl = document.createElement('div');
      aEl.className = 'summary-answer';
      aEl.textContent = answer ? answer.label : '—';

      li.appendChild(qEl);
      li.appendChild(aEl);
      els.summaryList.appendChild(li);
    });

    showView('summary');
  }

  // ── Restart ───────────────────────────────────────────────────────────────
  function restart() {
    state.answers = {};
    state.currentIndex = 0;
    els.progressBar.style.width = '0%';
    showView('start');
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  function loadQuestions() {
    return fetch('./questions.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load questions.json (HTTP ' + res.status + ')');
        return res.json();
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
        state.meta = data.meta || {};
      });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    loadQuestions()
      .then(function () {
        document.title = state.meta.title || 'Survey';
        els.title.textContent = state.meta.title || 'Survey';
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
          '<div style="padding:2rem;font-family:sans-serif;color:#b91c1c;max-width:480px;margin:0 auto">' +
          '<h2 style="margin-bottom:.75rem">Could not load the survey</h2>' +
          '<p style="margin-bottom:.5rem">' + err.message + '</p>' +
          '<p style="color:#64748b;font-size:.875rem">This app must be served over HTTP.<br>' +
          'Run: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">python -m http.server 8080</code>' +
          ' then open <strong>localhost:8080</strong></p>' +
          '</div>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
