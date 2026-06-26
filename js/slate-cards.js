/**
 * 场记板式卡片 · 点击打板动画
 */
(function (global) {
  'use strict';

  function initSlateCards() {
    document.querySelectorAll('.slate-card-interactive').forEach(function (card) {
      if (card.dataset.slateBound) return;
      card.dataset.slateBound = '1';

      function toggle() {
        card.classList.toggle('is-clapped');
      }

      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        toggle();
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  global.SlateCards = { init: initSlateCards };
})(typeof window !== 'undefined' ? window : this);
