/**
 * 第三章 · 图表2：豆瓣短评词云（女性剪影）
 */
(function (global) {
  'use strict';

  var C = global.SheDirectsChart;
  var T = C.tokens;
  var chart = null;
  var wordcloudData = null;
  var wordDetails = {};
  var resizeTimer = null;
  var rendering = false;
  var renderedOnce = false;
  var lastLayout = { width: 0, height: 0 };
  var activeWord = '';
  var MASK_ASPECT = 636 / 642;
  var WC_SCALE = 2;
  var FILL_WORD_COUNT = 160;
  var maskImageCache = null;

  function $(id) { return document.getElementById(id); }

  function initChart(domId) {
    var dom = $(domId);
    if (!dom) return null;
    return echarts.init(dom, 'she-directs', { renderer: 'canvas' });
  }

  function setSource(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function setInsight(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function wordColors() {
    return [
      T.inkCharcoal,
      T.inkRed,
      T.roseDeep,
      '#7a3348',
      '#8c3a3a',
      '#5c2e3a',
      T.inkNote,
      '#4a2820'
    ];
  }

  function expandWordsForFill(words, targetCount) {
    if (!words.length) return words;
    targetCount = targetCount || FILL_WORD_COUNT;
    if (words.length >= targetCount) return words.slice(0, targetCount);

    var sorted = words.slice().sort(function (a, b) { return b.value - a.value; });
    var out = words.slice();
    var pass = 0;

    while (out.length < targetCount) {
      var base = sorted[out.length % sorted.length];
      var layer = Math.floor(out.length / sorted.length);
      var scale = 0.5 + 0.5 * (base.value / (sorted[0].value || 1));
      out.push({
        name: base.name + '\u200b'.repeat(layer + 1),
        value: Math.max(4, Math.round(base.value * scale * (0.92 - layer * 0.04)))
      });
      pass += 1;
      if (pass > targetCount * 2) break;
    }
    return out;
  }

  function displayWord(name) {
    return String(name || '').replace(/\u200b/g, '');
  }

  function estimateFilmCount(value) {
    return Math.min(50, Math.max(4, Math.round(Math.sqrt(value) * 2.6 + 2)));
  }

  function resolveDetail(word, value) {
    var key = displayWord(word);
    var base = wordDetails[key];
    if (base) {
      return {
        word: key,
        value: value,
        filmCount: base.filmCount,
        topFilms: base.topFilms || [],
        quote: base.quote || null
      };
    }
    return {
      word: key,
      value: value,
      filmCount: estimateFilmCount(value),
      topFilms: [],
      quote: null
    };
  }

  function formatTopFilms(films) {
    if (!films || !films.length) return '—';
    return films.map(function (f) {
      return f.title + '(' + f.count + ')';
    }).join(' / ');
  }

  function renderDetailCard(detail, anchor) {
    var card = $('chart3-wordcloud-detail');
    var stage = document.querySelector('.wc-stage');
    if (!card || !stage) return;

    var quoteBlock = detail.quote
      ? '<blockquote class="wc-detail-quote">「' + detail.quote.text + '」<cite>—— ' + detail.quote.film + '</cite></blockquote>'
      : '';

    card.innerHTML =
      '<button type="button" class="wc-detail-close" aria-label="关闭">×</button>' +
      '<header class="wc-detail-head">' +
        '<strong class="wc-detail-word">' + detail.word + '</strong>' +
        '<span class="wc-detail-count">' + detail.value + ' 次</span>' +
      '</header>' +
      '<dl class="wc-detail-meta">' +
        '<div><dt>出现频次</dt><dd>' + detail.value + '</dd></div>' +
        '<div><dt>覆盖影片</dt><dd>' + detail.filmCount + ' 部</dd></div>' +
        '<div class="wc-detail-films"><dt>代表影片</dt><dd>' + formatTopFilms(detail.topFilms) + '</dd></div>' +
      '</dl>' +
      quoteBlock;

    card.hidden = false;
    card.classList.add('is-visible');

    var stageRect = stage.getBoundingClientRect();
    var cardW = Math.min(300, stageRect.width - 24);
    var left = stageRect.width / 2 - cardW / 2;
    var top = stageRect.height * 0.38;

    if (anchor && anchor.offsetX != null) {
      left = anchor.offsetX - cardW / 2;
      top = anchor.offsetY - 12;
    }

    left = Math.max(8, Math.min(left, stageRect.width - cardW - 8));
    top = Math.max(12, Math.min(top, stageRect.height - 40));

    card.style.width = cardW + 'px';
    card.style.left = left + 'px';
    card.style.top = top + 'px';

    var closeBtn = card.querySelector('.wc-detail-close');
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        hideDetailCard();
      };
    }
    card.onclick = function (e) { e.stopPropagation(); };
  }

  function hideDetailCard() {
    var card = $('chart3-wordcloud-detail');
    if (!card) return;
    card.hidden = true;
    card.classList.remove('is-visible');
    activeWord = '';
  }

  function showWordDetail(params) {
    if (!params || !params.name) return;
    var word = displayWord(params.name);
    if (activeWord === word) {
      hideDetailCard();
      return;
    }
    activeWord = word;
    var detail = resolveDetail(word, params.value);
    renderDetailCard(detail, params.event);
    setInsight(
      'chart3-wordcloud-insight',
      '<strong>「' + word + '」</strong> · 出现 ' + detail.value + ' 次 · 覆盖 ' + detail.filmCount + ' 部影片'
    );
  }

  function measureLayout(dom) {
    var rect = dom.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;

    if (w < 80 || h < 120) {
      var maxH = Math.min(window.innerHeight * 0.48, 480 * WC_SCALE);
      var maxW = Math.min(340 * WC_SCALE, window.innerWidth * 0.68);
      h = maxH;
      w = Math.min(maxW, Math.round(h * MASK_ASPECT));
      h = Math.round(w / MASK_ASPECT);
    }

    return { width: Math.round(w), height: Math.round(h) };
  }

  function loadEmbeddedMaskImage() {
    if (maskImageCache) {
      return Promise.resolve(maskImageCache);
    }
    var src = global.SHE_DIRECTS_WORDCLOUD_MASK;
    if (!src) {
      return Promise.reject(new Error('词云蒙版数据缺失'));
    }
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        maskImageCache = img;
        resolve(img);
      };
      img.onerror = function () { reject(new Error('蒙版加载失败')); };
      img.src = src;
    });
  }

  function getMaskImage() {
    return loadEmbeddedMaskImage();
  }

  function layoutChanged(layout) {
    return Math.abs(layout.width - lastLayout.width) > 4
      || Math.abs(layout.height - lastLayout.height) > 4;
  }

  function renderWordcloud(data) {
    var dom = $('chart3-wordcloud');
    if (!dom || rendering) return Promise.resolve();

    var layout = measureLayout(dom);
    if (layout.width < 80 || layout.height < 120) {
      return Promise.resolve();
    }

    if (renderedOnce && chart && !layoutChanged(layout)) {
      chart.resize();
      return Promise.resolve();
    }

    rendering = true;
    lastLayout = { width: layout.width, height: layout.height };

    return getMaskImage().then(function (maskImage) {
      if (!chart) {
        chart = initChart('chart3-wordcloud');
      }
      if (!chart) return;

      var words = expandWordsForFill((data.words || []).map(function (w) {
        return { name: w.name, value: w.value };
      }));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          show: true,
          trigger: 'item',
          formatter: function (p) {
            return displayWord(p.name) + ' · 词频 <strong>' + p.value + '</strong>';
          }
        },
        series: [{
          type: 'wordCloud',
          maskImage: maskImage,
          keepAspect: true,
          width: layout.width,
          height: layout.height,
          left: 'center',
          top: 'center',
          sizeRange: [Math.round(12 * WC_SCALE), Math.round(30 * WC_SCALE)],
          rotationRange: [-12, 12],
          rotationStep: 12,
          gridSize: Math.max(4, Math.round(10 / WC_SCALE)),
          shrinkToFit: true,
          drawOutOfBound: false,
          textStyle: {
            fontFamily: "'Huiwen', 'Noto Serif SC', serif",
            fontWeight: 'normal',
            color: function () {
              var palette = wordColors();
              return palette[Math.floor(Math.random() * palette.length)];
            }
          },
          emphasis: {
            focus: 'self',
            textStyle: { fontWeight: 'bold', color: T.inkCharcoal }
          },
          data: words
        }]
      }, true);

      chart.resize();
      renderedOnce = true;
      dom.classList.add('is-wordcloud-ready');

      setSource('chart3-wordcloud-source', data.source || '');
      setInsight(
        'chart3-wordcloud-insight',
        '点击词语查看出现频次、覆盖影片与短评摘录'
      );

      chart.off('mouseover');
      chart.off('click');
      chart.on('mouseover', function (params) {
        if (params.name) {
          setInsight(
            'chart3-wordcloud-insight',
            '<strong>「' + displayWord(params.name) + '」</strong> · 出现 ' + params.value + ' 次 · 点击查看详情'
          );
        }
      });
      chart.on('click', function (params) {
        showWordDetail(params);
      });

      var stage = document.querySelector('.wc-stage');
      if (stage && !stage.getAttribute('data-wc-bound')) {
        stage.setAttribute('data-wc-bound', '1');
        stage.addEventListener('click', function (e) {
          if (e.target === stage || e.target === dom) hideDetailCard();
        });
      }
    }).finally(function () {
      rendering = false;
    });
  }

  function scheduleRender() {
    if (!wordcloudData) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      renderWordcloud(wordcloudData).catch(function (err) {
        var dom = $('chart3-wordcloud');
        if (dom) {
          dom.innerHTML = '<div class="chart-error">词云加载失败<br>' + err.message + '</div>';
        }
      });
    }, 180);
  }

  function resize() {
    if (chart && renderedOnce) {
      renderedOnce = false;
      scheduleRender();
      return;
    }
    scheduleRender();
  }

  function initChapter03Wordcloud() {
    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) return;
    if (typeof echarts === 'undefined') return;
    C.registerSheDirectsTheme(echarts);

    global.SheDirectsStore.load('chapter03.wordcloud')
      .then(function (data) {
        wordcloudData = data;
        wordDetails = (data && data.details) || {};
        setTimeout(function () {
          scheduleRender();
        }, 50);
      })
      .catch(function (err) {
        var dom = $('chart3-wordcloud');
        if (dom) {
          dom.innerHTML = '<div class="chart-error">词云加载失败<br>' + err.message + '</div>';
        }
      });

    global.addEventListener('resize', resize, { passive: true });
  }

  global.Chapter03Wordcloud = { init: initChapter03Wordcloud, resize: resize };
})(typeof window !== 'undefined' ? window : this);
