/**
 * 问题高亮逐笔划出 — 滚动触发，每次只画一笔
 */
(function (global) {
  'use strict';

  function initQuestionStroke() {
    var rail = document.querySelector('.copy-question-rail');
    if (!rail) return;

    var items = rail.querySelectorAll('.copy-question-list li');
    if (!items.length) return;

    var winH = window.innerHeight;
    var stroked = 0;

    function update() {
      var rect = rail.getBoundingClientRect();
      var totalH = rect.height;
      if (totalH <= 0) return;

      // rail 底边距离视口顶部的比例
      var bottomRatio = rect.bottom / winH;
      // rail 顶边离开视口的比例
      var topRatio = (winH - rect.top) / winH;

      // 从 rail 顶部进入视口底部开始算，每滚过 1/4 就多画一笔
      var progress = Math.max(0, Math.min(1, topRatio));
      var count = Math.floor(progress * items.length + 0.5);
      count = Math.max(0, Math.min(items.length, count));

      if (count !== stroked) {
        stroked = count;
        items.forEach(function (li, i) {
          if (i < count) {
            li.classList.add('is-stroked');
          } else {
            li.classList.remove('is-stroked');
          }
        });
      }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () {
      winH = window.innerHeight;
      update();
    }, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuestionStroke);
  } else {
    initQuestionStroke();
  }
})(typeof window !== 'undefined' ? window : this);
