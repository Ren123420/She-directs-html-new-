/**
 * 第三章扩展：议题力导向网络 + 情感河流图
 */
(function (global) {
  'use strict';

  var C = global.SheDirectsChart;
  var charts = {};

  function $(id) { return document.getElementById(id); }

  function setSource(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function setInsight(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  var issueNetworkData = null;

  function renderIssueNetwork(data) {
    issueNetworkData = data;
    if (!global.IssueAtlas) {
      var host = $('chart3-issue');
      if (host) host.innerHTML = '<p class="ifg-error">议题图谱未加载</p>';
      return;
    }
    global.IssueAtlas.render('chart3-issue', data);
    setSource('chart3-issue-source', data.source || '');
    setInsight(
      'chart3-issue-insight',
      'Issue Atlas · 悬停议题 / 点击弧线 · 右侧 <strong>≥5</strong> 筛选与影片下拉高亮路径'
    );
  }

  function resizeIssueNetwork() {
    if (global.IssueAtlas) global.IssueAtlas.resize('chart3-issue');
  }

  function renderEmotionRivers(data) {
    if (!data.films || !data.films.length) return;
    if (!global.EmotionRiversBoard) {
      var host = $('chart3-river-board');
      if (host) host.innerHTML = '<p class="chart-error">情感河流看板未加载</p>';
      return;
    }
    global.EmotionRiversBoard.render('chart3-river-board', data);
    setSource('chart3-river-source', data.source || '');
    setInsight(
      'chart3-river-insight',
      '情绪滤镜 · 阶段缩放 · 时间浮标联动切片 · 玫瑰层叠为正向、下方蓝灰为负向'
    );
  }

  function resizeEmotionRivers() {
    if (global.EmotionRiversBoard) global.EmotionRiversBoard.resize('chart3-river-board');
  }

  function resizeAll() {
    resizeIssueNetwork();
    resizeEmotionRivers();
    Object.keys(charts).forEach(function (key) {
      if (charts[key]) charts[key].resize();
    });
  }

  function initChapter03Extra() {
    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) return;
    C.registerSheDirectsTheme(echarts);

    Promise.all([
      global.SheDirectsStore.load('chapter03.issueNetwork').then(renderIssueNetwork).catch(function (err) {
        console.error('议题网络', err);
      }),
      global.SheDirectsStore.load('chapter03.emotionRivers').then(renderEmotionRivers).catch(function (err) {
        console.error('情感河流', err);
      })
    ]).then(function () {
      setTimeout(resizeAll, 200);
    }).catch(function (err) {
      console.error('Chapter03Extra', err);
    });

    global.addEventListener('resize', resizeAll, { passive: true });
  }

  global.Chapter03Extra = { init: initChapter03Extra, resize: resizeAll };
})(typeof window !== 'undefined' ? window : this);
