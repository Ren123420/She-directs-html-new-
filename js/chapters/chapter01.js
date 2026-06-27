/**
 * 第一章：她们在哪儿 · 5 个 ECharts 图表
 * 数据 + 配色变量 + 交互要求 + 嵌入上下文
 */
(function (global) {
  'use strict';

  var C = global.SheDirectsChart;
  var T = C.tokens;
  var charts = {};
  var chinaMapLoaded = false;

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

  function bindChartInsight(chart, insightId, buildHtml) {
    if (!chart || !insightId) return;
    chart.on('mouseover', function (params) {
      var html = buildHtml(params);
      if (html) setInsight(insightId, html);
    });
    chart.on('click', function (params) {
      var html = buildHtml(params);
      if (html) {
        setInsight(insightId, html + ' <span class="insight-tag">已选中</span>');
      }
    });
  }

  var PROVINCE_GEO = {
    '北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
    '河北': '河北省', '山西': '山西省', '辽宁': '辽宁省', '吉林': '吉林省',
    '黑龙江': '黑龙江省', '江苏': '江苏省', '浙江': '浙江省', '安徽': '安徽省',
    '福建': '福建省', '江西': '江西省', '山东': '山东省', '河南': '河南省',
    '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省', '海南': '海南省',
    '四川': '四川省', '贵州': '贵州省', '云南': '云南省', '陕西': '陕西省',
    '甘肃': '甘肃省', '青海': '青海省', '台湾': '台湾省', '内蒙古': '内蒙古自治区',
    '广西': '广西壮族自治区', '西藏': '西藏自治区', '宁夏': '宁夏回族自治区',
    '新疆': '新疆维吾尔自治区', '香港': '香港特别行政区', '澳门': '澳门特别行政区'
  };

  function showChartError(domId, msg) {
    var dom = $(domId);
    if (!dom) return;
    dom.innerHTML = '<div class="chart-error">' + msg + '</div>';
  }

  function afterRender() {
    requestAnimationFrame(function () {
      resizeAll();
      if (global.GenerationScrolly && global.GenerationScrolly.syncHeight) {
        global.GenerationScrolly.syncHeight();
      }
    });
  }

  function loadJson(path) {
    var map = {
      'data/chapter01/chart1-director-ratio.json': 'chapter01.chart1',
      'data/chapter01/chart2-generation.json': 'chapter01.chart2',
      'data/chapter01/chart3-birthplace-map.json': 'chapter01.chart3',
      'data/chapter01/chart4-survival.json': 'chapter01.chart4',
      'data/chapter01/chart5-career-sankey.json': 'chapter01.chart5'
    };
    var key = map[path];
    if (key && global.SheDirectsStore) {
      return global.SheDirectsStore.load(key);
    }
    return Promise.reject(new Error('无法加载 ' + path));
  }

  function ensureChinaMap() {
    if (chinaMapLoaded) return Promise.resolve();
    if (!global.SheDirectsStore) {
      return Promise.reject(new Error('缺少 SheDirectsStore'));
    }
    return global.SheDirectsStore.load('geo.china').then(function (geo) {
      echarts.registerMap('china', geo);
      chinaMapLoaded = true;
    });
  }

  function geoToProvinceKey(geoName) {
    var keys = Object.keys(PROVINCE_GEO);
    for (var i = 0; i < keys.length; i++) {
      if (PROVINCE_GEO[keys[i]] === geoName) return keys[i];
    }
    return geoName.replace(/(省|市|自治区|特别行政区)$/g, '');
  }

  /* ── 图表 1：年度女导演占比 · 双轴组合图（文案要求） ── */
  function renderChart1(data) {
    var chart = charts.c1 || initChart('chart1');
    if (!chart) return;
    charts.c1 = chart;

    var years = data.series.map(function (d) { return String(d.year); });
    var female = data.series.map(function (d) { return d.femaleDirectors; });
    var male = data.series.map(function (d) { return d.maleDirectors; });
    var pct = data.series.map(function (d) { return d.femaleDirectorPct; });

    chart.setOption({
      animationDuration: 900,
      grid: Object.assign(C.baseGrid(), { bottom: 72 }),
      tooltip: C.tooltipAxis(),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'filter' },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 18,
          bottom: 8,
          borderColor: T.paperArchive,
          fillerColor: 'rgba(224,128,160,0.25)',
          handleStyle: { color: T.roseDeep },
          textStyle: { fontFamily: C.fonts.mono, fontSize: 9, color: T.inkNote }
        }
      ],
      legend: {
        data: ['男导演', '女导演', '女导演占比'],
        bottom: 0
      },
      xAxis: { type: 'category', data: years, axisLabel: { interval: 2, fontSize: 14, fontFamily: C.fonts.mono } },
      yAxis: [
        {
          type: 'value',
          name: '活跃导演人数',
          nameTextStyle: { fontFamily: C.fonts.mono, fontSize: 12 },
          axisLabel: { fontSize: 14, fontFamily: C.fonts.mono },
          min: 0
        },
        {
          type: 'value',
          name: '占比 (%)',
          nameTextStyle: { fontFamily: C.fonts.mono, fontSize: 12 },
          axisLabel: { formatter: '{value}%', fontSize: 14, fontFamily: C.fonts.mono },
          min: 0,
          max: 14,
        }
      ],
      series: [
        {
          name: '男导演',
          type: 'bar',
          stack: 'directors',
          data: male,
          itemStyle: { color: '#6a8caa' },
          emphasis: { focus: 'series' }
        },
        {
          name: '女导演',
          type: 'bar',
          stack: 'directors',
          data: female,
          itemStyle: { color: '#d4899e' },
          emphasis: { focus: 'series' }
        },
        {
          name: '女导演占比',
          type: 'line',
          yAxisIndex: 1,
          data: pct,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: T.roseDeep, width: 2.5 },
          itemStyle: { color: T.roseDeep },
          markLine: C.ceilingMarkLine('10% 天花板')
        }
      ]
    }, true);

    setSource('chart1-source', data.source);
    bindChartInsight(chart, 'chart1-insight', function (p) {
      if (!p || p.componentType !== 'series') return '';
      var year = p.name;
      var row = data.series[p.dataIndex];
      if (!row) return '';
      return '<strong>' + year + ' 年</strong> · 女导演 ' + row.femaleDirectors +
        ' 人 / 男导演 ' + row.maleDirectors + ' 人 · 占比 <em>' + row.femaleDirectorPct + '%</em>';
    });
    chart._eraYears = years;
    afterRender();
  }

  var ERA_RANGES = {
    '2000s': ['2000', '2009'],
    '2010s': ['2010', '2019'],
    '2020s': ['2020', '2026']
  };

  function setChart1Era(eraKey) {
    var chart = charts.c1;
    if (!chart || !ERA_RANGES[eraKey]) return;
    var years = chart._eraYears || [];
    var range = ERA_RANGES[eraKey];
    var startIdx = years.indexOf(range[0]);
    var endIdx = years.indexOf(range[1]);
    if (startIdx < 0) startIdx = 0;
    if (endIdx < 0) endIdx = years.length - 1;
    var total = Math.max(years.length - 1, 1);
    chart.dispatchAction({
      type: 'dataZoom',
      start: (startIdx / total) * 100,
      end: (endIdx / total) * 100
    });
    setInsight('chart1-insight', '<strong>' + range[0] + '–' + range[1] + '</strong> · 年代翻页已切换 · 悬停查看各年数值');
  }

  /* ── 图表 2：代际 · 柱线组合图（文案：左轴占比柱 + 右轴男女活跃率折线） ── */
  function renderChart2(data) {
    var chart = charts.c2 || initChart('chart2');
    if (!chart) return;
    charts.c2 = chart;

    var gens = data.series.map(function (d) { return d.generation; });
    var fPct = data.series.map(function (d) { return d.femalePct; });
    var fAct = data.series.map(function (d) { return d.femaleActiveRate; });
    var mAct = data.series.map(function (d) { return d.maleActiveRate; });

    chart.setOption({
      animationDuration: 900,
      grid: C.baseGrid(),
      tooltip: C.tooltipAxis(),
      legend: {
        data: ['女导演占比', '女导演活跃率', '男导演活跃率'],
        bottom: 0,
        selectedMode: 'multiple'
      },
      xAxis: { type: 'category', data: gens },
      yAxis: [
        {
          type: 'value',
          name: '女导演占比 (%)',
          min: 0,
          max: 20,
          axisLabel: { formatter: '{value}%' }
        },
        {
          type: 'value',
          name: '活跃率 (%)',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: [
        {
          name: '女导演占比',
          type: 'bar',
          data: fPct,
          barWidth: '36%',
          itemStyle: { color: T.roseLight, borderColor: T.roseMain, borderWidth: 1 },
          emphasis: { focus: 'series', itemStyle: { color: T.roseMain } }
        },
        {
          name: '女导演活跃率',
          type: 'line',
          yAxisIndex: 1,
          data: fAct,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: T.roseDeep, width: 2.5 },
          itemStyle: { color: T.roseDeep, borderColor: '#fff', borderWidth: 1 }
        },
        {
          name: '男导演活跃率',
          type: 'line',
          yAxisIndex: 1,
          data: mAct,
          symbol: 'rect',
          symbolSize: 8,
          lineStyle: { color: T.inkBlue, width: 2.5 },
          itemStyle: { color: T.inkBlue, borderColor: '#fff', borderWidth: 1 }
        }
      ]
    }, true);

    setSource('chart2-source', data.source);
    bindChartInsight(chart, 'chart2-insight', function (p) {
      if (!p || p.componentType !== 'series') return '';
      var row = data.series[p.dataIndex];
      if (!row) return '';
      return '<strong>' + row.generation + '</strong> · 女导演占比 ' + row.femalePct +
        '% · 女活跃率 ' + row.femaleActiveRate + '% · 男活跃率 ' + row.maleActiveRate + '%';
    });
    afterRender();
  }

  /* ── 图表 3：出生地分布 · 中国地图（文案：点击省份查看导演名单） ── */
  function renderChart3(data) {
    var chart = charts.c3 || initChart('chart3');
    if (!chart) return;
    charts.c3 = chart;
    chart._regionDirectors = data.regionDirectors || {};

    var mapData = data.provinces
      .filter(function (d) { return d.name !== '待查' && d.name !== '资料待查'; })
      .map(function (d) {
        return { name: PROVINCE_GEO[d.name] || d.name, value: d.value };
      });

    var maxVal = Math.max.apply(null, mapData.map(function (d) { return d.value; }).concat([1]));

    chart.setOption({
      animationDuration: 1000,
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          return p.name + '<br/>' + (p.value || 0) + ' 位女导演';
        }
      },
      visualMap: {
        min: 0,
        max: maxVal,
        left: 16,
        bottom: 24,
        text: ['多', '少'],
        textStyle: { fontFamily: C.fonts.mono, fontSize: 10 },
        inRange: { color: [T.paperSticky, T.roseLight, T.roseMain, T.roseDeep] },
        calculable: false
      },
      series: [{
        type: 'map',
        map: 'china',
        roam: true,
        scaleLimit: { min: 0.85, max: 3 },
        zoom: 1.2,
        layoutCenter: ['50%', '52%'],
        layoutSize: '92%',
        label: { show: false },
        itemStyle: {
          areaColor: T.paperArchive,
          borderColor: T.inkNote,
          borderWidth: 0.6
        },
        emphasis: {
          itemStyle: { areaColor: T.roseLight },
          label: { show: true, color: T.inkCharcoal, fontSize: 10 }
        },
        select: {
          itemStyle: { areaColor: T.roseDeep, borderColor: T.inkCharcoal, borderWidth: 1.2 },
          label: { show: true, color: T.inkCharcoal, fontWeight: 'bold' }
        },
        selectedMode: 'single',
        data: mapData
      }]
    }, true);

    setSource('chart3-source', data.source);
    bindChartInsight(chart, 'chart3-insight', function (p) {
      if (!p || p.componentType !== 'series') return '';
      var key = geoToProvinceKey(p.name);
      var list = (chart._regionDirectors && chart._regionDirectors[key]) || [];
      var names = list.map(function (d) { return d.name; }).join('、');
      var html = '<strong>' + p.name + '</strong> · ' + (p.value || 0) + ' 位女导演';
      if (names) html += '<br/><span class="insight-list">' + names + '</span>';
      else if (key === '待查') html += '<br/><span class="insight-list">出生地待查</span>';
      return html;
    });
    chart.on('click', function (params) {
      if (!params || params.componentType !== 'series') return;
      var key = geoToProvinceKey(params.name);
      var list = (chart._regionDirectors && chart._regionDirectors[key]) || [];
      var names = list.map(function (d) { return d.name; }).join('、');
      var html = '<strong>' + params.name + '</strong> · ' + (params.value || 0) + ' 位女导演';
      if (names) {
        html += '<br/><span class="insight-list">' + names + '</span>';
      }
      setInsight('chart3-insight', html + ' <span class="insight-tag">已选中</span>');
    });
    afterRender();
  }

  /* ── 图表 4：Kaplan-Meier 存活曲线（文案：累积存活率，非普通折线） ── */
  function renderChart4(data) {
    var chart = charts.c4 || initChart('chart4');
    if (!chart) return;
    charts.c4 = chart;

    var labels = data.survival.map(function (d) { return d.label; });
    var pcts = data.survival.map(function (d) { return d.pct; });

    chart.setOption({
      animationDuration: 900,
      grid: C.baseGrid(),
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          var p = params[0];
          var item = data.survival[p.dataIndex];
          return p.name + '<br/>存活率：' + item.pct + '%<br/>（' + item.count + ' / ' + data.totalDirectors + ' 人）';
        }
      },
      xAxis: {
        type: 'category',
        data: labels,
        name: '作品序号',
        nameTextStyle: { fontFamily: C.fonts.mono, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: '累积存活率 (%)',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        type: 'line',
        data: pcts,
        step: 'end',
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { color: T.roseDeep, width: 3 },
        itemStyle: { color: T.roseDeep },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(224,128,160,0.35)' },
            { offset: 1, color: 'rgba(244,239,228,0.05)' }
          ])
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 52,
          label: {
            fontFamily: C.fonts.mono,
            fontSize: 11,
            fontWeight: 'bold',
            color: T.inkCharcoal
          },
          data: [
            { coord: [labels[1], pcts[1]], value: pcts[1] + '%', itemStyle: { color: T.roseLight } },
            { coord: [labels[4], pcts[4]], value: pcts[4] + '%', itemStyle: { color: T.roseMain } }
          ]
        }
      }]
    }, true);

    setSource('chart4-source', data.source);
    var callout = $('chart4-callout');
    if (callout) {
      callout.textContent = data.annotations.film2 + ' · ' + data.annotations.film5;
    }
    bindChartInsight(chart, 'chart4-insight', function (p) {
      if (!p || p.componentType !== 'series') return '';
      var item = data.survival[p.dataIndex];
      if (!item) return '';
      return '<strong>' + item.label + '</strong> · 存活率 ' + item.pct +
        '%（' + item.count + ' / ' + data.totalDirectors + ' 位导演）';
    });
    afterRender();
  }

  /* ── 图表 5：女导演入行路径 · 桑基图 ── */
  var SANKEY_LABELS = {
    '编剧/文字': '编剧/作家',
    '演员/表演': '演员',
    '记者/媒体': '记者/媒体人',
    '行业内部过渡': '副导演/助理/剪辑',
    '家庭/其他': '家庭主妇/全职妈妈',
    '独立/自筹': '独立制片/自筹资金',
    '政府/机构资助': '政府扶持',
    '创投/众筹': '创投平台',
    '个人/海外': '海外投资'
  };

  var SANKEY_HIGHLIGHT = [
    '科班|编剧/文字', '编剧/文字|商业投资',
    '科班|演员/表演', '演员/表演|商业投资',
    '非科班|记者/媒体', '记者/媒体|独立/自筹',
    '非科班|编剧/文字', '编剧/文字|独立/自筹',
    '非科班|家庭/其他', '家庭/其他|独立/自筹'
  ];

  function sankeyDisplayName(name) {
    return SANKEY_LABELS[name] || name;
  }

  function isHighlightLink(source, target) {
    return SANKEY_HIGHLIGHT.indexOf(source + '|' + target) !== -1;
  }

  function renderChart5(data) {
    var chart = charts.c5 || initChart('chart5');
    if (!chart) return;
    charts.c5 = chart;

    var fundRe = /投资|资助|自筹|众筹|其他|海外/;
    var coloredNodes = data.nodes.map(function (n) {
      var depth = 1;
      if (n.name === '科班' || n.name === '非科班') depth = 0;
      else if (fundRe.test(n.name)) depth = 2;

      var color = T.roseMain;
      if (depth === 0) color = n.name === '科班' ? T.inkCharcoal : T.inkNote;
      if (depth === 2) color = T.roseDeep;

      return {
        name: n.name,
        itemStyle: { color: color, borderColor: 'rgba(244,239,228,0.6)', borderWidth: 1 },
        depth: depth,
        label: {
          formatter: function (params) {
            return sankeyDisplayName(params.name);
          }
        }
      };
    });

    var links = data.links.map(function (l) {
      var source = data.nodes[l.source].name;
      var target = data.nodes[l.target].name;
      var highlight = isHighlightLink(source, target);
      return {
        source: source,
        target: target,
        value: l.value,
        lineStyle: {
          color: highlight ? T.roseDeep : T.roseLight,
          opacity: highlight ? 0.72 : 0.28,
          curveness: 0.5
        },
        emphasis: {
          lineStyle: { opacity: 0.92, color: T.roseDeep }
        }
      };
    });

    chart.setOption({
      animationDuration: 1200,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          if (p.dataType === 'edge') {
            return sankeyDisplayName(p.data.source) + ' → ' +
              sankeyDisplayName(p.data.target) + '<br/>' + p.data.value + ' 人';
          }
          return sankeyDisplayName(p.name);
        }
      },
      graphic: [
        {
          type: 'text',
          left: '6%',
          top: 18,
          style: {
            text: '教育背景',
            fill: T.inkNote,
            font: '600 11px ' + C.fonts.mono,
            letterSpacing: 2
          }
        },
        {
          type: 'text',
          left: 'center',
          top: 18,
          style: {
            text: '入行前职业',
            fill: T.inkNote,
            font: '600 11px ' + C.fonts.mono,
            letterSpacing: 2
          }
        },
        {
          type: 'text',
          right: '6%',
          top: 18,
          style: {
            text: '首作资金来源',
            fill: T.inkNote,
            font: '600 11px ' + C.fonts.mono,
            letterSpacing: 2,
            textAlign: 'right'
          }
        }
      ],
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        left: '4%',
        right: '6%',
        top: 48,
        bottom: 16,
        nodeGap: 12,
        nodeWidth: 20,
        draggable: false,
        lineStyle: { color: 'gradient', curveness: 0.48, opacity: 0.32 },
        label: {
          fontFamily: C.fonts.serif,
          fontSize: 11,
          color: T.inkCharcoal,
          formatter: function (params) {
            return sankeyDisplayName(params.name);
          }
        },
        levels: [
          {
            depth: 0,
            itemStyle: { color: T.paperSticky, borderColor: T.paperArchive },
            label: { fontWeight: 700 }
          },
          {
            depth: 1,
            itemStyle: { color: T.roseLight, borderColor: 'rgba(244,239,228,0.5)' }
          },
          {
            depth: 2,
            itemStyle: { color: T.roseDeep, borderColor: 'rgba(244,239,228,0.45)' },
            label: { color: T.paperCanvas, fontWeight: 600 }
          }
        ],
        data: coloredNodes,
        links: links
      }]
    }, true);

    setSource('chart5-source', data.source);
    bindChartInsight(chart, 'chart5-insight', function (p) {
      if (!p) return '';
      if (p.dataType === 'edge') {
        return '<strong>' + sankeyDisplayName(p.data.source) + ' → ' +
          sankeyDisplayName(p.data.target) + '</strong> · ' + p.data.value + ' 人';
      }
      if (p.dataType === 'node') {
        return '<strong>' + sankeyDisplayName(p.name) + '</strong> · 悬停查看路径';
      }
      return '';
    });
    afterRender();
  }

  function resizeAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k]) charts[k].resize();
    });
  }

  function initChapter01() {
    if (!global.SheDirectsChart || !global.echarts) {
      console.error('Chapter01: 缺少 SheDirectsChart 或 echarts');
      return;
    }
    C.registerSheDirectsTheme(echarts);

    function loadChart(step, domId, loader) {
      return loader().catch(function (err) {
        console.error(step, err);
        showChartError(domId, '图表加载失败<br>' + (err.message || err));
      });
    }

    /* 进入页面即加载全部图表，不依赖滚到才渲染 */
    Promise.all([
      loadChart('chart1', 'chart1', function () {
        return loadJson('data/chapter01/chart1-director-ratio.json').then(renderChart1);
      }),
      loadChart('chart2', 'chart2', function () {
        return loadJson('data/chapter01/chart2-generation.json').then(renderChart2);
      }),
      loadChart('chart3', 'chart3', function () {
        return ensureChinaMap()
          .then(function () { return loadJson('data/chapter01/chart3-birthplace-map.json'); })
          .then(renderChart3);
      }),
      loadChart('chart4', 'chart4', function () {
        return loadJson('data/chapter01/chart4-survival.json').then(renderChart4);
      }),
      loadChart('chart5', 'chart5', function () {
        return loadJson('data/chapter01/chart5-career-sankey.json').then(renderChart5);
      })
    ]).then(function () {
      setTimeout(resizeAll, 200);
    });

    window.addEventListener('resize', resizeAll, { passive: true });
  }

  global.Chapter01 = {
    init: initChapter01,
    resize: resizeAll,
    setEra: setChart1Era
  };
})(typeof window !== 'undefined' ? window : this);
