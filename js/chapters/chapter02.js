/**
 * 第二章：她写她，她拍她 · 类型蝴蝶图 / 番位堆积条 / 年龄蝴蝶图
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

  function showChartError(domId, msg) {
    var dom = $(domId);
    if (!dom) return;
    dom.innerHTML = '<div class="chart-error">' + msg + '</div>';
  }

  function loadJson(key) {
    return global.SheDirectsStore.load(key);
  }


  function renderChart2a(data) {
    var chart = charts.c2a || initChart('chart2a');
    if (!chart) return;
    charts.c2a = chart;

    var rows = data.rows.slice().reverse();
    var genres = rows.map(function (r) { return r.genre; });
    var femaleVals = rows.map(function (r) { return -r.femalePct; });
    var maleVals = rows.map(function (r) { return r.malePct; });
    var maxPct = 0;
    rows.forEach(function (r) {
      maxPct = Math.max(maxPct, r.femalePct, r.malePct);
    });
    var axisMax = Math.min(80, Math.ceil(maxPct / 5) * 5 + 8);

    chart.setOption({
      animationDuration: 900,
      grid: { left: 72, right: 72, top: 52, bottom: 44 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (items) {
          var idx = items[0] && items[0].dataIndex;
          if (idx == null || !rows[idx]) return '';
          var row = rows[idx];
          var ratio = row.genderRatio != null ? row.genderRatio + '×' : '—';
          var fRep = row.femaleRep || {};
          var mRep = row.maleRep || {};
          return (
            '<strong>' + row.genre + '</strong><br/>' +
            '女导演 <strong>' + row.femalePct + '%</strong>（' + row.femaleCount + ' 次）<br/>' +
            '代表：' + (fRep.director || '—') + ' · 《' + (fRep.debut || '—') + '》<br/>' +
            '男导演 <strong>' + row.malePct + '%</strong>（' + row.maleCount + ' 次）<br/>' +
            '代表：' + (mRep.director || '—') + ' · 《' + (mRep.debut || '—') + '》<br/>' +
            '性别差异倍数：<em>' + ratio + '</em>'
          );
        }
      },
      legend: {
        data: ['女导演作品', '男导演对照'],
        top: 4,
        textStyle: { fontSize: 10, fontFamily: "'Punk Typewriter', monospace" }
      },
      xAxis: {
        type: 'value',
        min: -axisMax,
        max: axisMax,
        name: '类型标签占比（%）',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { fontSize: 10, color: T.inkNote },
        axisLabel: {
          formatter: function (v) { return Math.abs(v) + '%'; },
          fontSize: 9
        },
        splitLine: { lineStyle: { type: 'dashed', color: T.paperArchive } }
      },
      yAxis: {
        type: 'category',
        data: genres,
        axisTick: { show: false },
        axisLabel: { fontSize: 11, fontFamily: "'Huiwen', serif" }
      },
      series: [
        {
          name: '女导演作品',
          type: 'bar',
          barWidth: '58%',
          itemStyle: { color: T.roseMain, borderRadius: [2, 0, 0, 2] },
          label: {
            show: true,
            position: 'left',
            formatter: function (p) { return Math.abs(p.value).toFixed(1) + '%'; },
            fontSize: 9,
            color: T.roseDeep
          },
          data: femaleVals
        },
        {
          name: '男导演对照',
          type: 'bar',
          barWidth: '58%',
          itemStyle: { color: T.inkBlue, borderRadius: [0, 2, 2, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: function (p) { return p.value.toFixed(1) + '%'; },
            fontSize: 9,
            color: T.inkCharcoal
          },
          data: maleVals
        }
      ]
    }, true);

    function updateRatioLabels() {
      if (!rows.length) return;
      var grid = chart.getModel().getComponent('grid', 0);
      var rect = grid && grid.coordinateSystem && grid.coordinateSystem.getRect();
      if (!rect) return;
      var graphics = rows.map(function (row, i) {
        var yPx = chart.convertToPixel({ yAxisIndex: 0 }, row.genre);
        var ratioText = row.genderRatio != null ? row.genderRatio + '×' : '—';
        return {
          type: 'text',
          left: rect.x + rect.width / 2,
          top: yPx - 6,
          style: {
            text: ratioText,
            fill: T.roseDeep,
            font: 'bold 10px Punk Typewriter, monospace',
            textAlign: 'center'
          },
          silent: true,
          z: 10
        };
      });
      chart.setOption({ graphic: graphics });
    }

    chart.off('finished');
    chart.on('finished', updateRatioLabels);
    updateRatioLabels();

    chart.off('mouseover');
    chart.on('mouseover', function (params) {
      if (params.componentType !== 'series' || params.dataIndex == null) return;
      var row = rows[params.dataIndex];
      if (!row) return;
      var h = data.herfindahl || {};
      setInsight('chart2a-insight',
        '<strong>' + row.genre + '</strong> · 差异倍数 ' +
        (row.genderRatio != null ? row.genderRatio + '×' : '—') +
        ' · 女导演代表 ' + (row.femaleRep.director || '—') + '《' + (row.femaleRep.debut || '') + '》' +
        ' · H指数 女 ' + (h.female || '—') + ' / 男 ' + (h.male || '—'));
    });

    setSource('chart2a-source', data.source || '');
    var h = data.herfindahl || {};
    setInsight('chart2a-insight',
      '左=女导演 · 右=男导演 · 中线=性别差异倍数 · ' +
      'Herfindahl 女 <strong>' + (h.female || '—') + '</strong> / 男 <strong>' + (h.male || '—') + '</strong> · 悬停查看代表与处女作');
  }

  function renderChart2b(data) {
    var chart = charts.c2b || initChart('chart2b');
    if (!chart) return;
    charts.c2b = chart;

    var categories = ['第一番位为女性', '第一番位为男性', '双主角/群像'];
    var colors = [T.roseMain, T.inkBlue, T.inkNote];
    var female = categories.map(function (cat) {
      var row = data.rows.find(function (r) { return r.group === '女导演作品' && r.category === cat; });
      return row ? row.pct : 0;
    });
    var male = categories.map(function (cat) {
      var row = data.rows.find(function (r) { return r.group === '男导演作品' && r.category === cat; });
      return row ? row.pct : 0;
    });

    chart.setOption({
      animationDuration: 900,
      grid: { left: 120, right: 48, top: 36, bottom: 48 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (items) {
          return items.map(function (it) {
            return it.seriesName + ' · ' + it.name + '：<strong>' + it.value.toFixed(1) + '%</strong>';
          }).join('<br>');
        }
      },
      legend: { data: categories, bottom: 0, textStyle: { fontSize: 10 } },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      yAxis: {
        type: 'category',
        data: ['女导演作品', '男导演作品'],
        axisTick: { show: false }
      },
      series: categories.map(function (cat, idx) {
        return {
          name: cat,
          type: 'bar',
          stack: 'total',
          barWidth: '42%',
          itemStyle: { color: colors[idx] },
          label: {
            show: true,
            position: 'inside',
            formatter: function (p) { return p.value >= 8 ? p.value.toFixed(1) + '%' : ''; },
            fontSize: 10,
            color: '#fff'
          },
          data: [female[idx], male[idx]]
        };
      })
    }, true);

    setSource('chart2b-source', data.source || '');
    setInsight('chart2b-insight',
      '女导演：<strong>49.3%</strong> 女性第一番位 vs 男导演 <strong>7.4%</strong> · 悬停查看各段比例');
  }

  function renderChart2c(data) {
    var chart = charts.c2c || initChart('chart2c');
    if (!chart) return;
    charts.c2c = chart;

    var buckets = data.buckets.slice().reverse();
    var femaleSeries = data.series.find(function (s) { return s.group === '女导演作品'; });
    var maleSeries = data.series.find(function (s) { return s.group === '男导演对照'; });

    function pctFor(series, label) {
      if (!series) return 0;
      var bucket = series.buckets.find(function (b) { return b.label === label; });
      return bucket ? bucket.pct : 0;
    }

    var femaleVals = buckets.map(function (b) { return -pctFor(femaleSeries, b); });
    var maleVals = buckets.map(function (b) { return pctFor(maleSeries, b); });

    chart.setOption({
      animationDuration: 900,
      grid: { left: 72, right: 72, top: 40, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (items) {
          return items.map(function (it) {
            return it.seriesName + ' · ' + it.name + '：<strong>' + Math.abs(it.value).toFixed(1) + '%</strong>';
          }).join('<br>');
        }
      },
      legend: {
        data: ['女导演作品', '男导演对照'],
        top: 0,
        textStyle: { fontSize: 10 }
      },
      xAxis: {
        type: 'value',
        min: -60,
        max: 60,
        axisLabel: {
          formatter: function (v) { return Math.abs(v) + '%'; }
        },
        splitLine: { lineStyle: { type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: buckets,
        axisTick: { show: false },
        axisLabel: { formatter: function (v) { return v === '<20' ? '20岁以下' : v + '岁'; } }
      },
      series: [
        {
          name: '女导演作品',
          type: 'bar',
          barWidth: '55%',
          itemStyle: { color: T.roseMain, borderRadius: [4, 0, 0, 4] },
          label: {
            show: true,
            position: 'left',
            formatter: function (p) { return Math.abs(p.value) >= 6 ? Math.abs(p.value).toFixed(1) + '%' : ''; },
            fontSize: 10
          },
          data: femaleVals
        },
        {
          name: '男导演对照',
          type: 'bar',
          barWidth: '55%',
          itemStyle: { color: T.inkBlue, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: function (p) { return p.value >= 6 ? p.value.toFixed(1) + '%' : ''; },
            fontSize: 10
          },
          data: maleVals
        }
      ]
    }, true);

    setSource('chart2c-source', data.source || '');
    setInsight('chart2c-insight', '50 组同题材对照 · 左=女导演 · 右=男导演 · 年龄带分布');
  }

  function renderChart2d(data) {
    collabNetworkData = data;
    var host = $('chart2d');
    if (!host) return;

    if (charts.c2d) {
      charts.c2d.dispose();
      charts.c2d = null;
    }

    var layout = buildCollabArcLayout(data);
    var directorNodes = data.nodes.filter(function (n) { return n.category === 'director'; });
    var actressNodes = data.nodes.filter(function (n) { return n.category === 'actress'; });

    var arcs = layout.linkRows.map(function (row, idx) {
      var from = layout.directorPos[row.source];
      var to = layout.actressPos[row.target];
      var midX = (from.x + to.x) / 2;
      var strokeW = Math.min(2 + row.value * 2.2, 12);
      var opacity = 0.35 + row.value * 0.12;
      return (
        '<g class="collab-arc-link" data-idx="' + idx + '" tabindex="0">' +
          '<path class="collab-arc-ribbon" d="M' + from.x + ' ' + from.y +
            ' C ' + (from.x + 120) + ' ' + from.y + ', ' + (to.x - 120) + ' ' + to.y + ', ' + to.x + ' ' + to.y + '"' +
            ' fill="none" stroke="' + T.roseMain + '" stroke-width="' + strokeW + '" stroke-opacity="' + opacity + '" stroke-linecap="round"/>' +
          '<text class="collab-arc-count" x="' + midX + '" y="' + ((from.y + to.y) / 2 - 6) + '" text-anchor="middle">×' + row.value + '</text>' +
        '</g>'
      );
    }).join('');

    var directorMarkup = directorNodes.map(function (node) {
      var pos = layout.directorPos[node.id];
      if (!pos) return '';
      return (
        '<g class="collab-arc-node is-director" data-id="' + node.id + '" tabindex="0">' +
          '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="18" fill="' + T.roseDeep + '"/>' +
          '<text class="collab-arc-label" x="' + (pos.x - 24) + '" y="' + (pos.y + 4) + '" text-anchor="end">' + node.name + '</text>' +
        '</g>'
      );
    }).join('');

    var actressMarkup = actressNodes.map(function (node) {
      var pos = layout.actressPos[node.id];
      if (!pos) return '';
      return (
        '<g class="collab-arc-node is-actress" data-id="' + node.id + '" tabindex="0">' +
          '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="14" fill="' + T.roseLight + '"/>' +
          '<text class="collab-arc-label" x="' + (pos.x + 24) + '" y="' + (pos.y + 4) + '" text-anchor="start">' + node.name + '</text>' +
        '</g>'
      );
    }).join('');

    host.className = 'chart-canvas chart-tall collab-arc-host';
    host.innerHTML =
      '<div class="collab-arc-chart" aria-label="导演与女演员合作弧线图">' +
        '<svg viewBox="0 0 ' + layout.width + ' ' + layout.height + '" role="img">' +
          '<defs>' +
            '<linearGradient id="collab-arc-paper" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#f7f2e8"/>' +
              '<stop offset="100%" stop-color="#efe8da"/>' +
            '</linearGradient>' +
            '<linearGradient id="collab-arc-mist" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0%" stop-color="rgba(224,128,160,0.08)"/>' +
              '<stop offset="50%" stop-color="rgba(224,128,160,0.18)"/>' +
              '<stop offset="100%" stop-color="rgba(224,128,160,0.08)"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<rect width="100%" height="100%" fill="url(#collab-arc-paper)" rx="2"/>' +
          '<rect class="collab-arc-midfield" x="' + (layout.leftX + 40) + '" y="56" width="' + (layout.rightX - layout.leftX - 80) + '" height="' + (layout.height - 96) + '" rx="12" fill="url(#collab-arc-mist)"/>' +
          '<text class="collab-arc-colhead" x="' + layout.leftX + '" y="36" text-anchor="end">导演</text>' +
          '<text class="collab-arc-colhead" x="' + layout.rightX + '" y="36" text-anchor="start">女演员</text>' +
          '<text class="collab-arc-caption" x="' + (layout.width / 2) + '" y="58" text-anchor="middle">' +
            data.links.length + ' 条高频合作链 · ' + directorNodes.length + ' 位导演 · ' + actressNodes.length + ' 位演员' +
          '</text>' +
          '<g class="collab-arc-links">' + arcs + '</g>' +
          '<g class="collab-arc-nodes collab-arc-nodes-director">' + directorMarkup + '</g>' +
          '<g class="collab-arc-nodes collab-arc-nodes-actress">' + actressMarkup + '</g>' +
        '</svg>' +
      '</div>';

    function relatedIds(linkIdx) {
      var row = layout.linkRows[linkIdx];
      return { director: row.source, actress: row.target };
    }

    function setActiveLink(idx) {
      host.querySelectorAll('.collab-arc-link, .collab-arc-node').forEach(function (el) {
        el.classList.remove('is-active');
      });
      if (idx == null) return;
      var rel = relatedIds(idx);
      var linkEl = host.querySelector('.collab-arc-link[data-idx="' + idx + '"]');
      if (linkEl) linkEl.classList.add('is-active');
      host.querySelectorAll('.collab-arc-node').forEach(function (node) {
        var id = node.getAttribute('data-id');
        if (id === rel.director || id === rel.actress) node.classList.add('is-active');
      });
      var row = layout.linkRows[idx];
      setInsight(
        'chart2d-insight',
        '<strong>' + row.source + '</strong> ↔ <strong>' + row.target + '</strong> · 合作 <strong>' + row.value + '</strong> 次'
      );
    }

    function setActiveNode(id, category) {
      host.querySelectorAll('.collab-arc-link, .collab-arc-node').forEach(function (el) {
        el.classList.remove('is-active');
      });
      host.querySelectorAll('.collab-arc-node[data-id="' + id + '"]').forEach(function (el) {
        el.classList.add('is-active');
      });
      var matched = layout.linkRows.filter(function (row) {
        return category === 'director' ? row.source === id : row.target === id;
      });
      matched.forEach(function (row) {
        var linkIdx = layout.linkRows.indexOf(row);
        var linkEl = host.querySelector('.collab-arc-link[data-idx="' + linkIdx + '"]');
        if (linkEl) linkEl.classList.add('is-active');
      });
      var partners = matched.map(function (row) {
        return category === 'director' ? row.target + '×' + row.value : row.source + '×' + row.value;
      }).join(' · ');
      var role = category === 'director' ? '导演' : '演员';
      setInsight('chart2d-insight', '<strong>' + id + '</strong> · ' + role + ' · ' + partners);
    }

    host.querySelectorAll('.collab-arc-link').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      el.addEventListener('mouseenter', function () { setActiveLink(idx); });
      el.addEventListener('focus', function () { setActiveLink(idx); });
      el.addEventListener('mouseleave', resetCollabInsight);
      el.addEventListener('blur', resetCollabInsight);
    });

    host.querySelectorAll('.collab-arc-node').forEach(function (el) {
      var id = el.getAttribute('data-id');
      var category = el.classList.contains('is-director') ? 'director' : 'actress';
      el.addEventListener('mouseenter', function () { setActiveNode(id, category); });
      el.addEventListener('focus', function () { setActiveNode(id, category); });
      el.addEventListener('mouseleave', resetCollabInsight);
      el.addEventListener('blur', resetCollabInsight);
    });

    setSource('chart2d-source', data.source || '');
    resetCollabInsight();
  }

  var collabNetworkData = null;

  function buildCollabArcLayout(data) {
    var width = 720;
    var leftX = 108;
    var rightX = 612;
    var rowH = 46;
    var startY = 96;

    var linkRows = data.links.slice().sort(function (a, b) {
      if (a.source !== b.source) return a.source.localeCompare(b.source, 'zh');
      return a.target.localeCompare(b.target, 'zh');
    }).map(function (link, idx) {
      return {
        source: link.source,
        target: link.target,
        value: link.value,
        y: startY + idx * rowH
      };
    });

    var directorPos = {};
    var actressPos = {};
    var dirBuckets = {};

    linkRows.forEach(function (row) {
      actressPos[row.target] = { x: rightX, y: row.y };
      if (!dirBuckets[row.source]) dirBuckets[row.source] = [];
      dirBuckets[row.source].push(row.y);
    });

    Object.keys(dirBuckets).forEach(function (id) {
      var ys = dirBuckets[id];
      var avg = ys.reduce(function (sum, y) { return sum + y; }, 0) / ys.length;
      directorPos[id] = { x: leftX, y: avg };
    });

    var height = Math.max(360, startY + linkRows.length * rowH + 48);
    return {
      width: width,
      height: height,
      leftX: leftX,
      rightX: rightX,
      linkRows: linkRows,
      directorPos: directorPos,
      actressPos: actressPos
    };
  }

  function resetCollabInsight() {
    if (!collabNetworkData) return;
    var total = collabNetworkData.links.reduce(function (sum, l) { return sum + l.value; }, 0);
    setInsight(
      'chart2d-insight',
      collabNetworkData.links.length + ' 组固定搭档 · 累计合作 <strong>' + total + '</strong> 次 · 弧线越粗合作越密'
    );
  }

  function resizeChart2d() {
    if (collabNetworkData) renderChart2d(collabNetworkData);
  }

  function renderOccupationStack(data, domId, insightId, sourceId) {
    var chart = charts[domId] || initChart(domId);
    if (!chart) return;
    charts[domId] = chart;

    var categories = data.categories;
    var colors = [T.roseMain, T.roseLight, T.inkNote, T.inkBlue, T.inkRed, '#b89098'];
    var female = data.series.find(function (s) { return s.group === '女导演作品'; });
    var male = data.series.find(function (s) { return s.group === '男导演对照'; });

    function pcts(series) {
      return categories.map(function (cat) {
        var row = series.categories.find(function (c) { return c.label === cat; });
        return row ? row.pct : 0;
      });
    }

    chart.setOption({
      animationDuration: 900,
      grid: { left: 120, right: 48, top: 36, bottom: 48 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: categories, bottom: 0, textStyle: { fontSize: 9 } },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: ['女导演作品', '男导演对照'], axisTick: { show: false } },
      series: categories.map(function (cat, idx) {
        return {
          name: cat,
          type: 'bar',
          stack: 'occ',
          barWidth: '42%',
          itemStyle: { color: colors[idx % colors.length] },
          label: {
            show: true,
            position: 'inside',
            formatter: function (p) { return p.value >= 10 ? p.value.toFixed(0) + '%' : ''; },
            fontSize: 9,
            color: '#fff'
          },
          data: [pcts(female)[idx], pcts(male)[idx]]
        };
      })
    }, true);

    setSource(sourceId, data.source || '');
    setInsight(insightId, '专业/创意职业 · 女导演镜头下比例更高 · 悬停查看');
  }

  function renderSankey(groupKey, groupData, domId, sourceId, insightId, title) {
    var chart = charts[domId] || initChart(domId);
    if (!chart) return;
    charts[domId] = chart;

    var nodeNames = groupData.identityOrder.concat(groupData.endingOrder);
    var nodes = nodeNames.map(function (name) {
      var isIdentity = groupData.identityOrder.indexOf(name) >= 0;
      return {
        name: name,
        itemStyle: { color: isIdentity ? T.roseLight : (T.inkBlue || '#3a5f8a') }
      };
    });

    chart.setOption({
      title: { text: title, left: 'center', top: 0, textStyle: { fontSize: 12, color: T.inkNote } },
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        nodeGap: 10,
        left: 24,
        right: 24,
        top: 36,
        bottom: 12,
        data: nodes,
        links: groupData.links,
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.45 },
        label: { fontSize: 10, color: T.inkCharcoal }
      }]
    }, true);

    setSource(sourceId, '');
    setInsight(insightId, title + ' · 身份设定 → 结局类型 · 悬停查看流向宽度');
  }

  function renderChart2e(data) {
    renderOccupationStack(data, 'chart2e', 'chart2e-insight', 'chart2e-source');
  }

  function renderChart2f(data) {
    renderSankey('女导演作品', data.groups['女导演作品'], 'chart2f', 'chart2f-source', 'chart2f-insight', '女导演作品');
    renderSankey('男导演对照', data.groups['男导演对照'], 'chart2g', 'chart2g-source', 'chart2g-insight', '男导演对照');
    setSource('chart2f-source', data.source || '');
  }

  function resizeAll() {
    resizeChart2d();
    Object.keys(charts).forEach(function (key) {
      if (charts[key]) charts[key].resize();
    });
  }

  function initChapter02() {
    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) {
      console.warn('Chapter02: site data not ready');
      return;
    }
    C.registerSheDirectsTheme(echarts);

    Promise.all([
      loadJson('chapter02.genreButterfly').then(renderChart2a).catch(function (err) {
        showChartError('chart2a', '类型蝴蝶图加载失败<br>' + err.message);
      }),
      loadJson('chapter02.billingStack').then(renderChart2b).catch(function (err) {
        showChartError('chart2b', '番位图加载失败<br>' + err.message);
      }),
      loadJson('chapter02.heroineAge').then(renderChart2c).catch(function (err) {
        showChartError('chart2c', '年龄图加载失败<br>' + err.message);
      }),
      loadJson('chapter02.collabNetwork').then(renderChart2d).catch(function (err) {
        showChartError('chart2d', '合作网络加载失败<br>' + err.message);
      }),
      loadJson('chapter02.heroineOccupation').then(renderChart2e).catch(function (err) {
        showChartError('chart2e', '职业图加载失败<br>' + err.message);
      }),
      loadJson('chapter02.outcomeSankey').then(renderChart2f).catch(function (err) {
        showChartError('chart2f', '结局流向加载失败<br>' + err.message);
      })
    ]).then(function () {
      setTimeout(resizeAll, 200);
    });

    global.addEventListener('resize', resizeAll, { passive: true });
  }

  global.Chapter02 = { init: initChapter02, resize: resizeAll };
})(typeof window !== 'undefined' ? window : this);
