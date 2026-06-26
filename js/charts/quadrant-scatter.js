/**
 * She Directs - box office x rating quadrant scatter
 * Loads Chinese UI strings from data/chapter03/quadrant-ui.json
 */
(function (global) {
  'use strict';

  var C = {
    canvas: '#f4efe4',
    roseMain: '#e080a0',
    roseLight: '#e0a0c0',
    roseDeep: '#c06078',
    charcoal: '#2c2416',
    note: '#6b5e4a',
    archive: '#e0d8c8',
    dotMuted: '#b5aea4'
  };

  var FONT = "'Punk Typewriter', 'Courier New', monospace";
  var FONT_CN = "'Huiwen', 'Noto Serif SC', 'STSong', serif";
  var UI = null;
  var scatterPosters = {};

  function wanToYi(wan) {
    return wan / 10000;
  }

  function formatYi(yi) {
    if (!UI) return String(yi);
    if (yi >= 1) return yi.toFixed(yi >= 10 ? 0 : 2) + ' ' + UI.yiUnit;
    if (yi >= 0.01) return yi.toFixed(2) + ' ' + UI.yiUnit;
    return (yi * 10000).toFixed(0) + ' ' + UI.wanUnit;
  }

  function doubanUrl(film) {
    if (!film) return '';
    if (film.url) return film.url;
    var id = film.doubanId ? String(film.doubanId) : '';
    if (id) return 'https://movie.douban.com/subject/' + id + '/';
    return '';
  }

  function posterUrl(film) {
    if (!film) return '';
    var id = film.doubanId ? String(film.doubanId) : '';
    var slug = (film.title || '').replace(/\s/g, '');
    if (id && scatterPosters[id]) return scatterPosters[id];
    if (slug && scatterPosters[slug]) return scatterPosters[slug];
    if (id) return 'assets/posters/scatter/' + id + '.jpg';
    if (slug) return 'assets/posters/scatter/' + slug + '.jpg';
    return '';
  }

  function getQuadrant(film, th) {
    var yi = wanToYi(film.boxOfficeWan);
    var hb = yi >= th.boxOfficeYi;
    var hr = film.rating >= th.rating;
    if (hb && hr) return 'tr';
    if (!hb && hr) return 'tl';
    if (!hb && !hr) return 'bl';
    return 'br';
  }

  function quadrantLabel(q) {
    return (UI && UI.quadrants && UI.quadrants[q]) ? UI.quadrants[q] : q.toUpperCase();
  }

  function createQuadrantScatter(options) {
    var root = typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container;
    if (!root) return null;

    var board = root.querySelector('.quadrant-scatter-board') || root;
    var canvasEl = board.querySelector('.scatter-canvas') || board.querySelector('[data-scatter-canvas]');
    var footnoteEl = board.querySelector('.scatter-footnote');
    var filmCard = root.querySelector('.film-file-card') || board.querySelector('.film-file-card');
    var sideQuadrantLabel = root.querySelector('.side-quadrant-label');
    var sideQuadrantTag = root.querySelector('[data-side-quadrant-tag]');
    var sideCopy = root.querySelector('.scatter-side-panel .side-copy') || root.querySelector('.side-copy');
    var sideCaseSlot = root.querySelector('.side-case-slot');

    if (!canvasEl) return null;

    var chart = echarts.init(canvasEl, null, { renderer: 'canvas' });
    var state = {
      pinned: false,
      pinnedIdx: -1,
      payload: null,
      activeQuadrant: options.defaultQuadrant || 'all'
    };

    function ensureFilmCard() {
      if (filmCard) return;
      filmCard = document.createElement('div');
      filmCard.className = 'film-file-card';
      var slot = root.querySelector('.scatter-notebook-slot')
        || board.querySelector('.scatter-notebook-slot')
        || root.querySelector('.scatter-side-panel');
      if (slot) slot.appendChild(filmCard);
      renderEmptyNotebook();
    }

    function notebookShell(innerClass, innerHTML, open, pinned) {
      var cls = 'film-notebook' + (open ? ' is-open' : '') + (pinned ? ' is-pinned' : '');
      return (
        '<div class="' + cls + '">' +
          '<aside class="fn-spine"><span>' + UI.spineText + '</span></aside>' +
          '<div class="fn-page">' +
            '<div class="fn-tape"></div>' +
            innerHTML +
          '</div>' +
        '</div>'
      );
    }

    function renderEmptyNotebook() {
      if (!filmCard || !UI) return;
      filmCard.innerHTML = notebookShell('', (
        '<div class="fn-cover">' +
          '<p class="fn-kicker">' + UI.notebookLabel + '</p>' +
          '<h4 class="fn-invite">' + UI.inviteTitle + '</h4>' +
          '<p class="fn-hint">' + UI.inviteHint + '</p>' +
        '</div>'
      ), false, false);
    }

    function buildFilmCardHTML(film, pinned) {
      var q = getQuadrant(film, state.payload.thresholds);
      var yi = wanToYi(film.boxOfficeWan);
      var url = posterUrl(film);
      var metaLine = UI.metaLine
        .replace('{director}', film.director || '')
        .replace('{year}', film.year || '');
      var statsLine = UI.statsLine
        .replace('{rating}', film.rating)
        .replace('{boxOffice}', formatYi(yi));

      var posterSticky = url
        ? '<div class="fn-sticky fn-sticky-poster"><img src="' + url + '" alt="" referrerpolicy="no-referrer"></div>'
        : '<div class="fn-sticky fn-sticky-poster"><div class="fn-poster-fb">' + film.title + '</div></div>';

      var inner = (
        '<div class="fn-cover">' +
          '<p class="fn-kicker">' + UI.notebookLabel + '</p>' +
          '<h4 class="fn-invite">' + UI.inviteTitle + '</h4>' +
          '<p class="fn-hint">' + UI.inviteHint + '</p>' +
        '</div>' +
        '<div class="fn-inner">' +
          '<p class="fn-kicker">' + UI.fileLabel + '</p>' +
          '<h4 class="fn-title">' + film.title + '</h4>' +
          '<p class="fn-meta">' + metaLine + '</p>' +
          '<p class="fn-stats">' + statsLine + '</p>' +
          '<p class="fn-quadrant">' + quadrantLabel(q) + '</p>' +
          '<div class="fn-stickies">' +
            posterSticky +
            '<div class="fn-sticky fn-sticky-note">' +
              '<span class="fn-sticky-label">' + UI.stickyDirector + '</span>' +
              '<span class="fn-sticky-val">' + film.director + '</span>' +
            '</div>' +
            '<div class="fn-sticky fn-sticky-note">' +
              '<span class="fn-sticky-label">' + UI.stickyRating + '</span>' +
              '<span class="fn-sticky-val">' + film.rating + '</span>' +
            '</div>' +
            '<div class="fn-sticky fn-sticky-note">' +
              '<span class="fn-sticky-label">' + UI.stickyBox + '</span>' +
              '<span class="fn-sticky-val">' + formatYi(yi) + '</span>' +
            '</div>' +
          '</div>' +
          (doubanUrl(film)
            ? '<a class="fn-btn" href="' + doubanUrl(film) + '" target="_blank" rel="noopener">' + UI.openDouban + '</a>'
            : '<span class="fn-btn disabled">' + UI.noLink + '</span>') +
        '</div>'
      );

      return notebookShell('', inner, true, pinned);
    }

    function updateFilmCard(film, pinned) {
      ensureFilmCard();
      filmCard.innerHTML = buildFilmCardHTML(film, pinned);
      var img = filmCard.querySelector('.fn-sticky-poster img');
      if (img) {
        img.onerror = function () {
          var wrap = img.parentElement;
          if (wrap) wrap.innerHTML = '<div class="fn-poster-fb">' + film.title + '</div>';
        };
      }
    }

    function clearFilmCard() {
      if (!filmCard) return;
      renderEmptyNotebook();
    }

    function buildGraphic(th, activeQ) {
      var opt = chart.getOption();
      if (!opt || !opt.xAxis) return [];

      var xMin = opt.xAxis[0].min;
      var xMax = opt.xAxis[0].max;
      var yMin = opt.yAxis[0].min;
      var yMax = opt.yAxis[0].max;

      var px = function (x, y) {
        return [
          chart.convertToPixel({ xAxisIndex: 0 }, x),
          chart.convertToPixel({ yAxisIndex: 0 }, y)
        ];
      };

      var pTL = px(xMin, yMax);
      var pTR = px(xMax, yMax);
      var pBL = px(xMin, yMin);
      var pMedX = chart.convertToPixel({ xAxisIndex: 0 }, th.boxOfficeYi);
      var pMedY = chart.convertToPixel({ yAxisIndex: 0 }, th.rating);

      var xL = pTL[0], xR = pTR[0], yT = pTL[1], yB = pBL[1];

      var QUADRANT_FILL = {
        tl: 'rgba(224,216,200,0.35)',
        tr: 'rgba(224,128,160,0.12)',
        bl: 'rgba(180,174,164,0.18)',
        br: 'rgba(192,96,120,0.14)'
      };

      var labelBox = function (qKey, text, x, y, align, highlight) {
        var w = 108;
        var h = 28;
        var lx = align === 'right' ? x - w - 8 : x + 8;
        var ly = y + 8;
        return {
          type: 'group',
          silent: false,
          name: 'quadrant-label-' + qKey,
          cursor: 'pointer',
          children: [
            {
              type: 'rect',
              shape: { x: lx, y: ly, width: w, height: h, r: 1 },
              style: {
                fill: highlight ? 'rgba(224,128,160,0.18)' : 'rgba(244,239,228,0.82)',
                stroke: highlight ? C.roseDeep : C.archive,
                lineWidth: highlight ? 1.5 : 1
              }
            },
            {
              type: 'text',
              style: {
                text: text,
                x: lx + w / 2,
                y: ly + h / 2,
                fill: highlight ? C.roseDeep : C.note,
                font: (highlight ? 'bold ' : '') + '9px ' + FONT_CN,
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            }
          ]
        };
      };

      var quadRect = function (qKey, x1, y1, x2, y2) {
        var on = activeQ === 'all' || activeQ === qKey;
        return {
          type: 'rect',
          name: 'quadrant-hit-' + qKey,
          silent: false,
          cursor: 'pointer',
          shape: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
          style: {
            fill: on ? QUADRANT_FILL[qKey] : 'rgba(244,239,228,0)',
            stroke: 'transparent'
          },
          z: 0
        };
      };

      var quadGlow = function (qKey, x1, y1, x2, y2) {
        if (activeQ !== qKey) return null;
        var cx = (x1 + x2) / 2;
        var cy = (y1 + y2) / 2;
        var r = Math.min(x2 - x1, y2 - y1) * 0.38;
        return {
          type: 'circle',
          silent: true,
          shape: { cx: cx, cy: cy, r: r },
          style: {
            fill: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(224,128,160,0.28)' },
                { offset: 0.55, color: 'rgba(224,128,160,0.08)' },
                { offset: 1, color: 'rgba(224,128,160,0)' }
              ]
            }
          },
          z: 0
        };
      };

      var glows = ['tl', 'tr', 'bl', 'br'].map(function (q) {
        var rects = {
          tl: [xL, yT, pMedX, pMedY],
          tr: [pMedX, yT, xR, pMedY],
          bl: [xL, pMedY, pMedX, yB],
          br: [pMedX, pMedY, xR, yB]
        };
        var r = rects[q];
        return quadGlow(q, r[0], r[1], r[2], r[3]);
      }).filter(Boolean);

      return glows.concat([
        quadRect('tl', xL, yT, pMedX, pMedY),
        quadRect('tr', pMedX, yT, xR, pMedY),
        quadRect('bl', xL, pMedY, pMedX, yB),
        quadRect('br', pMedX, pMedY, xR, yB),
        {
          type: 'line', silent: true,
          shape: { x1: pMedX, y1: yT, x2: pMedX, y2: yB },
          style: { stroke: C.archive, lineWidth: 1, lineDash: [5, 5] }
        },
        {
          type: 'line', silent: true,
          shape: { x1: xL, y1: pMedY, x2: xR, y2: pMedY },
          style: { stroke: C.archive, lineWidth: 1, lineDash: [5, 5] }
        },
        labelBox('tl', quadrantLabel('tl'), xL, yT, 'left', activeQ === 'tl'),
        labelBox('tr', quadrantLabel('tr'), xR, yT, 'right', activeQ === 'tr'),
        labelBox('bl', quadrantLabel('bl'), xL, yB - 36, 'left', activeQ === 'bl'),
        labelBox('br', quadrantLabel('br'), xR, yB - 36, 'right', activeQ === 'br')
      ]);
    }

    function refreshScatterColors() {
      if (!state.payload) return;
      var th = state.payload.thresholds;
      var activeQ = state.activeQuadrant;
      var labelTitles = {};

      if (activeQ !== 'all') {
        state.payload.films
          .filter(function (f) { return getQuadrant(f, th) === activeQ; })
          .sort(function (a, b) { return b.boxOfficeWan - a.boxOfficeWan; })
          .slice(0, 8)
          .forEach(function (f) { labelTitles[f.title] = true; });
      } else {
        state.payload.films
          .filter(function (f) { return getQuadrant(f, th) === 'br'; })
          .sort(function (a, b) { return b.boxOfficeWan - a.boxOfficeWan; })
          .slice(0, 4)
          .forEach(function (f) { labelTitles[f.title] = true; });
      }

      var scatterData = state.payload.films.map(function (f, i) {
        var q = getQuadrant(f, th);
        var yi = wanToYi(f.boxOfficeWan);
        var isActive = activeQ === 'all' || activeQ === q;
        var isHighlight = q === 'br' && (activeQ === 'br' || activeQ === 'all');
        var isTR = q === 'tr' && activeQ === 'tr';
        var showLabel = labelTitles[f.title];

        var dotColor = C.dotMuted;
        var dotSize = 5;
        var dotOpacity = isActive ? 0.55 : 0.18;

        if (isHighlight) {
          dotColor = C.roseDeep;
          dotSize = yi >= 10 ? 9 : 7;
          dotOpacity = 0.92;
        } else if (isTR) {
          dotColor = C.roseMain;
          dotSize = yi >= 10 ? 9 : 7;
          dotOpacity = 0.92;
        } else if (isActive && activeQ !== 'all') {
          dotColor = q === 'tl' ? C.charcoal : (q === 'bl' ? C.note : C.roseDeep);
          dotSize = 6;
          dotOpacity = 0.82;
        } else if (isActive && q === 'tl') {
          dotColor = C.charcoal;
          dotOpacity = 0.72;
        }

        return {
          value: [yi, f.rating],
          symbolSize: dotSize,
          itemStyle: {
            color: dotColor,
            borderColor: isHighlight || isTR ? C.roseDeep : 'transparent',
            borderWidth: isHighlight || isTR ? 1 : 0,
            opacity: dotOpacity
          },
          label: showLabel ? {
            show: true,
            formatter: f.title,
            position: 'top',
            distance: 4,
            fontFamily: FONT_CN,
            fontSize: 9,
            color: C.charcoal
          } : { show: false },
          emphasis: {
            scale: 1.8,
            itemStyle: {
              color: C.roseDeep,
              borderColor: C.charcoal,
              borderWidth: 1.5,
              shadowBlur: 6,
              shadowColor: 'rgba(192,96,120,0.4)'
            }
          },
          _index: i,
          _film: f
        };
      });

      chart.setOption({ series: [{ data: scatterData }] });
      chart.setOption({ graphic: buildGraphic(th, activeQ) });
    }

    function render(payload) {
      state.payload = payload;
      var th = payload.thresholds;

      if (footnoteEl && UI.footnote) {
        footnoteEl.textContent = UI.footnote
          .replace('{total}', payload.totalSample || payload.films.length)
          .replace('{valid}', payload.films.length)
          .replace('{ratingMed}', th.rating)
          .replace('{ratingMean}', th.ratingMean || th.rating)
          .replace('{boxMed}', th.boxOfficeYi);
      }

      var maxYi = Math.max.apply(null, payload.films.map(function (f) { return wanToYi(f.boxOfficeWan); }));

      chart.setOption({
        backgroundColor: C.canvas,
        animationDuration: 700,
        grid: { left: 52, right: 20, top: 28, bottom: 56 },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
          {
            type: 'slider',
            xAxisIndex: 0,
            height: 16,
            bottom: 6,
            borderColor: C.archive,
            fillerColor: 'rgba(224,128,160,0.25)',
            handleStyle: { color: C.roseMain },
            textStyle: { fontFamily: FONT, fontSize: 9, color: C.note }
          }
        ],
        xAxis: {
          type: 'log',
          name: UI.xAxis,
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { fontFamily: FONT_CN, fontSize: 10, color: C.note },
          min: 0.001,
          max: Math.max(maxYi * 1.3, 10),
          axisLine: { lineStyle: { color: C.archive } },
          axisTick: { show: false },
          axisLabel: {
            fontFamily: FONT,
            fontSize: 9,
            color: C.note,
            formatter: function (v) { return String(v); }
          },
          splitLine: { show: true, lineStyle: { color: C.archive, type: 'dashed', opacity: 0.7 } }
        },
        yAxis: {
          type: 'value',
          name: UI.yAxis,
          nameTextStyle: { fontFamily: FONT_CN, fontSize: 10, color: C.note },
          min: 4,
          max: 9,
          interval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { fontFamily: FONT, fontSize: 9, color: C.note },
          splitLine: { lineStyle: { color: C.archive, type: 'dashed', opacity: 0.7 } }
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(44,36,22,0.92)',
          borderColor: C.roseMain,
          textStyle: { fontFamily: FONT, fontSize: 11, color: '#f4efe4' },
          formatter: function (p) {
            if (!p.data || !p.data._film) return '';
            var f = p.data._film;
            var yi = wanToYi(f.boxOfficeWan);
            return f.title + '<br/>' + f.director + ' · ' + f.year +
              '<br/>豆瓣 ' + f.rating + ' · 票房 ' + formatYi(yi) +
              '<br/><span style="opacity:0.7">点击圆点固定详情</span>';
          }
        },
        series: [{ type: 'scatter', data: [], z: 3 }]
      }, true);

      refreshScatterColors();
      ensureFilmCard();
      clearFilmCard();
      var initNarrative = (UI.narratives || {})[state.activeQuadrant] || (UI.narratives || {}).all;
      if (initNarrative) selectQuadrant(state.activeQuadrant);
    }

    function applyQuadrantNarrative(q, narrative, options) {
      options = options || {};
      state.activeQuadrant = q || 'all';
      refreshScatterColors();
      if (narrative) {
        if (sideQuadrantLabel) {
          sideQuadrantLabel.textContent = (q === 'all' || !q)
            ? '票房—评分四象限散点图'
            : (narrative.title || quadrantLabel(q));
        }
        if (sideQuadrantTag) {
          if (q && q !== 'all') {
            sideQuadrantTag.textContent = quadrantLabel(q);
            sideQuadrantTag.hidden = false;
          } else {
            sideQuadrantTag.textContent = '';
            sideQuadrantTag.hidden = true;
          }
        }
        if (sideCopy && narrative.copy) sideCopy.innerHTML = narrative.copy;
      }
      if (options.clearCase && sideCaseSlot) sideCaseSlot.innerHTML = '';
      if (!options.keepFilmCard && !state.pinned) clearFilmCard();
    }

    function focusFilmQuadrant(film, options) {
      if (!film || !state.payload) return;
      var q = getQuadrant(film, state.payload.thresholds);
      var narrative = (UI.narratives || {})[q];
      if (narrative) {
        applyQuadrantNarrative(q, narrative, Object.assign({ keepFilmCard: true, clearCase: true }, options));
      } else {
        state.activeQuadrant = q;
        refreshScatterColors();
      }
    }

    function syncSideCaseForQuadrant(q) {
      if (!root || !sideCaseSlot) return;
      var step = root.querySelector('.scrolly-steps--quadrant [data-quadrant="' + q + '"]');
      if (step) syncSideCaseFromStep(step);
      else sideCaseSlot.innerHTML = '';
    }

    function parseQuadrantGraphicName(name) {
      if (!name) return null;
      if (name.indexOf('quadrant-hit-') === 0) return name.slice('quadrant-hit-'.length);
      if (name.indexOf('quadrant-label-') === 0) return name.slice('quadrant-label-'.length);
      return null;
    }

    function selectQuadrant(q) {
      if (!UI) return;
      var key = q || 'all';
      var narrative = (UI.narratives || {})[key];
      if (!narrative) return;

      state.pinned = false;
      state.pinnedIdx = -1;
      applyQuadrantNarrative(key, narrative, {});
      syncSideCaseForQuadrant(key);
      clearFilmCard();
    }

    function highlightQuadrant(q, narrative) {
      var key = q || 'all';
      var n = narrative || (UI && UI.narratives ? UI.narratives[key] : null);
      if (!n) return;
      applyQuadrantNarrative(key, n, {});
      syncSideCaseForQuadrant(key);
    }

    function syncSideCaseFromStep(stepEl) {
      if (!sideCaseSlot || !stepEl) return;
      var caseCard = stepEl.querySelector('.case-card');
      sideCaseSlot.innerHTML = caseCard ? caseCard.outerHTML : '';
    }

    function pinFilmByTitle(title) {
      if (!state.payload) return;
      var film = state.payload.films.find(function (f) { return f.title === title; });
      if (film) {
        state.pinned = true;
        state.pinnedIdx = state.payload.films.indexOf(film);
        focusFilmQuadrant(film);
        updateFilmCard(film, true);
      }
    }

    chart.on('mouseover', function (params) {
      if (params.componentType !== 'series' || state.pinned) return;
      var film = params.data._film;
      focusFilmQuadrant(film);
      updateFilmCard(film, false);
    });

    chart.on('click', function (params) {
      if (params.componentType === 'graphic') {
        var gName = params.name
          || (params.event && params.event.target && params.event.target.name)
          || (params.target && params.target.name);
        var gq = parseQuadrantGraphicName(gName);
        if (gq) {
          selectQuadrant(gq);
          return;
        }
      }
      if (params.componentType !== 'series') return;
      var idx = params.data._index;
      if (state.pinned && state.pinnedIdx === idx) {
        state.pinned = false;
        state.pinnedIdx = -1;
        clearFilmCard();
        return;
      }
      state.pinned = true;
      state.pinnedIdx = idx;
      focusFilmQuadrant(params.data._film);
      updateFilmCard(params.data._film, true);
    });

    chart.getZr().on('click', function (e) {
      if (!state.payload) return;

      var el = e.target;
      while (el) {
        var gq = parseQuadrantGraphicName(el.name);
        if (gq) {
          selectQuadrant(gq);
          return;
        }
        el = el.parent;
      }

      if (!e.target && state.pinned) {
        state.pinned = false;
        state.pinnedIdx = -1;
        clearFilmCard();
        return;
      }

      if (e.target && e.target.__ecComponentInfo) return;

      if (chart.containPixel({ seriesIndex: 0 }, [e.offsetX, e.offsetY])) return;

      var pt = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [e.offsetX, e.offsetY]);
      if (pt && isFinite(pt[0]) && isFinite(pt[1])) {
        var th = state.payload.thresholds;
        var q = getQuadrant({ boxOfficeWan: pt[0] * 10000, rating: pt[1] }, th);
        selectQuadrant(q);
      }
    });

    chart.on('globalout', function () {
      if (!state.pinned) clearFilmCard();
    });

    function onResize() {
      chart.resize();
      if (state.payload) {
        chart.setOption({ graphic: buildGraphic(state.payload.thresholds, state.activeQuadrant) });
      }
    }
    window.addEventListener('resize', onResize);

    var dataUrl = options.dataUrl || 'data/chapter03/boxoffice-rating-scatter.json';
    var uiUrl = options.uiUrl || 'data/chapter03/quadrant-ui.json';

    function cycleQuadrant() {
      var order = ['tr', 'tl', 'br', 'bl', 'all'];
      var idx = order.indexOf(state.activeQuadrant);
      if (idx < 0) idx = 0;
      selectQuadrant(order[(idx + 1) % order.length]);
    }

    var api = {
      chart: chart,
      highlightQuadrant: highlightQuadrant,
      selectQuadrant: selectQuadrant,
      syncSideCaseFromStep: syncSideCaseFromStep,
      pinFilmByTitle: pinFilmByTitle,
      cycleQuadrant: cycleQuadrant,
      getNarratives: function () { return UI.narratives || {}; },
      destroy: function () {
        window.removeEventListener('resize', onResize);
        chart.dispose();
      }
    };

    var dataUrl = options.dataUrl || 'data/chapter03/boxoffice-rating-scatter.json';
    var uiUrl = options.uiUrl || 'data/chapter03/quadrant-ui.json';

    function applyData(uiData, data, posters) {
      scatterPosters = posters || {};
      UI = Object.assign({}, uiData.ui, { quadrants: uiData.quadrants, narratives: uiData.narratives });

      if (!data.thresholds.boxOfficeYi) {
        data.thresholds.boxOfficeYi = Math.round(data.thresholds.boxOfficeWan / 10000 * 100) / 100;
      }
      if (!data.thresholds.ratingMean) {
        var sum = data.films.reduce(function (s, f) { return s + f.rating; }, 0);
        data.thresholds.ratingMean = Math.round(sum / data.films.length * 10) / 10;
      }
      data.totalSample = data.totalSample || (data.films ? data.films.length : 0);
      render(data);
    }

    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) {
      console.error('QuadrantScatter: 缺少内嵌数据 site-data.js');
      return api;
    }

    global.SheDirectsStore.loadMany({
      uiData: 'chapter03.ui',
      data: 'chapter03.scatter',
      posters: 'hero.scatterPostersManifest'
    }).then(function (r) {
      applyData(r.uiData, r.data, r.posters);
    }).catch(function (err) {
      console.error('QuadrantScatter load failed', err);
    });

    return api;
  }

  var scatterInstance = null;

  function initQuadrantScatter(options) {
    scatterInstance = createQuadrantScatter(options);
    return scatterInstance;
  }

  function cycleQuadrantGlobal() {
    if (scatterInstance && scatterInstance.cycleQuadrant) scatterInstance.cycleQuadrant();
  }

  global.QuadrantScatter = {
    init: initQuadrantScatter,
    colors: C,
    cycleQuadrant: cycleQuadrantGlobal
  };
})(typeof window !== 'undefined' ? window : this);
