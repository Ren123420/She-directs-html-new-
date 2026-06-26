/**
 * 代际图 · sticky 场记板 + 便签文案随滚动上移放大
 */
(function (global) {
  'use strict';

  function initGenerationScrolly() {
    var steps = document.querySelectorAll('.gen-scrolly-step');
    var scrolly = document.querySelector('.gen-scrolly');
    var sticky = document.querySelector('.gen-scrolly-sticky');
    if (!steps.length || !scrolly || !sticky) return;

    function setStepState(el, state) {
      el.classList.toggle('is-active', state === 'active');
      el.classList.toggle('is-past', state === 'past');
    }

    function syncStickyHeight() {
      var h = sticky.offsetHeight;
      if (h > 0) {
        scrolly.style.setProperty('--gen-sticky-h', h + 'px');
      }
      if (global.echarts) {
        var chartEl = document.getElementById('chart2');
        if (chartEl) {
          var inst = echarts.getInstanceByDom(chartEl);
          if (inst) inst.resize();
        }
      }
    }

    function applyGenTextMotion(card, progress) {
      var t = Math.max(0, Math.min(1, progress));
      var lift = (t - 0.35) * 140;
      var scale = t <= 0.5
        ? 0.82 + (t / 0.5) * 0.28
        : 1.1 + ((t - 0.5) / 0.5) * 0.14;
      var opacity = Math.max(0.12, 1 - Math.abs(t - 0.42) * 1.3);
      card.style.transform = 'translateY(' + (-lift) + 'px) scale(' + scale.toFixed(3) + ')';
      card.style.opacity = String(opacity);
    }

    function clearGenTextMotion(card) {
      if (!card) return;
      card.style.transform = '';
      card.style.opacity = '';
    }

    syncStickyHeight();
    window.addEventListener('resize', syncStickyHeight, { passive: true });

    if (typeof scrollama === 'function') {
      var scroller = scrollama();

      scroller
        .setup({
          step: '.gen-scrolly-step',
          offset: 0.5,
          progress: true
        })
        .onStepEnter(function (resp) {
          setStepState(resp.element, 'active');
          resp.element.classList.add('is-driven');
          var card = resp.element.querySelector('.gen-text');
          if (card) applyGenTextMotion(card, resp.progress);
        })
        .onStepExit(function (resp) {
          resp.element.classList.remove('is-driven');
          clearGenTextMotion(resp.element.querySelector('.gen-text'));
          if (resp.direction === 'down') {
            setStepState(resp.element, 'past');
          } else {
            setStepState(resp.element, 'future');
          }
        })
        .onStepProgress(function (resp) {
          var card = resp.element.querySelector('.gen-text');
          if (!card || !resp.element.classList.contains('is-active')) return;
          applyGenTextMotion(card, resp.progress);
        });

      window.addEventListener('resize', function () {
        syncStickyHeight();
        scroller.resize();
      }, { passive: true });

      setTimeout(function () {
        syncStickyHeight();
        steps.forEach(function (step) {
          var rect = step.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.28) {
            setStepState(step, 'active');
          }
        });
        scroller.resize();
      }, 200);

      if (global.echarts) {
        var chartEl = document.getElementById('chart2');
        if (chartEl) {
          var inst = echarts.getInstanceByDom(chartEl);
          if (inst) {
            inst.on('finished', syncStickyHeight);
          }
        }
      }

      return;
    }

    /* 降级：IntersectionObserver */
    steps.forEach(function (step) {
      setStepState(step, 'future');
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
          setStepState(el, 'active');
        } else if (entry.boundingClientRect.top < 0) {
          setStepState(el, 'past');
        } else {
          setStepState(el, 'future');
        }
      });
    }, { threshold: [0, 0.35, 0.65] });

    steps.forEach(function (step) {
      observer.observe(step);
    });
  }

  global.GenerationScrolly = {
    init: initGenerationScrolly,
    syncHeight: function () {
      var scrolly = document.querySelector('.gen-scrolly');
      var sticky = document.querySelector('.gen-scrolly-sticky');
      if (!scrolly || !sticky) return;
      var h = sticky.offsetHeight;
      if (h > 0) scrolly.style.setProperty('--gen-sticky-h', h + 'px');
      if (global.echarts) {
        var chartEl = document.getElementById('chart2');
        if (chartEl) {
          var inst = echarts.getInstanceByDom(chartEl);
          if (inst) inst.resize();
        }
      }
    }
  };
})(typeof window !== 'undefined' ? window : this);
