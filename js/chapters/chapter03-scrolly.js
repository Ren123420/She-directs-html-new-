/**
 * Chapter 03 - box office x rating quadrant board
 * 象限切换：翻页按钮 + 散点点击（不再用 scrollama 占位滚动）
 */
(function (global) {
  'use strict';

  var instance = null;

  function initQuadrantPager() {
    var col = document.querySelector('#chapter03 .scatter-chart-col');
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
      if (instance && instance.cycleQuadrant) {
        instance.cycleQuadrant();
      } else if (global.QuadrantScatter && global.QuadrantScatter.cycleQuadrant) {
        global.QuadrantScatter.cycleQuadrant();
      }
      setTimeout(function () { col.classList.remove('is-quadrant-turn'); }, 560);
    });
  }

  function initChapter03() {
    var container = document.getElementById('quadrantScatterRoot');
    if (!container || !global.QuadrantScatter) return;

    instance = QuadrantScatter.init({
      container: '#quadrantScatterRoot',
      dataUrl: 'data/chapter03/boxoffice-rating-scatter.json',
      uiUrl: 'data/chapter03/quadrant-ui.json',
      defaultQuadrant: 'tr'
    });

    initQuadrantPager();

    if (global.SheDirectsInteraction) {
      SheDirectsInteraction.updateCoach();
    }
  }

  global.Chapter03 = { init: initChapter03 };
})(typeof window !== 'undefined' ? window : this);
