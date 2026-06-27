/**
 * 场记本翻页 · 胶片条导航 + 3D 翻面 + 键盘翻页
 */
(function (global) {
  'use strict';

  var STEPS = [
    { id: 'ch1-step1', num: '01', title: '占比', tag: 'CHART 01' },
    { id: 'ch1-step2', num: '02', title: '代际', tag: 'CHART 02' },
    { id: 'ch1-step3', num: '03', title: '地理', tag: 'CHART 03' },
    { id: 'ch1-step4', num: '04', title: '存续', tag: 'CHART 04' },
    { id: 'ch1-step5', num: '05', title: '路径', tag: 'CHART 05' }
  ];

  var BACK_CARDS = [
    {
      kicker: 'DATA NOTE · 三个十年',
      title: '占比从未稳定突破 10%',
      html: '<p>女导演活跃占比像一堵<strong>看得见的墙</strong>——点击年代卡片，正面图表会 zoom 到对应时期。</p>' +
        '<div class="back-stat-grid" data-era-grid>' +
        '<div class="back-stat-cell" data-era="2000s"><span class="num">5.8%</span><span class="lbl">2000–2009 均值</span></div>' +
        '<div class="back-stat-cell" data-era="2010s"><span class="num">7.2%</span><span class="lbl">2010–2019 均值</span></div>' +
        '<div class="back-stat-cell" data-era="2020s"><span class="num">9.1%</span><span class="lbl">2020–2026 均值</span></div>' +
        '</div>'
    },
    {
      kicker: 'DATA NOTE · 代际断层',
      title: '活跃率：女 60% vs 男 100%',
      html: '<p>90 后女导演活跃率约 <strong>60%</strong>，同期男导演接近 <strong>100%</strong>——不是代际更替，是结构性淘汰。</p>' +
        '<div class="back-bar-list">' +
        '<div class="back-bar-row"><span class="name">90后女</span><div class="track"><div class="fill" style="width:60%"></div></div><span class="val">60%</span></div>' +
        '<div class="back-bar-row"><span class="name">90后男</span><div class="track"><div class="fill" style="width:100%"></div></div><span class="val">100%</span></div>' +
        '<div class="back-bar-row"><span class="name">60后女</span><div class="track"><div class="fill" style="width:8%"></div></div><span class="val">≈0%</span></div>' +
        '</div>'
    },
    {
      kicker: 'DATA NOTE · 三地分布',
      title: '北京 · 台湾 · 香港',
      html: '<p>111 位女导演中，大陆 <strong>67</strong> 位、台湾 <strong>28</strong> 、香港 <strong>16</strong> 。产业资源决定起点。</p>' +
        '<div class="back-bar-list">' +
        '<div class="back-bar-row"><span class="name">北京</span><div class="track"><div class="fill" style="width:100%"></div></div><span class="val">11</span></div>' +
        '<div class="back-bar-row"><span class="name">台湾</span><div class="track"><div class="fill" style="width:100%"></div></div><span class="val">12</span></div>' +
        '<div class="back-bar-row"><span class="name">浙江</span><div class="track"><div class="fill" style="width:55%"></div></div><span class="val">6</span></div>' +
        '<div class="back-bar-row"><span class="name">四川</span><div class="track"><div class="fill" style="width:45%"></div></div><span class="val">5</span></div>' +
        '<div class="back-bar-row"><span class="name">香港</span><div class="track"><div class="fill" style="width:45%"></div></div><span class="val">5</span></div>' +
        '</div>'
    },
    {
      kicker: 'DATA NOTE · 生存线',
      title: '第二部，才是分水岭',
      html: '<p>能拍到第二部的不到六成；第五部仅 <strong>12.7%</strong>。第一部是入场券，第二部才是生存线。</p>' +
        '<div class="back-milestones">' +
        '<div class="back-milestone"><strong>≥ 第 1 部</strong> · 100%<span class="fill-bar"><i style="width:100%"></i></span></div>' +
        '<div class="back-milestone"><strong>≥ 第 2 部</strong> · 58.2%<span class="fill-bar"><i style="width:58%"></i></span></div>' +
        '<div class="back-milestone"><strong>≥ 第 3 部</strong> · 32.7%<span class="fill-bar"><i style="width:33%"></i></span></div>' +
        '<div class="back-milestone"><strong>≥ 第 5 部</strong> · 12.7%<span class="fill-bar"><i style="width:13%"></i></span></div>' +
        '</div>'
    },
    {
      kicker: 'DATA NOTE · 入行路径',
      title: '科班 → 过渡 → 投资',
      html: '<p>50 位代表性女导演最常见的三连路径：</p>' +
        '<ul class="back-path-list">' +
        '<li data-n="1"><strong>科班出身</strong> — 电影学院系谱仍是主通道</li>' +
        '<li data-n="2"><strong>行业内部过渡</strong> — 编剧、演员、助理导演转岗</li>' +
        '<li data-n="3"><strong>商业/机构投资</strong> — 首作资金多来自机构而非大厂晋升</li>' +
        '</ul>' +
        '<p style="margin-top:12px;font-size:11px;">非科班更依赖<strong>独立自筹</strong>，很少走「大厂内部晋升」。</p>'
    }
  ];

  var currentIndex = 0;
  var dockEl = null;
  var navigating = false;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getStepEls() {
    return STEPS.map(function (s) {
      return document.querySelector('#chapter01 .scroll-step[data-step="' + s.id + '"]');
    }).filter(Boolean);
  }

  function getActiveIndex() {
    var steps = getStepEls();
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].classList.contains('is-active')) return i;
    }
    return currentIndex;
  }

  function wrapChartFrames() {
    var frames = document.querySelectorAll('#chapter01 .chart-frame');
    frames.forEach(function (frame, i) {
      if (frame.closest('.chart-flip-shell')) return;

      var shell = document.createElement('div');
      shell.className = 'chart-flip-shell';
      shell.setAttribute('data-chart-index', String(i));

      var inner = document.createElement('div');
      inner.className = 'chart-flip-inner';

      var front = document.createElement('div');
      front.className = 'chart-face chart-face-front';

      var back = document.createElement('div');
      back.className = 'chart-face chart-face-back';
      var card = BACK_CARDS[i] || BACK_CARDS[0];
      back.innerHTML =
        '<div class="chart-back-card">' +
          '<p class="back-kicker">' + card.kicker + '</p>' +
          '<h4 class="back-title">' + card.title + '</h4>' +
          '<div class="back-body">' + card.html + '</div>' +
        '</div>';

      frame.parentNode.insertBefore(shell, frame);
      front.appendChild(frame);
      inner.appendChild(front);
      inner.appendChild(back);
      shell.appendChild(inner);

      if (i === 0) injectEraPager(front);
      bindBackInteractions(shell, i);
    });
  }

  function injectEraPager(frontFace) {
    var frame = frontFace.querySelector('.chart-frame');
    if (!frame || frame.querySelector('.chart-era-pager')) return;

    var pager = document.createElement('div');
    pager.className = 'chart-era-pager';
    pager.innerHTML =
      '<button type="button" data-era="2000s">2000</button>' +
      '<button type="button" data-era="2010s">2010</button>' +
      '<button type="button" data-era="2020s" class="is-active">2020</button>';

    var canvas = frame.querySelector('.chart-canvas');
    if (canvas) frame.insertBefore(pager, canvas);

    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-era]');
      if (!btn) return;
      pager.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      if (global.Chapter01 && global.Chapter01.setEra) {
        global.Chapter01.setEra(btn.getAttribute('data-era'));
      }
    });
  }

  function bindBackInteractions(shell, index) {
    if (index !== 0) return;
    var cells = shell.querySelectorAll('[data-era]');
    cells.forEach(function (cell) {
      cell.addEventListener('click', function () {
        var era = cell.getAttribute('data-era');
        shell.classList.remove('is-flipped');
        setTimeout(function () {
          if (global.Chapter01 && global.Chapter01.setEra) global.Chapter01.setEra(era);
          var pager = shell.querySelector('.chart-era-pager');
          if (pager) {
            pager.querySelectorAll('button').forEach(function (b) {
              b.classList.toggle('is-active', b.getAttribute('data-era') === era);
            });
          }
          if (global.Chapter01 && global.Chapter01.resize) global.Chapter01.resize();
        }, 380);
      });
    });
  }

  function buildDock() {
    if (document.getElementById('flipbookDock')) return;

    dockEl = document.createElement('div');
    dockEl.className = 'flipbook-dock';
    dockEl.id = 'flipbookDock';
    dockEl.innerHTML =
      '<span class="flipbook-hint">← → 翻页 · 点击胶片跳转</span>' +
      '<button type="button" class="flipbook-nav prev" aria-label="上一张">‹</button>' +
      '<div class="flipbook-reel" id="flipbookReel"></div>' +
      '<button type="button" class="flipbook-nav next" aria-label="下一张">›</button>' +
      '<span class="flipbook-counter" id="flipbookCounter">01 / 05</span>';

    document.body.appendChild(dockEl);

    var reel = document.getElementById('flipbookReel');
    STEPS.forEach(function (step, i) {
      var frame = document.createElement('button');
      frame.type = 'button';
      frame.className = 'flipbook-frame';
      frame.setAttribute('data-index', String(i));
      frame.innerHTML =
        '<span class="frame-num">' + step.num + '</span>' +
        '<span class="frame-title">' + step.title + '</span>';
      frame.addEventListener('click', function () { goToIndex(i, i > currentIndex ? 1 : -1); });
      reel.appendChild(frame);
    });

    dockEl.querySelector('.flipbook-nav.prev').addEventListener('click', function () {
      goToIndex(currentIndex - 1, -1);
    });
    dockEl.querySelector('.flipbook-nav.next').addEventListener('click', function () {
      goToIndex(currentIndex + 1, 1);
    });
  }

  function updateDock(index) {
    if (!dockEl) return;
    currentIndex = index;
    dockEl.querySelectorAll('.flipbook-frame').forEach(function (f, i) {
      f.classList.toggle('is-active', i === index);
    });
    var counter = document.getElementById('flipbookCounter');
    if (counter) counter.textContent = STEPS[index].num + ' / 05';
    dockEl.querySelector('.flipbook-nav.prev').disabled = index <= 0;
    dockEl.querySelector('.flipbook-nav.next').disabled = index >= STEPS.length - 1;
    var activeFrame = dockEl.querySelector('.flipbook-frame.is-active');
    if (activeFrame) activeFrame.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function goToIndex(index, direction) {
    if (navigating || index < 0 || index >= STEPS.length) return;
    var steps = getStepEls();
    var target = steps[index];
    if (!target) return;

    navigating = true;
    var prev = steps[currentIndex];
    direction = direction || (index > currentIndex ? 1 : -1);

    if (prev && prev !== target) {
      prev.classList.add(direction > 0 ? 'page-exit-up' : 'page-exit-down');
      setTimeout(function () {
        prev.classList.remove('page-exit-up', 'page-exit-down');
      }, 480);
    }

    target.classList.add('page-enter');
    setTimeout(function () { target.classList.remove('page-enter'); }, 560);

    updateDock(index);

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function () {
      navigating = false;
      if (global.Chapter01 && global.Chapter01.resize) global.Chapter01.resize();
    }, 650);
  }

  function syncDockVisibility() {
    if (!dockEl) return;
    var ch1 = document.getElementById('chapter01');
    if (!ch1) return;
    var r = ch1.getBoundingClientRect();
    var inView = r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.2;
    dockEl.classList.toggle('is-visible', inView);
    if (inView) updateDock(getActiveIndex());
  }

  function isChapter01InView() {
    var ch1 = document.getElementById('chapter01');
    if (!ch1) return false;
    var r = ch1.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.2;
  }

  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!isChapter01InView()) return;
      if (e.target.matches('input, textarea, select')) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToIndex(currentIndex + 1, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToIndex(currentIndex - 1, -1);
      } else if (e.key === 'f' || e.key === 'F') {
        var shell = document.querySelector('#chapter01 .scroll-step.is-active .chart-flip-shell');
        if (shell) {
          shell.classList.toggle('is-flipped');
          if (global.Chapter01 && global.Chapter01.resize) {
            setTimeout(function () { global.Chapter01.resize(); }, 400);
          }
        }
      }
    });
  }

  function observeSteps() {
    var observer = new MutationObserver(function () {
      if (dockEl && dockEl.classList.contains('is-visible')) {
        updateDock(getActiveIndex());
      }
    });
    document.querySelectorAll('#chapter01 .scroll-step').forEach(function (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function initQuadrantPager() {
    var col = document.querySelector('.scatter-chart-col');
    if (!col || col.querySelector('.quadrant-page-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quadrant-page-btn';
    btn.innerHTML = '<span>翻页 · 下一象限</span><span class="qp-arrow">→</span>';
    col.style.position = 'relative';
    col.appendChild(btn);

    btn.addEventListener('click', function () {
      col.classList.remove('is-quadrant-turn');
      void col.offsetWidth;
      col.classList.add('is-quadrant-turn');
      if (global.QuadrantScatter && global.QuadrantScatter.cycleQuadrant) {
        global.QuadrantScatter.cycleQuadrant();
      }
      setTimeout(function () { col.classList.remove('is-quadrant-turn'); }, 560);
    });
  }

  function init() {
    if (!document.getElementById('chapter01')) return;
    wrapChartFrames();
    bindKeyboard();
    observeSteps();
    setTimeout(initQuadrantPager, 1200);
  }

  global.ChartFlipbook = { init: init, goTo: goToIndex };
})(typeof window !== 'undefined' ? window : this);
