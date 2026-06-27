/**
 * 第四章：电影节时间轴 · 三金漏斗 · 全球纬线 · 话语权雷达
 */
(function (global) {
  'use strict';

  var C = global.SheDirectsChart;
  var T = C.tokens;
  var charts = {};

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

  var FEST_LANE = {
    '戛纳': -78,
    '威尼斯': -62,
    '柏林': -48,
    '洛迦诺': -34,
    '国际': -22,
    '国际邀请': -12
  };

  var TIMELINE_YEARS = { min: 1980, max: 2025 };
  var timelineData = null;
  var timelineTipEl = null;

  function festivalLabel(name) {
    if (name === '国际邀请') return '邀请展';
    return name;
  }

  function roseSize(entry) {
    if (entry.won) return 1.35;
    if (entry.tier === 'main') return 1.1;
    return 0.82;
  }

  function roseFill(entry) {
    if (entry.won) return 'url(#rose-gold)';
    if (entry.tier === 'main') return T.roseDeep;
    return T.roseLight;
  }

  function yearToX(year, width, pad) {
    var span = TIMELINE_YEARS.max - TIMELINE_YEARS.min;
    return pad + ((year - TIMELINE_YEARS.min) / span) * (width - pad * 2);
  }

  function buildThornPath(width, branchY) {
  var x0 = 36;
  var x1 = width - 36;
  return 'M' + x0 + ' ' + branchY +
    ' C ' + (x0 + 90) + ' ' + (branchY - 18) +
    ', ' + (x0 + 200) + ' ' + (branchY + 22) +
    ', ' + (x0 + 310) + ' ' + (branchY - 8) +
    ' S ' + (x0 + 520) + ' ' + (branchY + 16) +
    ', ' + (x0 + 640) + ' ' + (branchY - 12) +
    ' S ' + (x1 - 80) + ' ' + (branchY + 10) +
    ', ' + x1 + ' ' + (branchY - 4);
  }

  function thornMarkers(pathD, branchY, width) {
    var marks = [];
    var xs = [];
    var step = (width - 72) / 14;
    for (var i = 0; i <= 14; i += 1) {
      xs.push(36 + step * i);
    }
    xs.forEach(function (x, i) {
      var flip = i % 2 === 0 ? 1 : -1;
      var y = branchY + flip * (6 + (i % 3) * 2);
      marks.push(
        '<path class="rose-ribbon-thorn" d="M' + x + ' ' + y +
        ' l4 ' + (flip * 10) + ' l-8 0 z"/>'
      );
    });
    return marks.join('');
  }

  function roseMarkup(x, y, entry, idx, branchY) {
    var scale = roseSize(entry);
    var won = entry.won;
    var petals = won ? 7 : 5;
    var stemLen = Math.max(10, branchY - y - 6);
    var parts = ['<g class="rose-ribbon-flower' + (won ? ' is-won' : '') + '" data-idx="' + idx + '" transform="translate(' + x + ',' + y + ') scale(' + scale + ')">'];
    if (won) {
      parts.push('<circle class="rose-ribbon-glow" cx="0" cy="0" r="11" fill="url(#rose-glow)"/>');
    }
    var fill = roseFill(entry);
    for (var p = 0; p < petals; p += 1) {
      var rot = (360 / petals) * p;
      parts.push(
        '<ellipse class="rose-ribbon-petal" cx="0" cy="-5.5" rx="' + (won ? 4.6 : 4) + '" ry="' + (won ? 8.2 : 7) + '" fill="' + fill + '" transform="rotate(' + rot + ')"/>'
      );
    }
    parts.push('<circle class="rose-ribbon-core" cx="0" cy="0" r="' + (won ? 2.6 : 2.1) + '" fill="' + (won ? '#b8860b' : '#6b4a32') + '"/>');
    parts.push('<line class="rose-ribbon-stem" x1="0" y1="2" x2="0" y2="' + stemLen + '" stroke="#5a6b4a" stroke-width="1.2"/>');
    parts.push('</g>');
    return parts.join('');
  }

  function showTimelineTip(host, entry, evt) {
    if (!timelineTipEl) {
      timelineTipEl = document.createElement('div');
      timelineTipEl.className = 'rose-ribbon-tip';
      timelineTipEl.setAttribute('role', 'status');
      host.appendChild(timelineTipEl);
    }
    timelineTipEl.innerHTML =
      '<strong>' + entry.film + '</strong>' +
      '<span>' + entry.director + ' · ' + entry.year + '</span>' +
      '<span>' + festivalLabel(entry.festival) + ' · ' + entry.unit + '</span>' +
      (entry.won ? '<em>获奖</em>' : '<em>' + (entry.tier === 'main' ? '主竞赛/重点单元' : '次级单元') + '</em>');
    timelineTipEl.hidden = false;

    var rect = host.getBoundingClientRect();
    var left = evt.clientX - rect.left + 12;
    var top = evt.clientY - rect.top - 8;
    left = Math.max(8, Math.min(left, rect.width - 220));
    top = Math.max(8, Math.min(top, rect.height - 100));
    timelineTipEl.style.left = left + 'px';
    timelineTipEl.style.top = top + 'px';
  }

  function hideTimelineTip() {
    if (timelineTipEl) timelineTipEl.hidden = true;
  }

  function renderTimeline(data) {
    timelineData = data;
    var host = $('chart4-timeline');
    if (!host) return;

    var summary = data.summary || {};
    var width = 920;
    var height = 400;
    var pad = 48;
    var branchY = 228;
    var entries = (data.entries || []).slice().sort(function (a, b) {
      return a.year - b.year || a.film.localeCompare(b.film, 'zh');
    });

    var yearCounts = {};
    var flowers = entries.map(function (entry, idx) {
      var key = String(entry.year);
      yearCounts[key] = (yearCounts[key] || 0) + 1;
      var jitter = (yearCounts[key] - 1) * 14 - 7;
      var x = yearToX(entry.year, width, pad) + jitter;
      var lane = FEST_LANE[entry.festival] != null ? FEST_LANE[entry.festival] : 0;
      var y = branchY + lane - (entry.won ? 10 : 0);
      return roseMarkup(x, y, entry, idx, branchY);
    }).join('');

    var yearTicks = [];
    for (var y = TIMELINE_YEARS.min; y <= TIMELINE_YEARS.max; y += 5) {
      var x = yearToX(y, width, pad);
      yearTicks.push(
        '<line class="rose-ribbon-tick" x1="' + x + '" y1="' + (branchY + 28) + '" x2="' + x + '" y2="' + (branchY + 36) + '"/>' +
        '<text class="rose-ribbon-year" x="' + x + '" y="' + (branchY + 52) + '" text-anchor="middle">' + y + '</text>'
      );
    }

    var bloomStart = yearToX(2010, width, pad);
    var pathD = buildThornPath(width, branchY);

    host.className = 'chart-canvas chart-tall rose-ribbon-host';
    timelineTipEl = null;
    host.innerHTML =
      '<div class="rose-ribbon-timeline" aria-label="三大电影节入围荆棘玫瑰时间轴">' +
        '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="rose-gold" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#f0d060"/>' +
              '<stop offset="55%" stop-color="#d4a017"/>' +
              '<stop offset="100%" stop-color="#b8860b"/>' +
            '</linearGradient>' +
            '<radialGradient id="rose-glow" cx="50%" cy="50%" r="50%">' +
              '<stop offset="0%" stop-color="rgba(212,160,23,0.35)"/>' +
              '<stop offset="100%" stop-color="rgba(212,160,23,0)"/>' +
            '</radialGradient>' +
            '<linearGradient id="ribbon-paper" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#f7f2e8"/>' +
              '<stop offset="100%" stop-color="#efe8da"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<rect width="100%" height="100%" fill="url(#ribbon-paper)" rx="2"/>' +
          '<rect class="rose-ribbon-era" x="' + bloomStart + '" y="72" width="' + (width - bloomStart - pad) + '" height="' + (branchY - 40) + '" rx="8"/>' +
          '<text class="rose-ribbon-caption" x="' + (width / 2) + '" y="34" text-anchor="middle">华语女导演 · 三大电影节入围 ' + (summary.femaleMainComp || 13) + ' 部主竞赛</text>' +
          '<text class="rose-ribbon-subcaption" x="' + (width / 2) + '" y="54" text-anchor="middle">1980–2025 · 荆棘上开花 · 金色=获奖</text>' +
          '<g class="rose-ribbon-legend">' +
            '<g transform="translate(' + (width - 210) + ', 78)">' +
              '<ellipse cx="0" cy="0" rx="4" ry="7" fill="' + T.roseLight + '"/>' +
              '<text x="12" y="4">入围</text>' +
              '<g transform="translate(62,0)"><ellipse cx="0" cy="0" rx="4.5" ry="8" fill="url(#rose-gold)"/><text x="12" y="4">获奖</text></g>' +
            '</g>' +
          '</g>' +
          yearTicks.join('') +
          '<path class="rose-ribbon-branch" d="' + pathD + '"/>' +
          thornMarkers(pathD, branchY, width) +
          '<g class="rose-ribbon-flowers">' + flowers + '</g>' +
        '</svg>' +
      '</div>';

    var flowerNodes = host.querySelectorAll('.rose-ribbon-flower');
    flowerNodes.forEach(function (node) {
      var idx = parseInt(node.getAttribute('data-idx'), 10);
      var entry = entries[idx];
      node.addEventListener('mouseenter', function (e) {
        node.classList.add('is-active');
        showTimelineTip(host, entry, e);
        setInsight(
          'chart4-timeline-insight',
          '<strong>《' + entry.film + '》</strong> · ' + entry.director +
          ' · ' + festivalLabel(entry.festival) + ' ' + entry.year +
          (entry.won ? ' · <em>获奖</em>' : '')
        );
      });
      node.addEventListener('mousemove', function (e) {
        showTimelineTip(host, entry, e);
      });
      node.addEventListener('mouseleave', function () {
        node.classList.remove('is-active');
        hideTimelineTip();
      });
      node.addEventListener('click', function (e) {
        showTimelineTip(host, entry, e);
      });
    });

    host.addEventListener('mouseleave', hideTimelineTip);

    setSource('chart4-timeline-source', data.source || '');
    setInsight(
      'chart4-timeline-insight',
      '1980–2000 几乎空白 · 2010 年后玫瑰渐密 · 主竞赛女导演作品约 <strong>' + (summary.femaleMainComp || 13) + '</strong> 部'
    );
  }

  function resizeTimeline() {
    if (timelineData) renderTimeline(timelineData);
  }

  var funnelData = null;

  var SF_POSE = {
    stand: 'M10 2.5c2 0 3.4 1.5 3.4 3.4S12 9.2 10 9.2 6.6 7.7 6.6 5.9 8 2.5 10 2.5zm-4 7.2h8l1.4 15.3H4.6L6 9.7z',
    bend: 'M10 3c1.7 0 3 1.3 3 2.9S11.7 8.7 10 8.7 7 7.4 7 5.9 8.3 3 10 3zm-.8 5.8l5.2 2.2 2.8 13.5h-3.2l-2-9.8-5.5 2.2-1.5-3 6.2-4.1z',
    fall: 'M3.5 19.5l7.5-1.8 7.2 3.5-1.8 4.2-10.2 1.2-2.7-6.9zm1.8-5.2c1.6 0 2.7-1 2.7-2.4S7 9.5 5.3 9.5 2.6 10.5 2.6 11.9s1.1 2.4 2.7 2.4z'
  };

  var SF_LAYER_STYLE = [
    { pose: 'stand', color: '#e0a0c0', bg: 'rgba(224,160,192,0.22)', width: '100%', clip: '4% 0%, 96% 0%, 90% 100%, 10% 100%' },
    { pose: 'bend', color: '#e080a0', bg: 'rgba(224,128,160,0.28)', width: '78%', clip: '6% 0%, 94% 0%, 86% 100%, 14% 100%' },
    { pose: 'fall', color: '#c06078', bg: 'rgba(192,96,120,0.32)', width: '48%', clip: '10% 0%, 90% 0%, 78% 100%, 22% 100%' }
  ];

  function figureCols(pose, count) {
    if (count <= 20) return Math.max(1, count);
    return Math.max(16, Math.min(count, Math.round(Math.sqrt(count * 2.35))));
  }

  function figureIcon(pose, color) {
    return '<svg class="sf-figure" viewBox="0 0 20 26" aria-hidden="true">' +
      '<path fill="' + color + '" d="' + SF_POSE[pose] + '"/>' +
      '</svg>';
  }

  function figureGrid(pose, count, color) {
    var out = '';
    for (var i = 0; i < count; i += 1) {
      out += figureIcon(pose, color);
    }
    return out;
  }

  function pctOfUpper(value, upper) {
    if (!upper) return '—';
    return (value / upper * 100).toFixed(1) + '%';
  }

  function renderFunnel(data) {
    funnelData = data;
    var host = $('chart4-funnel');
    if (!host) return;

    if (charts.funnel) {
      charts.funnel.dispose();
      charts.funnel = null;
    }

    var layers = data.layers || [];
    var annotation = data.annotation || '每100位出发的女导演，最终站在领奖台上的不到3位。';

    var layerHtml = layers.map(function (layer, idx) {
      var style = SF_LAYER_STYLE[idx] || SF_LAYER_STYLE[0];
      var count = layer.value;
      var visualCount = count;
      var cols = figureCols(style.pose, visualCount);
      var upper = idx > 0 ? layers[idx - 1].value : null;
      var rate = idx > 0 ? pctOfUpper(count, upper) : null;

      return (
        '<section class="sf-layer" data-layer="' + idx + '" style="width:' + style.width + ';" tabindex="0">' +
          '<div class="sf-layer-surface sf-layer-surface--' + style.pose + '" style="clip-path:polygon(' + style.clip + ');background:' + style.bg + ';">' +
            '<div class="sf-layer-head">' +
              '<span class="sf-layer-name">' + layer.name + '</span>' +
              '<strong class="sf-layer-value">' + count + '</strong>' +
              (rate ? '<span class="sf-layer-rate">占上层 ' + rate + '</span>' : '') +
            '</div>' +
            '<div class="sf-figure-grid sf-figure-grid--' + style.pose + '" style="--sf-cols:' + cols + '">' +
              figureGrid(style.pose, visualCount, style.color) +
            '</div>' +
          '</div>' +
        '</section>'
      );
    }).join('');

    host.className = 'chart-canvas chart-tall silhouette-funnel-host';
    host.innerHTML =
      '<div class="silhouette-funnel-wrap" aria-label="从作品到三金奖项的人形漏斗">' +
        '<div class="silhouette-funnel">' + layerHtml + '</div>' +
        '<blockquote class="sf-handnote">' + annotation + '</blockquote>' +
      '</div>';

    host.querySelectorAll('.sf-layer').forEach(function (layerEl) {
      var idx = parseInt(layerEl.getAttribute('data-layer'), 10);
      var layer = layers[idx];
      var upper = idx > 0 ? layers[idx - 1].value : null;
      function activate() {
        layerEl.classList.add('is-active');
        var extra = upper
          ? ' · 占上层 <strong>' + pctOfUpper(layer.value, upper) + '</strong>'
          : '';
        setInsight(
          'chart4-funnel-insight',
          '<strong>' + layer.name + '</strong> · ' + layer.value + ' 部/次' + extra
        );
      }
      function deactivate() {
        layerEl.classList.remove('is-active');
      }
      layerEl.addEventListener('mouseenter', activate);
      layerEl.addEventListener('mouseleave', deactivate);
      layerEl.addEventListener('focus', activate);
      layerEl.addEventListener('blur', deactivate);
    });

    var v0 = layers[0] ? layers[0].value : 217;
    var v1 = layers[1] ? layers[1].value : 13;
    var v2 = layers[2] ? layers[2].value : 5;
    setSource('chart4-funnel-source', data.source || '');
    setInsight(
      'chart4-funnel-insight',
      v0 + ' 部 → ' + v1 + ' 提名 → ' + v2 + ' 获奖 · 人形剪影示意淘汰过程'
    );
  }

  function resizeFunnel() {
    if (funnelData) renderFunnel(funnelData);
  }

  var latitudeData = null;
  var latitudeTipEl = null;
  var LAT_PCT_MAX = 30;

  function globeLayout() {
    return { cx: 360, cy: 248, r: 168, top: 88, bottom: 400, width: 720, height: 440 };
  }

  function pctToGlobeY(pct, globe) {
    var t = Math.min(1, Math.max(0, pct / LAT_PCT_MAX));
    return globe.bottom - t * (globe.bottom - globe.top);
  }

  function geoLatToGlobeY(lat, globe) {
    var t = (lat - 8) / 52;
    t = Math.min(1, Math.max(0, t));
    return globe.bottom - t * (globe.bottom - globe.top);
  }

  function regionGlobeY(region, globe) {
    if (!region.missing && region.pct != null) return pctToGlobeY(region.pct, globe);
    return geoLatToGlobeY(region.lat, globe);
  }

  function chordAtY(y, globe) {
    var dy = y - globe.cy;
    if (Math.abs(dy) >= globe.r) return { x1: globe.cx, x2: globe.cx };
    var half = Math.sqrt(globe.r * globe.r - dy * dy);
    return { x1: globe.cx - half, x2: globe.cx + half };
  }

  function latLineColor(pct, missing) {
    if (missing) return T.inkNote;
    var t = Math.min(1, pct / LAT_PCT_MAX);
    var r = Math.round(224 - t * 64);
    var g = Math.round(160 - t * 64);
    var b = Math.round(192 - t * 74);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function showLatitudeTip(host, region, evt) {
    if (!latitudeTipEl) {
      latitudeTipEl = document.createElement('div');
      latitudeTipEl.className = 'globe-latitude-tip';
      host.appendChild(latitudeTipEl);
    }
    var pctText = region.missing
      ? '数据待补 · 华语电影暂无公开可比口径'
      : '女性导演占比 <strong>' + region.pct + '%</strong>';
    latitudeTipEl.innerHTML =
      '<strong>' + region.name + '</strong>' +
      '<span>' + pctText + '</span>' +
      '<em>纬线越高 · 占比越高</em>';
    latitudeTipEl.hidden = false;

    var rect = host.getBoundingClientRect();
    var left = evt.clientX - rect.left + 12;
    var top = evt.clientY - rect.top - 8;
    left = Math.max(8, Math.min(left, rect.width - 220));
    top = Math.max(8, Math.min(top, rect.height - 90));
    latitudeTipEl.style.left = left + 'px';
    latitudeTipEl.style.top = top + 'px';
  }

  function hideLatitudeTip() {
    if (latitudeTipEl) latitudeTipEl.hidden = true;
  }

  function renderLatitude(data) {
    latitudeData = data;
    var host = $('chart4-latitude');
    if (!host) return;

    if (charts.latitude) {
      charts.latitude.dispose();
      charts.latitude = null;
    }

    var globe = globeLayout();
    var regions = (data.regions || []).slice().sort(function (a, b) {
      return regionGlobeY(b, globe) - regionGlobeY(a, globe);
    });

    var lines = regions.map(function (region, idx) {
      var y = regionGlobeY(region, globe);
      var chord = chordAtY(y, globe);
      var color = latLineColor(region.pct, region.missing);
      var dash = region.missing ? ' stroke-dasharray="9 6"' : '';
      var pctLabel = region.missing ? '?' : region.pct + '%';
      var labelX = chord.x2 + 14;
      var nameX = chord.x1 - 12;

      return (
        '<g class="globe-latitude-band' + (region.missing ? ' is-missing' : '') + '" data-idx="' + idx + '" tabindex="0">' +
          '<path class="globe-latitude-arc" d="M' + chord.x1 + ' ' + y + ' Q ' + globe.cx + ' ' + (y - 3) + ' ' + chord.x2 + ' ' + y + '"' +
            ' fill="none" stroke="' + color + '" stroke-width="' + (region.missing ? 2 : 2.6) + '"' + dash + '/>' +
          '<circle class="globe-latitude-node" cx="' + chord.x1 + '" cy="' + y + '" r="3.5" fill="' + color + '"/>' +
          '<text class="globe-latitude-name" x="' + nameX + '" y="' + (y + 4) + '" text-anchor="end">' + region.name + '</text>' +
          '<text class="globe-latitude-pct' + (region.missing ? ' is-question' : '') + '" x="' + labelX + '" y="' + (y + 5) + '">' + pctLabel + '</text>' +
        '</g>'
      );
    }).join('');

    var wfColor = 'rgba(107,94,74,0.22)';
    var wfLatLines = [-60, -30, 0, 30, 60].map(function (deg) {
      var rad = deg * Math.PI / 180;
      var y = globe.cy - globe.r * Math.sin(rad);
      var rx = globe.r * Math.cos(rad);
      var ry = rx * 0.2;
      if (rx < 2) return '';
      var sw = deg === 0 ? '1.3' : '0.85';
      return '<ellipse cx="' + globe.cx + '" cy="' + y.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="none" stroke="' + wfColor + '" stroke-width="' + sw + '"/>';
    }).join('');
    var wfLonLines = [0, 30, 60].map(function (deg) {
      var rad = deg * Math.PI / 180;
      var rx = globe.r * Math.sin(rad);
      if (deg === 0) return '<line x1="' + globe.cx + '" y1="' + (globe.cy - globe.r).toFixed(1) + '" x2="' + globe.cx + '" y2="' + (globe.cy + globe.r).toFixed(1) + '" stroke="' + wfColor + '" stroke-width="0.85"/>';
      return '<ellipse cx="' + globe.cx + '" cy="' + globe.cy + '" rx="' + rx.toFixed(1) + '" ry="' + globe.r + '" fill="none" stroke="' + wfColor + '" stroke-width="0.85"/>';
    }).join('');
    var scaleMarks = [];
    [0, 10, 20, 30].forEach(function (pct) {
      var y = pctToGlobeY(pct, globe);
      scaleMarks.push(
        '<line class="globe-latitude-scale-tick" x1="' + (globe.cx + globe.r + 22) + '" y1="' + y + '" x2="' + (globe.cx + globe.r + 32) + '" y2="' + y + '"/>' +
        '<text class="globe-latitude-scale-label" x="' + (globe.cx + globe.r + 38) + '" y="' + (y + 4) + '">' + pct + '%</text>'
      );
    });

    latitudeTipEl = null;
    host.className = 'chart-canvas chart-tall globe-latitude-host';
    host.innerHTML =
      '<div class="globe-latitude-chart" aria-label="全球女性导演占比纬线图">' +
        '<svg viewBox="0 0 ' + globe.width + ' ' + globe.height + '" role="img">' +
          '<defs>' +
            '<radialGradient id="globe-shade" cx="68%" cy="72%" r="55%">' +
              '<stop offset="0%" stop-color="rgba(44,36,22,0)"/>' +
              '<stop offset="100%" stop-color="rgba(44,36,22,0.16)"/>' +
            '</radialGradient>' +
            '<clipPath id="globe-clip">' +
              '<circle cx="' + globe.cx + '" cy="' + globe.cy + '" r="' + globe.r + '"/>' +
            '</clipPath>' +
            '<linearGradient id="globe-paper" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#f7f2e8"/>' +
              '<stop offset="100%" stop-color="#efe8da"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<rect width="100%" height="100%" fill="url(#globe-paper)" rx="2"/>' +
          '<text class="globe-latitude-title" x="' + (globe.width / 2) + '" y="36" text-anchor="middle">' + (data.title || '谁让女性拿起导筒？') + '</text>' +
          '<text class="globe-latitude-subtitle" x="' + (globe.width / 2) + '" y="56" text-anchor="middle">纬线高度 = 女性导演占比 · 越靠北越高</text>' +
          '<g class="globe-latitude-sphere">' +
            '<circle class="globe-latitude-outline" cx="' + globe.cx + '" cy="' + globe.cy + '" r="' + globe.r + '"/>' +
            '<g clip-path="url(#globe-clip)">' +
              '<circle cx="' + globe.cx + '" cy="' + globe.cy + '" r="' + globe.r + '" fill="rgba(250,247,240,0.85)"/>' +
              wfLatLines + wfLonLines +
            '</g>' +
            '<circle cx="' + globe.cx + '" cy="' + globe.cy + '" r="' + globe.r + '" fill="url(#globe-shade)" pointer-events="none"/>' +
          '</g>' +
          '<g class="globe-latitude-north">' +
            '<circle cx="' + globe.cx + '" cy="' + (globe.cy - globe.r + 10) + '" r="5" fill="rgba(255,252,247,0.95)" stroke="rgba(107,94,74,0.25)"/>' +
            '<text class="globe-latitude-pole-label" x="' + globe.cx + '" y="' + (globe.cy - globe.r - 6) + '" text-anchor="middle">北极</text>' +
          '</g>' +
          '<g class="globe-latitude-scale">' + scaleMarks.join('') + '</g>' +
          '<g class="globe-latitude-bands">' + lines + '</g>' +
        '</svg>' +
      '</div>';

    host.querySelectorAll('.globe-latitude-band').forEach(function (node) {
      var idx = parseInt(node.getAttribute('data-idx'), 10);
      var region = regions[idx];
      function activate(e) {
        node.classList.add('is-active');
        if (e) showLatitudeTip(host, region, e);
        var extra = region.missing
          ? ' · <em>华语数据待补</em>'
          : ' · <strong>' + region.pct + '%</strong>';
        setInsight('chart4-latitude-insight', '<strong>' + region.name + '</strong>' + extra);
      }
      function deactivate() {
        node.classList.remove('is-active');
        hideLatitudeTip();
      }
      node.addEventListener('mouseenter', activate);
      node.addEventListener('mousemove', activate);
      node.addEventListener('mouseleave', deactivate);
      node.addEventListener('focus', activate);
      node.addEventListener('blur', deactivate);
    });

    host.addEventListener('mouseleave', hideLatitudeTip);

    setSource('chart4-latitude-source', data.source || '');
    setInsight(
      'chart4-latitude-insight',
      '越靠北占比越高 · 欧洲 <strong>27%</strong> vs 日本 <strong>4.7%</strong> · 华语虚线待填'
    );
  }

  function resizeLatitude() {
    if (latitudeData) renderLatitude(latitudeData);
  }

  function renderRadar(data) {
    radarData = data;
    var host = $('chart4-radar');
    if (!host) return;

    if (charts.radar) {
      charts.radar.dispose();
      charts.radar = null;
    }

    var rights = data.series.map(function (s) { return s.name; });
    var years = data.years || data.indicators.map(function (ind) { return ind.name; });
    var axisMax = data.series.map(function (s) {
      var peak = Math.max.apply(null, s.values);
      return Math.max(8, Math.ceil(peak * 1.18));
    });

    var width = 720;
    var height = 460;
    var cx = 300;
    var cy = 262;
    var radius = 142;
    var labelRadius = radius + 50;
    var levels = [0.25, 0.5, 0.75, 1];
    var yearColors = ['#b8a898', '#7a9fc0', '#e080a0', '#c06078'];
    var angles = rights.map(function (_, i) {
      return -Math.PI / 2 + i * (2 * Math.PI / rights.length);
    });

    function pointAt(rIdx, value) {
      var ratio = value / axisMax[rIdx];
      var r = Math.max(0, ratio) * radius;
      var a = angles[rIdx];
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }

    function ringPoints(scale) {
      return angles.map(function (a) {
        return (cx + radius * scale * Math.cos(a)) + ',' + (cy + radius * scale * Math.sin(a));
      }).join(' ');
    }

    var grids = levels.map(function (lv) {
      return '<polygon class="voice-radar-grid" points="' + ringPoints(lv) + '"/>';
    }).join('');

    function axisLabelPos(i, a) {
      var lx = cx + labelRadius * Math.cos(a);
      var ly = cy + labelRadius * Math.sin(a);
      var anchor = Math.abs(Math.cos(a)) < 0.25 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      var dx = 0;
      var dy = 0;
      if (i === 0) dy = -8;
      else if (i === 1) { dx = 10; dy = 12; }
      else if (i === 2) { dx = -10; dy = 12; }
      return { x: lx + dx, y: ly + dy, anchor: anchor };
    }

    function vertexLabelPos(ri, p) {
      var a = angles[ri];
      var push = 16;
      return {
        x: p.x + Math.cos(a) * push,
        y: p.y + Math.sin(a) * push + (Math.sin(a) > 0.15 ? 11 : -8),
        anchor: 'middle'
      };
    }

    var axes = rights.map(function (name, i) {
      var tip = pointAt(i, axisMax[i]);
      var a = angles[i];
      var label = axisLabelPos(i, a);
      return (
        '<line class="voice-radar-axis" x1="' + cx + '" y1="' + cy + '" x2="' + tip.x + '" y2="' + tip.y + '"/>' +
        '<text class="voice-radar-axis-label" x="' + label.x + '" y="' + label.y + '" text-anchor="' + label.anchor + '">' + name + '</text>'
      );
    }).join('');

    var scaleLabels = levels.map(function (lv, idx) {
      if (idx === 0) return '';
      var y = cy - radius * lv;
      return '<text class="voice-radar-scale" x="' + (cx + 6) + '" y="' + (y + 3) + '">' + Math.round(axisMax[0] * lv) + '</text>';
    }).join('');

    var yearLayers = years.map(function (year, yi) {
      var values = data.series.map(function (s) { return s.values[yi]; });
      var pts = values.map(function (v, ri) {
        var p = pointAt(ri, v);
        return p.x + ',' + p.y;
      }).join(' ');
      var color = yearColors[yi % yearColors.length];
      var dots = values.map(function (v, ri) {
        var p = pointAt(ri, v);
        var label = vertexLabelPos(ri, p);
        return (
          '<circle class="voice-radar-vertex" cx="' + p.x + '" cy="' + p.y + '" r="4.2" fill="' + color + '"/>' +
          '<text class="voice-radar-vertex-label" x="' + label.x + '" y="' + label.y + '" text-anchor="' + label.anchor + '">' + v + '</text>'
        );
      }).join('');
      return (
        '<g class="voice-radar-year" data-year="' + year + '" tabindex="0">' +
          '<polygon class="voice-radar-area" points="' + pts + '" fill="' + color + '" fill-opacity="0.14" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round"/>' +
          dots +
        '</g>'
      );
    }).join('');

    var legend = years.map(function (year, yi) {
      var x = 548;
      var y = 108 + yi * 28;
      return (
        '<g class="voice-radar-legend-item" data-year="' + year + '" tabindex="0">' +
          '<rect x="' + x + '" y="' + (y - 10) + '" width="14" height="14" rx="2" fill="' + yearColors[yi] + '" fill-opacity="0.55" stroke="' + yearColors[yi] + '"/>' +
          '<text x="' + (x + 22) + '" y="' + y + '">' + year + '</text>' +
        '</g>'
      );
    }).join('');

    host.className = 'chart-canvas chart-tall voice-radar-host';
    host.innerHTML =
      '<div class="voice-radar-chart" aria-label="女性电影话语权综合指数雷达图">' +
        '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img">' +
          '<defs>' +
            '<linearGradient id="voice-radar-paper" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#f7f2e8"/>' +
              '<stop offset="100%" stop-color="#efe8da"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<rect width="100%" height="100%" fill="url(#voice-radar-paper)" rx="2"/>' +
          '<text class="voice-radar-title" x="' + (width / 2) + '" y="30" text-anchor="middle">三重权力 · 四个年份断面</text>' +
          '<g class="voice-radar-grids">' + grids + scaleLabels + '</g>' +
          '<g class="voice-radar-axes">' + axes + '</g>' +
          '<circle class="voice-radar-hub" cx="' + cx + '" cy="' + cy + '" r="4" fill="' + T.roseDeep + '"/>' +
          '<g class="voice-radar-years">' + yearLayers + '</g>' +
          '<g class="voice-radar-legend">' + legend + '</g>' +
        '</svg>' +
      '</div>';

    function activateYear(year) {
      host.querySelectorAll('.voice-radar-year, .voice-radar-legend-item').forEach(function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-year') === year);
        el.classList.toggle('is-dim', year && el.getAttribute('data-year') !== year);
      });
      var yi = years.indexOf(year);
      if (yi < 0) {
        resetRadarInsight();
        return;
      }
      var parts = rights.map(function (name, ri) {
        return name + ' <strong>' + data.series[ri].values[yi] + '</strong>';
      }).join(' · ');
      setInsight('chart4-radar-insight', '<strong>' + year + '</strong> · ' + parts);
    }

    host.querySelectorAll('.voice-radar-year, .voice-radar-legend-item').forEach(function (el) {
      var year = el.getAttribute('data-year');
      el.addEventListener('mouseenter', function () { activateYear(year); });
      el.addEventListener('focus', function () { activateYear(year); });
      el.addEventListener('mouseleave', function () {
        host.querySelectorAll('.voice-radar-year, .voice-radar-legend-item').forEach(function (node) {
          node.classList.remove('is-active', 'is-dim');
        });
        resetRadarInsight();
      });
      el.addEventListener('blur', function () {
        host.querySelectorAll('.voice-radar-year, .voice-radar-legend-item').forEach(function (node) {
          node.classList.remove('is-active', 'is-dim');
        });
        resetRadarInsight();
      });
    });

    setSource('chart4-radar-source', data.source || '');
    resetRadarInsight();
  }

  var radarData = null;

  function resetRadarInsight() {
    if (!radarData) return;
    setInsight(
      'chart4-radar-insight',
      '三轴为权力维度 · 四色为年份断面 · 悬停查看 <strong>2000/2010/2020/2025</strong> 位移'
    );
  }

  function resizeRadar() {
    if (radarData) renderRadar(radarData);
  }

  function resizeAll() {
    resizeTimeline();
    resizeFunnel();
    resizeLatitude();
    resizeRadar();
    Object.keys(charts).forEach(function (k) {
      if (charts[k]) charts[k].resize();
    });
  }

  function initChapter04() {
    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) return;
    C.registerSheDirectsTheme(echarts);

    Promise.all([
      global.SheDirectsStore.load('chapter04.festivalTimeline').then(renderTimeline),
      global.SheDirectsStore.load('chapter04.awardsFunnel').then(renderFunnel),
      global.SheDirectsStore.load('chapter04.globalLatitude').then(renderLatitude),
      global.SheDirectsStore.load('chapter04.voiceRadar').then(renderRadar)
    ]).then(function () {
      setTimeout(resizeAll, 200);
    }).catch(function (err) {
      console.error('Chapter04', err);
    });

    global.addEventListener('resize', resizeAll, { passive: true });
  }

  global.Chapter04 = { init: initChapter04, resize: resizeAll };
})(typeof window !== 'undefined' ? window : this);
