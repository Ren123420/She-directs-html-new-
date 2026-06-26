/**
 * 滚动叙事引擎 · IntersectionObserver + scrollama.js
 * 每个 .scroll-step 进入视口时触发对应图表 step 回调
 */
(function (global) {
  'use strict';

  function initScrollNarrative(options) {
    var scroller = scrollama();
    var onStep = options.onStep || function () {};
    var onProgress = options.onProgress;
    var offset = options.offset != null ? options.offset : 0.55;

    scroller
      .setup({
        step: '.scroll-step',
        offset: offset,
        progress: !!onProgress
      })
      .onStepEnter(function (resp) {
        var el = resp.element;
        var stepId = el.getAttribute('data-step');
        el.classList.add('is-active');
        onStep(stepId, resp);
      })
      .onStepExit(function (resp) {
        resp.element.classList.remove('is-active');
      });

    if (onProgress) {
      scroller.onStepProgress(function (resp) {
        onProgress(resp.element.getAttribute('data-step'), resp.progress);
      });
    }

    function resize() {
      scroller.resize();
    }

    window.addEventListener('resize', resize, { passive: true });

    var refreshTimer = null;

    function activateVisibleSteps() {
      document.querySelectorAll('.scroll-step').forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08) {
          el.classList.add('is-active');
        }
      });
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        scroller.resize();
      }, 80);
    }

    /* 首屏已可见的 step 立即触发（避免滚不到就永远不渲染） */
    setTimeout(activateVisibleSteps, 120);
    window.addEventListener('load', activateVisibleSteps);
    window.addEventListener('hashchange', function () {
      setTimeout(activateVisibleSteps, 100);
    });

    return {
      resize: resize,
      refresh: activateVisibleSteps,
      destroy: function () {
        window.removeEventListener('resize', resize);
      }
    };
  }

  var scrollEngine = null;

  function ensureScrollNarrative(options) {
    if (scrollEngine) return scrollEngine;
    scrollEngine = initScrollNarrative(options || { offset: 0.58 });
    return scrollEngine;
  }

  /** 图表懒渲染：step 首次进入时 init */
  function createLazyCharts(chartDefs) {
    var rendered = {};
    return function onStep(stepId) {
      var def = chartDefs[stepId];
      if (!def || rendered[stepId]) return;
      rendered[stepId] = true;
      def();
    };
  }

  global.SheDirectsScroll = {
    initScrollNarrative: initScrollNarrative,
    ensureScrollNarrative: ensureScrollNarrative,
    createLazyCharts: createLazyCharts
  };
})(typeof window !== 'undefined' ? window : this);
