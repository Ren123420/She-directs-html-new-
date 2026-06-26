/**
 * 情感河流时间轴 · 交互看板（对齐参考视频效果）
 */
(function (global) {
  'use strict';

  var FILM_META = {
    '你好，李焕英': { director: '贾玲', release: '2021-02-12' },
    '出走的决心': { director: '尹丽川', release: '2024-11-22' }
  };

  var EMOTION_FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'pos', label: '正向' },
    { id: 'neg', label: '负向' },
    { id: 'analysis', label: '分析' },
    { id: 'neutral', label: '中性' }
  ];

  var PHASES = [
    { id: 'all', label: '全年', range: [-7, 365] },
    { id: 'preheat', label: '预热', range: [-7, 0] },
    { id: 'burst', label: '爆发', range: [-3, 28] },
    { id: 'spread', label: '扩散', range: [7, 120] },
    { id: 'settle', label: '沉淀', range: [90, 240] },
    { id: 'tail', label: '长尾', range: [180, 365] }
  ];

  var state = {
    emotion: 'all',
    phase: 'all',
    cursorDay: 51,
    data: null,
    films: []
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function parseDate(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return String(iso).slice(0, 10);
  }

  function dayDiff(a, b) {
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function bucketsFromFilm(filmData) {
    if (filmData.buckets && filmData.buckets.length) {
      return filmData.buckets.map(function (b) {
        return { date: b.d, pos: b.p || 0, neg: Math.abs(b.n || 0) };
      });
    }
    var pos = (filmData.series || []).find(function (s) {
      return s.legendgroup === 'positive' || (s.name && s.name.indexOf('正') >= 0);
    });
    var neg = (filmData.series || []).find(function (s) {
      return s.legendgroup === 'negative' || (s.name && s.name.indexOf('负') >= 0);
    });
    if (!pos || !neg) return [];
    var out = [];
    for (var i = 0; i < pos.x.length; i++) {
      out.push({
        date: String(pos.x[i]).slice(0, 10),
        pos: pos.y[i] || 0,
        neg: Math.abs(neg.y[i] || 0)
      });
    }
    return out;
  }

  function prepareFilm(filmData) {
    var meta = FILM_META[filmData.film] || {};
    var release = parseDate(meta.release || filmData.release);
    var buckets = bucketsFromFilm(filmData);
    if (!release || !buckets.length) return null;

    var points = buckets.map(function (b) {
      var d = parseDate(b.date);
      return {
        date: b.date,
        day: dayDiff(d, release),
        pos: b.pos,
        neg: b.neg,
        total: b.pos + b.neg
      };
    }).sort(function (a, b) { return a.day - b.day; });

    var peak = points[0];
    points.forEach(function (p) {
      if (p.total > peak.total) peak = p;
    });

    return {
      film: filmData.film,
      director: meta.director || filmData.director || '',
      release: formatDate(meta.release),
      releaseDay: 0,
      start: formatDate(points[0].date),
      end: formatDate(points[points.length - 1].date),
      points: points,
      peak: peak
    };
  }

  function activePhase() {
    var found = PHASES.find(function (p) { return p.id === state.phase; });
    return found || PHASES[0];
  }

  function visiblePoints(film) {
    var phase = activePhase();
    return film.points.filter(function (p) {
      return p.day >= phase.range[0] && p.day <= phase.range[1];
    });
  }

  function smoothPath(xs, ys, baseY, closeBase) {
    if (!xs.length) return '';
    var d = 'M' + xs[0] + ' ' + (closeBase ? baseY : ys[0]);
    if (closeBase) d += ' L' + xs[0] + ' ' + ys[0];
    for (var i = 1; i < xs.length; i++) {
      var cpx = (xs[i - 1] + xs[i]) / 2;
      d += ' C' + cpx + ' ' + ys[i - 1] + ',' + cpx + ' ' + ys[i] + ',' + xs[i] + ' ' + ys[i];
    }
    if (closeBase) {
      d += ' L' + xs[xs.length - 1] + ' ' + baseY + ' Z';
    }
    return d;
  }

  function interpolateAt(points, day) {
    if (!points.length) return null;
    if (day <= points[0].day) return points[0];
    if (day >= points[points.length - 1].day) return points[points.length - 1];
    for (var i = 1; i < points.length; i++) {
      if (points[i].day >= day) {
        var a = points[i - 1];
        var b = points[i];
        var t = (day - a.day) / Math.max(b.day - a.day, 1);
        return {
          day: day,
          date: b.date,
          pos: a.pos + (b.pos - a.pos) * t,
          neg: a.neg + (b.neg - a.neg) * t,
          total: a.total + (b.total - a.total) * t
        };
      }
    }
    return points[points.length - 1];
  }

  function renderRiverSvg(film, width, height, cursorDay, emotion) {
    var padL = 12;
    var padR = 12;
    var padT = 34;
    var padB = 10;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var midY = padT + plotH / 2;
    var pts = visiblePoints(film);
    if (!pts.length) return '';

    var phase = activePhase();
    var minDay = phase.range[0];
    var maxDay = phase.range[1];
    var maxVal = 1;
    pts.forEach(function (p) {
      maxVal = Math.max(maxVal, p.pos, p.neg, p.total);
    });
    var scale = (plotH / 2 - 14) / maxVal;

    function xAt(day) {
      return padL + ((day - minDay) / Math.max(maxDay - minDay, 1)) * plotW;
    }

    var xs = pts.map(function (p) { return xAt(p.day); });
    var posYs = pts.map(function (p) { return midY - p.pos * scale; });
    var negYs = pts.map(function (p) { return midY + p.neg * scale; });
    var envYs = pts.map(function (p, i) {
      return Math.min(posYs[i], midY - 4) - Math.min(14, p.total * scale * 0.1);
    });

    var releaseX = xAt(0);
    var cursorX = xAt(Math.max(minDay, Math.min(maxDay, cursorDay)));
    var uid = film.film.replace(/\W/g, '');

    var grid = '';
    var marks = '';
    var bands = '';
    var i;

    for (i = 0; i <= 4; i++) {
      var gy = padT + (plotH / 4) * i;
      grid += '<line class="er-grid" x1="' + padL + '" y1="' + gy + '" x2="' + (padL + plotW) + '" y2="' + gy + '"/>';
    }

    if (emotion === 'all') {
      var layerScales = [0.38, 0.62, 0.88, 1];
      var layerColors = [
        'rgba(224,128,160,0.22)',
        'rgba(210,120,150,0.32)',
        'rgba(196,110,140,0.42)',
        'rgba(224,128,160,0.58)'
      ];
      layerScales.forEach(function (s, li) {
        var layerYs = posYs.map(function (y) {
          return midY - (midY - y) * s;
        });
        bands += '<path class="er-band er-band-layer" fill="' + layerColors[li] + '" d="' + smoothPath(xs, layerYs, midY, true) + '"/>';
      });
      bands += '<path class="er-band er-band-neg" fill="url(#er-neg-' + uid + ')" d="' + smoothPath(xs, negYs, midY, true) + '"/>';
      bands += '<path class="er-envelope" d="' + smoothPath(xs, envYs, midY, false) + '"/>';
      var peakIdx = 0;
      pts.forEach(function (p, idx) {
        if (p.total > pts[peakIdx].total) peakIdx = idx;
      });
      if (pts[peakIdx].day <= 40 && releaseX >= padL && releaseX <= padL + plotW) {
        marks += '<circle class="er-peak-dot" cx="' + releaseX + '" cy="' + (midY - 10) + '" r="3.5"/>';
        marks += '<text class="er-release-label" x="' + (releaseX + 6) + '" y="' + (midY - 14) + '">上映</text>';
      }
    } else if (emotion === 'pos') {
      bands += '<path class="er-band er-band-pos" fill="url(#er-pos-' + uid + ')" d="' + smoothPath(xs, posYs, midY, true) + '"/>';
      bands += '<path class="er-envelope" d="' + smoothPath(xs, envYs, midY, false) + '"/>';
    } else if (emotion === 'neg') {
      bands += '<path class="er-band er-band-neg" fill="url(#er-neg-' + uid + ')" d="' + smoothPath(xs, negYs, midY, true) + '"/>';
    } else if (emotion === 'neutral') {
      pts.forEach(function (p, idx) {
        if (p.total < maxVal * 0.4) {
          marks += '<line class="er-neutral-mark" x1="' + xs[idx] + '" y1="' + (midY - 10) + '" x2="' + xs[idx] + '" y2="' + (midY + 10) + '"/>';
        }
      });
    } else if (emotion === 'analysis') {
      pts.forEach(function (p, idx) {
        if (p.total > 0) {
          var h = 4 + Math.min(20, p.total * scale * 0.18);
          marks += '<line class="er-analysis-mark" x1="' + xs[idx] + '" y1="' + (midY - h) + '" x2="' + xs[idx] + '" y2="' + (midY + h) + '"/>';
        }
      });
    }

    return (
      '<svg class="er-river-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="er-pos-' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="rgba(224,128,160,0.82)"/>' +
            '<stop offset="100%" stop-color="rgba(224,128,160,0.12)"/>' +
          '</linearGradient>' +
          '<linearGradient id="er-neg-' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="rgba(107,94,74,0.08)"/>' +
            '<stop offset="100%" stop-color="rgba(90,120,150,0.42)"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect class="er-plot-bg" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '"/>' +
        grid +
        '<text class="er-film-title" x="' + padL + '" y="16">《' + film.film + '》</text>' +
        '<text class="er-film-meta" x="' + padL + '" y="30">' + film.director + ' · ' + film.start + ' → ' + film.end + '</text>' +
        bands +
        marks +
        '<line class="er-baseline" x1="' + padL + '" y1="' + midY + '" x2="' + (padL + plotW) + '" y2="' + midY + '"/>' +
        '<line class="er-release-line" x1="' + releaseX + '" y1="' + padT + '" x2="' + releaseX + '" y2="' + (padT + plotH) + '"/>' +
        '<line class="er-cursor-line" x1="' + cursorX + '" y1="' + padT + '" x2="' + cursorX + '" y2="' + (padT + plotH) + '"/>' +
      '</svg>'
    );
  }

  function updateHud(root) {
    var phase = activePhase();
    var sliceDates = state.films.map(function (film) {
      var pt = interpolateAt(film.points, state.cursorDay);
      return pt ? formatDate(pt.date) : '—';
    });
    var slicePt = state.films.map(function (film) {
      return interpolateAt(film.points, state.cursorDay);
    });
    var totalReviews = slicePt.reduce(function (sum, pt) {
      return sum + (pt ? Math.round(pt.total) : 0);
    }, 0);
    var domEmotion = '中性';
    var posSum = 0;
    var negSum = 0;
    slicePt.forEach(function (pt) {
      if (!pt) return;
      posSum += pt.pos;
      negSum += pt.neg;
    });
    if (posSum > negSum * 1.2) domEmotion = '正向';
    else if (negSum > posSum * 1.2) domEmotion = '负向';
    else if (totalReviews >= 8) domEmotion = '分析';
    var peakFilm = state.films[0];
    state.films.forEach(function (f) {
      if (f.peak.total > peakFilm.peak.total) peakFilm = f;
    });

    var sliceEl = $( '.er-slice', root);
    if (sliceEl) {
      sliceEl.innerHTML =
        '<div class="er-slice-kicker">SLICE</div>' +
        '<div class="er-slice-date">' + sliceDates.join(' / ') + '</div>' +
        '<div class="er-slice-row"><span class="er-slice-num">' + totalReviews + '</span><span class="er-slice-unit">条当日长评</span></div>' +
        '<div class="er-slice-emotion">' + domEmotion + '<em>主导情绪</em></div>';
    }

    var peakEl = $('.er-peak', root);
    if (peakEl) {
      peakEl.innerHTML =
        '<div class="er-peak-kicker">WAVE PEAK</div>' +
        '<div class="er-peak-film">' + peakFilm.film + '</div>' +
        '<div class="er-peak-date">' + formatDate(peakFilm.peak.date) + '</div>';
    }

    var slider = $('.er-slider-input', root);
    if (slider) {
      slider.min = String(phase.range[0]);
      slider.max = String(phase.range[1]);
      if (+slider.value < phase.range[0] || +slider.value > phase.range[1]) {
        slider.value = String(Math.max(phase.range[0], Math.min(phase.range[1], state.cursorDay)));
      }
      state.cursorDay = +slider.value;
    }

    var rivers = $('.er-rivers', root);
    if (rivers) {
      rivers.innerHTML = state.films.map(function (film) {
        return '<div class="er-river-row">' +
          renderRiverSvg(film, 1000, 150, state.cursorDay, state.emotion) +
        '</div>';
      }).join('');
    }
  }

  function bindControls(root) {
    root.querySelectorAll('[data-er-emotion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.emotion = btn.getAttribute('data-er-emotion');
        root.querySelectorAll('[data-er-emotion]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        updateHud(root);
      });
    });

    root.querySelectorAll('[data-er-phase]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.phase = btn.getAttribute('data-er-phase');
        root.querySelectorAll('[data-er-phase]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        updateHud(root);
      });
    });

    var slider = $('.er-slider-input', root);
    if (slider) {
      slider.addEventListener('input', function () {
        state.cursorDay = +slider.value;
        updateHud(root);
      });
    }
  }

  function render(hostId, data) {
    var host = document.getElementById(hostId);
    if (!host || !data || !data.films) return;

    state.data = data;
    state.films = [];
    var li = data.films.find(function (f) { return f.film.indexOf('李焕英') >= 0; });
    var chuzou = data.films.find(function (f) { return f.film.indexOf('出走') >= 0; });
    [li, chuzou].forEach(function (f) {
      if (!f) return;
      var prepared = prepareFilm(f);
      if (prepared) state.films.push(prepared);
    });
    if (!state.films.length) return;

    host.className = 'chart-canvas er-board-host';
    host.innerHTML =
      '<div class="er-board">' +
        '<div class="er-board-toolbar">' +
          '<div class="er-slice"></div>' +
          '<div class="er-toolbar-group">' +
            '<div class="er-toolbar-label">情绪滤镜</div>' +
            '<div class="er-btn-row">' +
              EMOTION_FILTERS.map(function (f) {
                return '<button type="button" class="er-btn' + (f.id === state.emotion ? ' is-active' : '') + '" data-er-emotion="' + f.id + '">' + f.label + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="er-toolbar-group">' +
            '<div class="er-toolbar-label">阶段缩放</div>' +
            '<div class="er-btn-row">' +
              PHASES.map(function (p) {
                return '<button type="button" class="er-btn' + (p.id === state.phase ? ' is-active' : '') + '" data-er-phase="' + p.id + '">' + p.label + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="er-toolbar-group er-toolbar-slider">' +
            '<div class="er-toolbar-label">时间浮标</div>' +
            '<div class="er-slider-wrap">' +
              '<span>D-</span>' +
              '<input type="range" class="er-slider-input" min="-7" max="365" value="' + state.cursorDay + '" aria-label="时间浮标" />' +
              '<span>D+</span>' +
            '</div>' +
          '</div>' +
          '<div class="er-peak"></div>' +
        '</div>' +
        '<div class="er-rivers"></div>' +
      '</div>';

    bindControls(host);
    updateHud(host);
  }

  function resize(hostId) {
    var host = document.getElementById(hostId);
    if (host && state.data) updateHud(host);
  }

  global.EmotionRiversBoard = { render: render, resize: resize };
})(typeof window !== 'undefined' ? window : this);
