/**
 * 她执导 · ECharts 全局主题（纸基 + 玫瑰粉 + 场记板）
 * 所有章节图表 init 前调用 registerSheDirectsTheme(echarts)
 */
(function (global) {
  'use strict';

  var TOKENS = {
    paperCanvas: '#f4efe4',
    paperSticky: '#ece5d8',
    paperArchive: '#e0d8c8',
    inkCharcoal: '#2c2416',
    inkNote: '#6b5e4a',
    inkRed: '#8c3a3a',
    inkBlue: '#3a5f8a',
    roseMain: '#e080a0',
    roseLight: '#e0a0c0',
    roseDeep: '#c06078',
    white: '#ffffff'
  };

  var FONT_SERIF = "'Huiwen', 'Noto Serif SC', 'STSong', serif";
  var FONT_MONO = "'Punk Typewriter', 'Courier New', monospace";

  function registerSheDirectsTheme(echarts) {
    if (!echarts || echarts._sheDirectsThemeRegistered) return;
    echarts.registerTheme('she-directs', {
      color: [TOKENS.roseMain, TOKENS.inkRed, TOKENS.roseDeep, TOKENS.roseLight, TOKENS.inkNote, TOKENS.inkCharcoal],
      backgroundColor: 'transparent',
      textStyle: { fontFamily: FONT_SERIF, color: TOKENS.inkCharcoal },
      title: {
        textStyle: { fontFamily: FONT_SERIF, color: TOKENS.inkCharcoal, fontWeight: 700 },
        subtextStyle: { fontFamily: FONT_MONO, color: TOKENS.inkNote, fontSize: 12 }
      },
      legend: {
        textStyle: { fontFamily: FONT_MONO, color: TOKENS.inkNote, fontSize: 12 },
        itemGap: 14,
        itemWidth: 18,
        itemHeight: 10
      },
      tooltip: {
        backgroundColor: 'rgba(44,36,22,0.92)',
        borderColor: TOKENS.roseMain,
        borderWidth: 1,
        textStyle: { fontFamily: FONT_MONO, color: TOKENS.paperCanvas, fontSize: 12 }
      },
      categoryAxis: {
        axisLine: { lineStyle: { color: TOKENS.paperArchive } },
        axisTick: { lineStyle: { color: TOKENS.paperArchive } },
        axisLabel: { fontFamily: FONT_MONO, color: TOKENS.inkNote, fontSize: 12 },
        splitLine: { lineStyle: { color: TOKENS.paperArchive, type: 'dashed' } }
      },
      valueAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontFamily: FONT_MONO, color: TOKENS.inkNote, fontSize: 12 },
        splitLine: { lineStyle: { color: TOKENS.paperArchive, type: 'dashed' } }
      }
    });
    echarts._sheDirectsThemeRegistered = true;
  }

  function baseGrid() {
    return { left: 64, right: 80, top: 72, bottom: 52, containLabel: true };
  }

  function ceilingMarkLine(label) {
    return {
      silent: true,
      symbol: 'none',
      lineStyle: { color: TOKENS.roseDeep, type: 'dashed', width: 1.5 },
      label: {
        show: true,
        formatter: label || '10% 天花板',
        fontFamily: FONT_MONO,
        fontSize: 10,
        color: TOKENS.roseDeep
      },
      data: [{ yAxis: 10 }]
    };
  }

  function tooltipAxis(trigger) {
    return {
      trigger: trigger || 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: TOKENS.inkNote } }
    };
  }

  global.SheDirectsChart = {
    tokens: TOKENS,
    fonts: { serif: FONT_SERIF, mono: FONT_MONO },
    registerSheDirectsTheme: registerSheDirectsTheme,
    baseGrid: baseGrid,
    ceilingMarkLine: ceilingMarkLine,
    tooltipAxis: tooltipAxis
  };
})(typeof window !== 'undefined' ? window : this);
