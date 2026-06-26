/**
 * 问题高亮逐笔划出 — 滚动触发
 */
(function (global) {
  'use strict';

  function initQuestionStroke() {
    var rail = document.querySelector('.copy-question-rail');
    if (!rail) return;

    var items = rail.querySelectorAll('.copy-question-list li');
    if (!items.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var li = entry.target;
        if (entry.isIntersecting) {
          li.classList.add('is-stroked');
        } else {
          li.classList.remove('is-stroked');
        }
      });
    }, {
      threshold: 0.6
    });

    items.forEach(function (li) {
      observer.observe(li);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuestionStroke);
  } else {
    initQuestionStroke();
  }
})(typeof window !== 'undefined' ? window : this);
