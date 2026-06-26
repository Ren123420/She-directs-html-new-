/**
 * 交互提示层 · 底部引导条、步骤进度、图表徽章
 */
(function (global) {
  'use strict';

  var COACH = {
    hero: { text: '悬停海报 · 点击查看豆瓣详情', step: '' },
    prologue: { text: '继续向下滚动 · 进入数据章节', step: '' },
    chapter01: { text: '← → 翻页 · F 翻面 · 悬停图表', stepPrefix: 'CHART ' },
    chapter03: { text: '滚动高亮象限 · 点击散点翻书', stepPrefix: 'STEP ' },
    default: { text: '继续向下滚动探索', step: '' }
  };

  var ch1Steps = ['ch1-step1', 'ch1-step2', 'ch1-step3', 'ch1-step4', 'ch1-step5'];
  var ch3Steps = ['ch3-all', 'ch3-tr', 'ch3-tl', 'ch3-br', 'ch3-bl'];

  function initInteractionHints() {
    injectCoachBar();
    injectScrollNudge();
    injectChartBadges();
    injectScatterHint();
    bindScrollUpdates();
    bindChartDismiss();
  }

  function injectCoachBar() {
    if (document.getElementById('ixCoach')) return;
    var bar = document.createElement('div');
    bar.className = 'ix-coach-bar';
    bar.id = 'ixCoach';
    bar.innerHTML =
      '<span class="ix-coach-pulse"></span>' +
      '<span class="ix-coach-text" id="ixCoachText">继续向下滚动探索</span>' +
      '<span class="ix-coach-step" id="ixCoachStep"></span>';
    document.body.appendChild(bar);
  }

  function injectScrollNudge() {
    if (document.getElementById('ixScrollNudge')) return;
    var nudge = document.createElement('div');
    nudge.className = 'ix-scroll-nudge';
    nudge.id = 'ixScrollNudge';
    nudge.innerHTML = '<span class="ix-nudge-arrow">↓</span><span>滚动</span>';
    document.body.appendChild(nudge);
  }

  function injectChartBadges() {
    document.querySelectorAll('.chart-frame').forEach(function (frame) {
      if (frame.querySelector('.ix-chart-badge')) return;
      var badge = document.createElement('div');
      badge.className = 'ix-chart-badge';
      badge.innerHTML = '<span class="ix-badge-dot"></span> INTERACTIVE · 悬停查看';
      frame.appendChild(badge);
    });
  }

  function injectScatterHint() {
    var col = document.querySelector('.scatter-chart-col');
    if (!col || col.querySelector('.ix-scatter-hint')) return;
    var hint = document.createElement('div');
    hint.className = 'ix-scatter-hint';
    hint.id = 'ixScatterHint';
    hint.innerHTML =
      '<span class="ix-hint-hand">👆</span>' +
      '<span class="ix-hint-text">点击散点翻开影片档案</span>' +
      '<span class="ix-hint-sub">悬停预览 · 点击固定 FILM NOTEBOOK</span>';
    col.appendChild(hint);
  }

  function getActiveStep(selector) {
    var active = document.querySelector(selector + '.is-active');
    return active ? active.getAttribute('data-step') : null;
  }

  function updateCoach() {
    var coach = document.getElementById('ixCoach');
    var textEl = document.getElementById('ixCoachText');
    var stepEl = document.getElementById('ixCoachStep');
    var nudge = document.getElementById('ixScrollNudge');
    if (!coach || !textEl) return;

    var hero = document.getElementById('hero');
    var heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
    var nearBottom = window.innerHeight - document.documentElement.scrollHeight + window.scrollY < 80;

    if (nearBottom) {
      coach.classList.add('is-hidden');
      if (nudge) nudge.classList.add('is-hidden');
      return;
    }
    coach.classList.remove('is-hidden');

    var section = 'default';
    var stepLabel = '';

    if (heroBottom > window.innerHeight * 0.5) {
      section = 'hero';
    } else {
      var ids = ['chapter03', 'chapter01', 'prologue'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (!el) continue;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.15) {
          section = ids[i];
          break;
        }
      }
    }

    var cfg = COACH[section] || COACH.default;
    textEl.textContent = cfg.text;

    if (section === 'chapter01') {
      var s1 = getActiveStep('#chapter01 .scroll-step');
      if (s1) {
        var i1 = ch1Steps.indexOf(s1);
        stepLabel = (i1 >= 0 ? (i1 + 1) : 1) + ' / 5';
      }
    } else if (section === 'chapter03') {
      var s3 = getActiveStep('#chapter03 .scrolly-step');
      if (s3) {
        var i3 = ch3Steps.indexOf(s3);
        stepLabel = (i3 >= 0 ? (i3 + 1) : 1) + ' / 5';
        flashScrollyGraphic();
      }
    }

    if (stepEl) {
      stepEl.textContent = stepLabel;
      stepEl.style.display = stepLabel ? '' : 'none';
    }

    if (nudge) {
      nudge.classList.toggle('is-hidden', section === 'hero' && heroBottom < 100);
    }
  }

  function flashScrollyGraphic() {
    var g = document.querySelector('.scrolly-graphic');
    if (!g) return;
    g.classList.remove('is-updating');
    void g.offsetWidth;
    g.classList.add('is-updating');
    setTimeout(function () { g.classList.remove('is-updating'); }, 650);
  }

  function bindScrollUpdates() {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateCoach();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    var observer = new MutationObserver(function () { updateCoach(); });
    document.querySelectorAll('.scroll-step, .scrolly-step').forEach(function (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });

    setTimeout(updateCoach, 500);
    setInterval(updateCoach, 2000);
  }

  function bindChartDismiss() {
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('.chart-canvas') || e.target.closest('.scatter-canvas')) {
        var frame = e.target.closest('.chart-frame');
        if (frame) {
          var badge = frame.querySelector('.ix-chart-badge');
          if (badge) badge.classList.add('is-dismissed');
        }
      }
    }, true);

    document.addEventListener('click', function () {
      var hint = document.getElementById('ixScatterHint');
      if (hint) hint.classList.add('is-gone');
    });

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('.scatter-canvas')) {
        var hint = document.getElementById('ixScatterHint');
        if (hint) hint.classList.add('is-gone');
      }
    }, true);
  }

  global.SheDirectsInteraction = { init: initInteractionHints, updateCoach: updateCoach };
})(typeof window !== 'undefined' ? window : this);
