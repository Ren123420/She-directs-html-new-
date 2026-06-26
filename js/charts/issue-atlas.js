/**
 * Issue Atlas · 径向议题图谱（浅色双栏 · 中心档案库 + 束状弧线）
 */
(function (global) {
  'use strict';

  var OTHER = '其他';

  var THEME_MAP = {
    '母女关系': 'family', '原生家庭': 'family',
    '身体自主权': 'body',
    '自我认同与觉醒': 'identity',
    '职场性别歧视': 'struct', '社会结构性压迫': 'struct', '中年女性困境': 'struct',
    '其他': 'other'
  };

  var THEME_COLORS = {
    family: { fill: '#2f6f58', glow: 'rgba(47,111,88,0.28)', label: '墨绿线：母女、家庭与关系结构' },
    body: { fill: '#c06078', glow: 'rgba(192,96,120,0.32)', label: '玫瑰线：身体、自主与亲密关系讨论' },
    identity: { fill: '#9a4a62', glow: 'rgba(154,74,98,0.22)', label: '酒红线：自我认同与觉醒' },
    struct: { fill: '#a67c35', glow: 'rgba(166,124,53,0.24)', label: '旧金线：结构性议题' },
    other: { fill: '#5c5348', glow: 'rgba(92,83,72,0.18)', label: '灰线：其他讨论' }
  };

  function themeOf(id) { return THEME_MAP[id] || 'other'; }

  function atlasPath(x1, y1, x2, y2, cx, cy, bulge) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var dx = x2 - x1, dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / dist, ny = dx / dist;
    var bend = (bulge || 0.1) * dist;
    var dir = ((mx - cx) * nx + (my - cy) * ny) >= 0 ? 1 : -1;
    var c1x = x1 + dx * 0.28 + nx * bend * dir;
    var c1y = y1 + dy * 0.28 + ny * bend * dir;
    var c2x = x1 + dx * 0.72 + nx * bend * dir;
    var c2y = y1 + dy * 0.72 + ny * bend * dir;
    return 'M' + x1 + ' ' + y1 + ' C ' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + x2 + ' ' + y2;
  }

  function parseCurve(pathD) {
    var m = pathD.match(/M([\d.]+)\s+([\d.]+)\s+C\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (!m) return null;
    return {
      x0: +m[1], y0: +m[2],
      x1: +m[3], y1: +m[4],
      x2: +m[5], y2: +m[6],
      x3: +m[7], y3: +m[8]
    };
  }

  function curveAt(pathD, t) {
    var p = parseCurve(pathD);
    if (!p) return { x: 0, y: 0 };
    var u = 1 - t;
    return {
      x: u * u * u * p.x0 + 3 * u * u * t * p.x1 + 3 * u * t * t * p.x2 + t * t * t * p.x3,
      y: u * u * u * p.y0 + 3 * u * u * t * p.y1 + 3 * u * t * t * p.y2 + t * t * t * p.y3
    };
  }

  function curveMid(pathD) { return curveAt(pathD, 0.5); }

  function bundle(pathD, color, value, cls, attrs, cx, cy, scale, dim) {
    var opK = dim ? 0.3 : 1;
    var sc = scale || 1;
    var n = Math.min(2 + Math.floor(value * 0.24 * sc), 7);
    var parts = ['<g class="issue-atlas-bundle ' + cls + (dim ? ' is-dim' : '') + '" ' + attrs + '>'];
    var i;
    for (i = 0; i < n; i += 1) {
      var t = n === 1 ? 0 : (i / (n - 1) - 0.5);
      var w = (0.55 + Math.abs(t) * 0.32) * sc;
      var op = (0.022 + Math.min(value * 0.01 * sc, 0.12)) * opK;
      parts.push(
        '<path d="' + pathD + '" fill="none" stroke="' + color + '" stroke-width="' + w.toFixed(2) + '"' +
        ' stroke-opacity="' + op.toFixed(3) + '" stroke-linecap="round"' +
        ' transform="rotate(' + (t * 2.6) + ' ' + cx + ' ' + cy + ')"/>'
      );
    }
    parts.push('</g>');
    return parts.join('');
  }

  function nameLines(name) {
    if (name.length <= 5) return [name];
    var mid = Math.ceil(name.length / 2);
    return [name.slice(0, mid), name.slice(mid)];
  }

  function shortName(name) {
    return name.length > 7 ? name.slice(0, 6) + '…' : name;
  }

  function thicknessScale(min) {
    if (min >= 5) return 4.2;
    if (min >= 3) return 2.9;
    if (min >= 2) return 1.9;
    return 1;
  }

  function buildLayout(raw, minVal, filmId) {
    var W = 640, H = 500, cx = 320, cy = 258, hubR = 44, ring = 168;
    var films = raw.nodes.filter(function (n) { return n.category === 'film'; });
    var filmMap = {};
    films.forEach(function (f) { filmMap[f.id] = f; });
    var issues = raw.nodes.filter(function (n) { return n.category === 'issue'; })
      .sort(function (a, b) { return b.value - a.value; });
    var edges = raw.links.filter(function (l) {
      return l.value >= minVal;
    });
    var byIssue = {};
    edges.forEach(function (l) {
      if (!byIssue[l.target]) byIssue[l.target] = [];
      byIssue[l.target].push(l);
    });

    var topicW = {};
    edges.forEach(function (l) {
      topicW[l.target] = (topicW[l.target] || 0) + l.value;
    });
    var vals = issues.map(function (i) { return topicW[i.id] || 0; }).filter(function (v) { return v > 0; });
    var vMin = vals.length ? Math.min.apply(null, vals) : 1;
    var vMax = vals.length ? Math.max.apply(null, vals) : 1;

    var issueMap = {};
    var issueNodes = issues.map(function (issue, i) {
      var w = topicW[issue.id] || 0;
      var angle = -Math.PI / 2 + i * (2 * Math.PI / issues.length);
      var t = vMax === vMin ? 0.5 : (w - vMin) / (vMax - vMin);
      var node = {
        id: issue.id, name: issue.name, value: w, theme: themeOf(issue.id),
        x: cx + ring * Math.cos(angle), y: cy + ring * Math.sin(angle),
        r: w > 0 ? 18 + t * 28 : 10,
        visible: w > 0
      };
      issueMap[issue.id] = node;
      return node;
    });

    var hubLinks = issueNodes.filter(function (n) { return n.visible; }).map(function (issue) {
      var path = atlasPath(cx, cy, issue.x, issue.y, cx, cy, 0.34);
      return { target: issue.id, theme: issue.theme, value: issue.value, path: path, mid: curveMid(path) };
    });

    var filmLinks = [];
    edges.forEach(function (link) {
      var issue = issueMap[link.target];
      if (!issue || !issue.visible) return;
      var grp = byIssue[link.target] || [];
      var gi = 0, g;
      for (g = 0; g < grp.length; g += 1) { if (grp[g].source === link.source) { gi = g; break; } }
      var spread = Math.max(grp.length - 1, 1);
      var bulge = 0.38 + (gi / spread - 0.5) * 0.1;
      var path = atlasPath(cx, cy, issue.x, issue.y, cx, cy, bulge);
      filmLinks.push({
        source: link.source, target: link.target, value: link.value,
        theme: themeOf(link.target), path: path, mid: curveMid(path),
        filmPos: curveAt(path, 0.18 + (gi / Math.max(grp.length, 1)) * 0.22),
        match: !filmId || link.source === filmId
      });
    });
    filmLinks.sort(function (a, b) { return a.value - b.value; });
    filmLinks.forEach(function (l, i) { l.idx = i; });

    var filmSet = {};
    edges.forEach(function (l) { filmSet[l.source] = true; });
    var validCodes = edges.reduce(function (s, l) { return s + l.value; }, 0);
    var totalAll = raw.links.reduce(function (s, l) { return s + l.value; }, 0);

    return {
      W: W, H: H, cx: cx, cy: cy, hubR: hubR, ring: ring,
      filmId: filmId, films: films, filmMap: filmMap,
      issues: issueNodes, issueMap: issueMap,
      hubLinks: hubLinks, filmLinks: filmLinks,
      stats: {
        films: Object.keys(filmSet).length,
        reviews: validCodes,
        groups: edges.length,
        totalAll: totalAll
      }
    };
  }

  function IssueAtlasBoard(el, raw) {
    this.el = el;
    this.raw = raw;
    this.minVal = 5;
    this.filmId = '';
    this.locked = null;
    this._mount();
    this._bind();
    this.draw();
  }

  IssueAtlasBoard.prototype._mount = function () {
    this.el.className = 'chart-canvas chart-tall issue-atlas-host';
    this.el.innerHTML =
      '<div class="issue-atlas">' +
        '<div class="issue-atlas-stage">' +
          '<p class="issue-atlas-caption">INTERACTIVE ISSUE ATLAS · HOVER NODES / CLICK LINKS</p>' +
          '<div class="issue-atlas-toolbar" data-toolbar></div>' +
          '<div class="issue-atlas-svg" data-svg></div>' +
          '<div class="issue-atlas-legend" data-legend></div>' +
          '<div class="issue-atlas-detail" hidden data-detail></div>' +
        '</div>' +
      '</div>';
    this.toolbarEl = this.el.querySelector('[data-toolbar]');
    this.svgEl = this.el.querySelector('[data-svg]');
    this.legendEl = this.el.querySelector('[data-legend]');
    this.detailEl = this.el.querySelector('[data-detail]');
  };

  IssueAtlasBoard.prototype._bind = function () {
    var self = this;
    this.el.querySelector('.issue-atlas-stage').addEventListener('mouseleave', function () {
      if (!self.locked) self._clear();
    });
  };

  IssueAtlasBoard.prototype._toolbarHtml = function (layout) {
    var filters = [0, 2, 3, 5].map(function (v) {
      var active = this.minVal === v ? ' is-active' : '';
      return '<button type="button" class="issue-atlas-filter' + active + '" data-min="' + v + '">' +
        (v === 0 ? '全部关系' : '≥' + v) + '</button>';
    }, this).join('');
    var label = this.filmId ? ((layout.filmMap[this.filmId] && layout.filmMap[this.filmId].name) || this.filmId) : '选择影片';
    var opts = ['<li><button type="button" class="issue-atlas-film-option' + (!this.filmId ? ' is-active' : '') + '" data-film="">全部影片</button></li>']
      .concat(layout.films.map(function (f) {
        return '<li><button type="button" class="issue-atlas-film-option' + (f.id === this.filmId ? ' is-active' : '') + '" data-film="' + f.id + '">' + f.name + '</button></li>';
      }, this)).join('');
    return filters +
      '<div class="issue-atlas-film-picker">' +
        '<button type="button" class="issue-atlas-film-trigger" aria-expanded="false">' + label + '</button>' +
        '<ul class="issue-atlas-film-menu" hidden>' + opts + '</ul>' +
      '</div>' +
      '<button type="button" class="issue-atlas-reset">重置</button>';
  };

  IssueAtlasBoard.prototype._detail = function (kind, title, body, rose) {
    this.detailEl.innerHTML =
      '<p class="issue-atlas-detail-kicker' + (rose ? ' is-rose' : '') + '">' + kind + '</p>' +
      '<strong>' + title + '</strong>' + body;
    this.detailEl.hidden = false;
  };

  IssueAtlasBoard.prototype._clear = function (unlock) {
    if (unlock) this.locked = null;
    this.el.querySelectorAll('.issue-atlas-bundle, .issue-atlas-issue, .issue-atlas-film-marker').forEach(function (n) {
      n.classList.remove('is-active', 'is-dim', 'is-locked');
    });
    var mk = this.el.querySelector('.issue-atlas-link-marker');
    if (mk) mk.hidden = true;
    this.detailEl.hidden = true;
  };

  IssueAtlasBoard.prototype._marker = function (pos, label) {
    var mk = this.el.querySelector('.issue-atlas-link-marker');
    if (!mk || !pos) return;
    mk.setAttribute('transform', 'translate(' + pos.x + ',' + pos.y + ')');
    mk.querySelector('.issue-atlas-link-marker-label').textContent = label || '';
    mk.hidden = false;
  };

  IssueAtlasBoard.prototype._issue = function (id, lock) {
    var self = this;
    var L = this._layout;
    this.el.querySelectorAll('.issue-atlas-bundle').forEach(function (n) {
      var on = n.getAttribute('data-issue') === id;
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    this.el.querySelectorAll('.issue-atlas-issue').forEach(function (n) {
      var on = n.getAttribute('data-id') === id;
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    this.el.querySelectorAll('.issue-atlas-film-marker').forEach(function (n) {
      var idx = parseInt(n.getAttribute('data-idx'), 10);
      var link = L.filmLinks[idx];
      var on = link && link.target === id;
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    var issue = L.issueMap[id];
    var rel = L.filmLinks.filter(function (l) { return l.target === id; }).sort(function (a, b) { return b.value - a.value; });
    var pct = L.stats.reviews ? (issue.value / L.stats.reviews * 100).toFixed(1) : '0';
    this._detail('ISSUE NODE', issue.name,
      '<p class="issue-atlas-detail-meta">共 ' + issue.value + ' 条，占有效议题长评 ' + pct + '%</p>' +
      '<ul class="issue-atlas-detail-films">' + rel.slice(0, 8).map(function (l) {
        return '<li><span>《' + l.source + '》</span><em>' + l.value + ' 条</em></li>';
      }).join('') + '</ul>', true);
    if (lock) {
      this.locked = { t: 'issue', id: id };
      var hub = null, h;
      for (h = 0; h < L.hubLinks.length; h += 1) { if (L.hubLinks[h].target === id) { hub = L.hubLinks[h]; break; } }
      if (hub) this._marker(hub.mid, issue.name);
    }
  };

  IssueAtlasBoard.prototype._link = function (idx, lock) {
    var L = this._layout;
    var link = L.filmLinks[idx];
    if (!link) return;
    this.el.querySelectorAll('.issue-atlas-bundle').forEach(function (n) {
      var on = n.getAttribute('data-idx') === String(idx);
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    this.el.querySelectorAll('.issue-atlas-issue').forEach(function (n) {
      n.classList.toggle('is-active', n.getAttribute('data-id') === link.target);
      n.classList.toggle('is-dim', n.getAttribute('data-id') !== link.target);
    });
    this.el.querySelectorAll('.issue-atlas-film-marker').forEach(function (n) {
      var on = n.getAttribute('data-idx') === String(idx);
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    this._detail('EDGE DETAIL', '《' + link.source + '》 → ' + link.target,
      '<p class="issue-atlas-detail-meta">该影片—议题组合出现 <strong>' + link.value + '</strong> 条长评</p>', true);
    this._marker(link.mid, shortName(link.source));
    if (lock) this.locked = { t: 'link', idx: idx };
  };

  IssueAtlasBoard.prototype._film = function (filmId, lock) {
    var L = this._layout;
    var related = L.filmLinks.filter(function (l) { return l.source === filmId; });
    if (!related.length) return;
    var relatedIssues = {};
    var total = 0;
    related.forEach(function (l) {
      relatedIssues[l.target] = true;
      total += l.value;
    });

    this.el.querySelectorAll('.issue-atlas-bundle').forEach(function (n) {
      var on = n.getAttribute('data-film') === filmId;
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
      n.classList.toggle('is-locked', on);
    });
    this.el.querySelectorAll('.issue-atlas-film-marker').forEach(function (n) {
      var on = n.getAttribute('data-film') === filmId;
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });
    this.el.querySelectorAll('.issue-atlas-issue').forEach(function (n) {
      var on = !!relatedIssues[n.getAttribute('data-id')];
      n.classList.toggle('is-active', on);
      n.classList.toggle('is-dim', !on);
    });

    var top = related.slice().sort(function (a, b) { return b.value - a.value; })[0];
    this._detail(
      'FILM NODE',
      '《' + (((L.filmMap[filmId] && L.filmMap[filmId].name) || filmId)) + '》',
      '<p class="issue-atlas-detail-meta">该影片当前可见议题长评 <strong>' + total + '</strong> 条' +
      (top ? '，最强关联为 <strong>' + top.target + '</strong>。' : '。') + '</p>' +
      '<ul class="issue-atlas-detail-films">' +
      related.slice().sort(function (a, b) { return b.value - a.value; }).map(function (l) {
        return '<li><span>' + l.target + '</span><em>' + l.value + ' 条</em></li>';
      }).join('') + '</ul>',
      true
    );
    this._marker(top ? top.mid : related[0].mid, shortName(filmId));
    if (lock) this.locked = { t: 'film', id: filmId };
  };

  IssueAtlasBoard.prototype._wire = function () {
    var self = this;
    this.toolbarEl.querySelectorAll('.issue-atlas-filter').forEach(function (btn) {
      btn.onclick = function () {
        self.minVal = parseInt(btn.getAttribute('data-min'), 10) || 0;
        self.locked = null;
        self.draw();
      };
    });
    var picker = this.toolbarEl.querySelector('.issue-atlas-film-picker');
    var trigger = picker.querySelector('.issue-atlas-film-trigger');
    var menu = picker.querySelector('.issue-atlas-film-menu');
    trigger.onclick = function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    };
    menu.querySelectorAll('.issue-atlas-film-option').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        self.filmId = btn.getAttribute('data-film') || '';
        self.locked = self.filmId ? { t: 'film', id: self.filmId } : null;
        menu.hidden = true;
        self.draw();
      };
    });
    this.toolbarEl.querySelector('.issue-atlas-reset').onclick = function () {
      self.minVal = 5;
      self.filmId = '';
      self.locked = null;
      self.draw();
    };
    this.el.querySelectorAll('.issue-atlas-issue').forEach(function (node) {
      var id = node.getAttribute('data-id');
      node.onmouseenter = function () { if (!self.locked) self._issue(id, false); };
      node.onclick = function (e) { e.stopPropagation(); self._issue(id, true); };
    });
    this.el.querySelectorAll('.issue-atlas-hub-link').forEach(function (node) {
      var id = node.getAttribute('data-issue');
      node.onmouseenter = function () { if (!self.locked) self._issue(id, false); };
      node.onclick = function (e) { e.stopPropagation(); self._issue(id, true); };
    });
    this.el.querySelectorAll('.issue-atlas-film-link').forEach(function (node) {
      var idx = parseInt(node.getAttribute('data-idx'), 10);
      node.onmouseenter = function () { if (!self.locked) self._link(idx, false); };
      node.onclick = function (e) { e.stopPropagation(); self._link(idx, true); };
    });
    this.el.querySelectorAll('.issue-atlas-film-marker').forEach(function (node) {
      var idx = parseInt(node.getAttribute('data-idx'), 10);
      node.onmouseenter = function () { if (!self.locked) self._link(idx, false); };
      node.onclick = function (e) { e.stopPropagation(); self._link(idx, true); };
    });
    this.el.querySelector('.issue-atlas-stage svg').onclick = function (e) {
      if (e.target.closest('.issue-atlas-bundle, .issue-atlas-issue, .issue-atlas-film-marker')) return;
      self._clear(true);
    };
  };

  IssueAtlasBoard.prototype.draw = function () {
    var L = buildLayout(this.raw, this.minVal, this.filmId);
    this._layout = L;
    var sc = thicknessScale(this.minVal);
    this.toolbarEl.innerHTML = this._toolbarHtml(L);
    this.legendEl.innerHTML = ['family', 'body', 'struct'].map(function (k) {
      var t = THEME_COLORS[k];
      return '<span class="issue-atlas-legend-item"><i style="background:' + t.fill + '"></i>' + t.label + '</span>';
    }).join('');

    var rings = [0.34, 0.52, 0.7, 0.88, 1.05].map(function (r) {
      return '<circle class="issue-atlas-ring" cx="' + L.cx + '" cy="' + L.cy + '" r="' + (L.ring * r) + '"/>';
    }).join('');

    var hubs = L.hubLinks.map(function (l) {
      return bundle(l.path, THEME_COLORS[l.theme].fill, Math.max(2, Math.round(l.value / 35)),
        'issue-atlas-hub-link', 'data-issue="' + l.target + '"', L.cx, L.cy, 1, false);
    }).join('');

    var films = L.filmLinks.map(function (l) {
      return bundle(l.path, THEME_COLORS[l.theme].fill, l.value, 'issue-atlas-film-link',
        'data-idx="' + l.idx + '" data-issue="' + l.target + '" data-film="' + l.source + '"',
        L.cx, L.cy, sc, L.filmId && !l.match);
    }).join('');

    var markers = L.filmLinks.map(function (l) {
      return '<g class="issue-atlas-film-marker' + (L.filmId && !l.match ? ' is-dim' : '') + '" data-idx="' + l.idx + '" transform="translate(' + l.filmPos.x + ',' + l.filmPos.y + ')">' +
        '<circle class="issue-atlas-film-marker-dot" r="10"/>' +
        '<text class="issue-atlas-film-marker-label" text-anchor="middle" dy="0.35em">' + shortName(l.source) + '</text></g>';
    }).join('');

    var issues = L.issues.filter(function (i) { return i.visible; }).map(function (issue) {
      var t = THEME_COLORS[issue.theme];
      var lines = nameLines(issue.name);
      var ty = lines.length > 1 ? issue.y - 6 : issue.y - 2;
      var ts = lines.map(function (ln, li) {
        return '<tspan x="' + issue.x + '" dy="' + (li ? 13 : 0) + '">' + ln + '</tspan>';
      }).join('');
      var inside = issue.r >= 22;
      return '<g class="issue-atlas-issue" data-id="' + issue.id + '" tabindex="0">' +
        '<circle class="issue-atlas-issue-glow" cx="' + issue.x + '" cy="' + issue.y + '" r="' + (issue.r + 12) + '" fill="' + t.glow + '"/>' +
        '<circle class="issue-atlas-issue-dot" cx="' + issue.x + '" cy="' + issue.y + '" r="' + issue.r + '" fill="' + t.fill + '"/>' +
        (inside
          ? '<text class="issue-atlas-issue-title" x="' + issue.x + '" y="' + ty + '" text-anchor="middle">' + ts + '</text>' +
            '<text class="issue-atlas-issue-count" x="' + issue.x + '" y="' + (issue.y + issue.r * 0.5) + '" text-anchor="middle">' + issue.value + '</text>'
          : '<text class="issue-atlas-issue-count" x="' + issue.x + '" y="' + (issue.y + 4) + '" text-anchor="middle">' + issue.value + '</text>' +
            '<text class="issue-atlas-issue-label" x="' + issue.x + '" y="' + (issue.y + issue.r + 14) + '" text-anchor="middle">' + issue.name + '</text>') +
        '</g>';
    }).join('');

    var totalAll = L.stats.totalAll;
    this.svgEl.innerHTML =
      '<svg viewBox="0 0 ' + L.W + ' ' + L.H + '" role="img" aria-label="议题图谱">' +
        '<defs><radialGradient id="ia-hub-grad"><stop offset="0%" stop-color="#3d3428"/><stop offset="100%" stop-color="#14110e"/></radialGradient></defs>' +
        '<text class="issue-atlas-watermark" x="' + L.cx + '" y="68" text-anchor="middle">ISSUE ATLAS</text>' +
        rings +
        '<g class="issue-atlas-hub-links">' + hubs + '</g>' +
        '<g class="issue-atlas-film-links">' + films + '</g>' +
        '<g class="issue-atlas-center is-hub">' +
          '<circle class="issue-atlas-center-glow" cx="' + L.cx + '" cy="' + L.cy + '" r="66" fill="rgba(224,128,160,0.14)"/>' +
          '<circle class="issue-atlas-center-ring" cx="' + L.cx + '" cy="' + L.cy + '" r="' + (L.hubR + 10) + '"/>' +
          '<circle cx="' + L.cx + '" cy="' + L.cy + '" r="' + L.hubR + '" fill="url(#ia-hub-grad)"/>' +
          '<text x="' + L.cx + '" y="' + (L.cy - 8) + '" text-anchor="middle">长评</text>' +
          '<text x="' + L.cx + '" y="' + (L.cy + 8) + '" text-anchor="middle">档案库</text>' +
          '<text class="issue-atlas-hub-codes" x="' + L.cx + '" y="' + (L.cy + 24) + '" text-anchor="middle">' + totalAll + ' VALID CODES</text>' +
        '</g>' +
        '<g class="issue-atlas-issues">' + issues + '</g>' +
        '<g class="issue-atlas-film-markers">' + markers + '</g>' +
        '<g class="issue-atlas-link-marker" hidden>' +
          '<circle class="issue-atlas-link-marker-halo" r="13"/>' +
          '<circle class="issue-atlas-link-marker-dot" r="9"/>' +
          '<text class="issue-atlas-link-marker-label" text-anchor="middle" dy="0.35em"></text>' +
        '</g>' +
      '</svg>';

    this.el.querySelector('.issue-atlas-stage').classList.toggle('has-film-focus', !!this.filmId);
    this._wire();
    if (this.locked) {
      if (this.locked.t === 'issue') this._issue(this.locked.id, true);
      else if (this.locked.t === 'link') this._link(this.locked.idx, true);
      else if (this.locked.t === 'film') this._film(this.locked.id, true);
    }
  };

  var boards = {};

  global.IssueAtlas = {
    render: function (id, raw) {
      var el = document.getElementById(id);
      if (!el) return null;
      if (boards[id]) boards[id] = null;
      boards[id] = new IssueAtlasBoard(el, raw);
      return boards[id];
    },
    resize: function () { /* SVG scales via width 100% */ }
  };
})(typeof window !== 'undefined' ? window : this);
