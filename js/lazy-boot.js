/**
 * 首屏轻量启动 · 图表进入视口再初始化
 */
(function (global) {
  'use strict';

  var fired = Object.create(null);

  function runOnce(key, fn) {
    if (fired[key]) return;
    fired[key] = true;
    try {
      fn();
    } catch (err) {
      console.error('[lazy-boot]', key, err);
    }
  }

  function observe(selector, key, fn, rootMargin) {
    var el = document.querySelector(selector);
    if (!el) return;

    if (!('IntersectionObserver' in global)) {
      runOnce(key, fn);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        runOnce(key, fn);
      });
    }, {
      rootMargin: rootMargin || '280px 0px 280px 0px',
      threshold: 0.01
    });

    io.observe(el);
  }

  function bootLight() {
    if (global.SlateCards) global.SlateCards.init();
    if (global.SheDirectsBgm) global.SheDirectsBgm.init();
    if (global.SheDirectsNav) global.SheDirectsNav.init();
    if (global.HeroPosters) global.HeroPosters.init();
    if (global.SheDirectsInteraction) global.SheDirectsInteraction.init();
    if (global.SheDirectsScroll && global.SheDirectsScroll.ensureScrollNarrative) {
      global.SheDirectsScroll.ensureScrollNarrative({
        offset: 0.58,
        onStep: function (stepId) {
          if (stepId && String(stepId).indexOf('ch1') === 0
            && global.Chapter01 && global.Chapter01.resize) {
            global.Chapter01.resize();
          }
        }
      });
    }
  }

  function bootLazy() {
    observe('#prologue', 'prologue', function () {
      if (global.PrologueCollage) global.PrologueCollage.init();
    }, '360px 0px');

    observe('#chapter01', 'chapter01', function () {
      if (global.Chapter01) global.Chapter01.init();
      if (global.ChartFlipbook) global.ChartFlipbook.init();
      if (global.GenerationScrolly) global.GenerationScrolly.init();
    });

    observe('#chapter02-charts', 'chapter02', function () {
      if (global.Chapter02) global.Chapter02.init();
    });

    observe('#chapter03', 'chapter03', function () {
      if (global.HeroPosters && global.HeroPosters.initCaseCardMeta) {
        global.HeroPosters.initCaseCardMeta();
      }
      if (global.Chapter03) global.Chapter03.init();
    });

    observe('#chapter03-wordcloud', 'chapter03-wordcloud', function () {
      if (global.Chapter03Wordcloud) global.Chapter03Wordcloud.init();
    });

    observe('#chapter03-extra', 'chapter03-extra', function () {
      if (global.Chapter03Extra) global.Chapter03Extra.init();
    });

    observe('#chapter04-charts', 'chapter04', function () {
      if (global.Chapter04) global.Chapter04.init();
    });
  }

  function boot() {
    bootLight();
    bootLazy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.SheDirectsLazyBoot = { boot: boot };
})(typeof window !== 'undefined' ? window : this);
