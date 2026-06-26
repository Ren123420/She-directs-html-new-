/**
 * 女导演议题力导向网络图 · G6 渲染（暗色科技风）
 */
(function (global) {
  'use strict';

  var M = global.IssueForceMetrics;
  if (!M) return;

  var COLORS = {
    film: { fill: '#1d4ed8', stroke: '#38bdf8', label: '#e0f2fe' },
    topic: { fill: '#c2410c', stroke: '#fb923c', label: '#ffedd5' },
    edge: '#475569',
    edgeActive: '#22d3ee',
    bg: '#070b14'
  };

  function $(sel, root) { return (root || document).querySelector(sel); }

  function renderDetailHtml(detail) {
    if (!detail) return '';
    if (detail.mode === 'global') {
      return '<p class="ifg-detail-kicker">GLOBAL STATS</p><h3>' + detail.title + '</h3><ul>' +
        detail.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    }
    if (detail.mode === 'film') {
      return '<p class="ifg-detail-kicker">FILM NODE</p><h3>《' + detail.title + '》</h3>' +
        '<p class="ifg-detail-meta">总关联长评 <strong>' + detail.total + '</strong> 条（不含「其他」计入节点大小）</p>' +
        '<ul class="ifg-detail-list">' +
        detail.items.map(function (it) {
          return '<li><span>' + it.name + '</span><em>' + it.weight + ' 条</em></li>';
        }).join('') + '</ul>';
    }
    return '<p class="ifg-detail-kicker">TOPIC NODE</p><h3>' + detail.title + '</h3>' +
      '<p class="ifg-detail-meta">总出现 <strong>' + detail.total + '</strong> 条长评</p>' +
      '<ul class="ifg-detail-list">' +
      detail.items.map(function (it) {
        return '<li><span>《' + it.name + '》</span><em>' + it.weight + ' 条</em></li>';
      }).join('') + '</ul>';
  }

  function applyFocusStates(graph, graphData) {
    var neighbors = graphData.focusNeighbors;
    if (!neighbors) {
      graph.getNodes().forEach(function (n) { graph.clearItemStates(n, ['inactive', 'focus']); });
      graph.getEdges().forEach(function (e) { graph.clearItemStates(e, ['inactive', 'focus']); });
      return;
    }
    graph.getNodes().forEach(function (item) {
      var id = item.getID();
      var on = !!neighbors[id];
      graph.setItemState(item, 'inactive', !on);
      graph.setItemState(item, 'focus', id === graphData.focusId);
    });
    graph.getEdges().forEach(function (item) {
      var m = item.getModel();
      var on = neighbors[m.source] && neighbors[m.target];
      graph.setItemState(item, 'inactive', !on);
      graph.setItemState(item, 'focus', on);
    });
  }

  function applyHoverStates(graph, centerId) {
    var neighborMap = {};
    graph.getEdges().forEach(function (edge) {
      var m = edge.getModel();
      if (!neighborMap[m.source]) neighborMap[m.source] = {};
      if (!neighborMap[m.target]) neighborMap[m.target] = {};
      neighborMap[m.source][m.target] = true;
      neighborMap[m.target][m.source] = true;
    });
    var neighbors = neighborMap[centerId] || {};
    neighbors[centerId] = true;

    graph.getNodes().forEach(function (item) {
      var id = item.getID();
      var on = !!neighbors[id];
      graph.setItemState(item, 'inactive', !on);
      graph.setItemState(item, 'hover', id === centerId);
    });
    graph.getEdges().forEach(function (item) {
      var m = item.getModel();
      var on = neighbors[m.source] && neighbors[m.target];
      graph.setItemState(item, 'inactive', !on);
      graph.setItemState(item, 'hover', on);
    });
  }

  function clearHoverStates(graph) {
    graph.getNodes().forEach(function (n) { graph.clearItemStates(n, ['inactive', 'hover']); });
    graph.getEdges().forEach(function (e) { graph.clearItemStates(e, ['inactive', 'hover']); });
  }

  function IssueForceBoard(container, dataset) {
    this.container = container;
    this.dataset = dataset;
    this.threshold = 0;
    this.focusId = '__all__';
    this.graph = null;
    this.hovering = false;
    this._buildShell();
    this._bindControls();
    this._initGraph();
    this.refresh();
  }

  IssueForceBoard.prototype._buildShell = function () {
    this.container.className = 'chart-canvas chart-tall issue-force-host';
    this.container.innerHTML =
      '<div class="ifg-board">' +
        '<div class="ifg-graph-wrap"><div class="ifg-graph-canvas"></div></div>' +
        '<aside class="ifg-controls">' +
          '<p class="ifg-controls-title">阈值筛选</p>' +
          '<div class="ifg-thresholds">' +
            ['全部', '&gt;2', '&gt;3', '&gt;5'].map(function (label, i) {
              var vals = [0, 2, 3, 5];
              return '<button type="button" class="ifg-threshold-btn' + (vals[i] === 0 ? ' is-active' : '') + '" data-threshold="' + vals[i] + '">' + label + '</button>';
            }).join('') +
          '</div>' +
          '<p class="ifg-controls-title">聚焦节点</p>' +
          '<select class="ifg-focus-select" aria-label="选择影片或议题"></select>' +
        '</aside>' +
        '<div class="ifg-detail" aria-live="polite"></div>' +
      '</div>';
    this.canvasEl = $('.ifg-graph-canvas', this.container);
    this.detailEl = $('.ifg-detail', this.container);
    this.selectEl = $('.ifg-focus-select', this.container);
    var opts = M.dropdownOptions(this.dataset);
    this.selectEl.innerHTML = opts.map(function (o) {
      var prefix = o.group === 'film' ? '影片 · ' : (o.group === 'topic' ? '议题 · ' : '');
      return '<option value="' + o.id + '">' + prefix + o.name + '</option>';
    }).join('');
  };

  IssueForceBoard.prototype._bindControls = function () {
    var self = this;
    this.container.querySelectorAll('.ifg-threshold-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.threshold = parseInt(btn.getAttribute('data-threshold'), 10) || 0;
        self.container.querySelectorAll('.ifg-threshold-btn').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        self.refresh();
      });
    });
    this.selectEl.addEventListener('change', function () {
      self.focusId = self.selectEl.value || '__all__';
      self.refresh();
    });
  };

  IssueForceBoard.prototype._initGraph = function () {
    if (!global.G6) {
      this.canvasEl.innerHTML = '<p class="ifg-error">G6 未加载，请检查网络后刷新</p>';
      return;
    }
    var w = this.canvasEl.clientWidth || 720;
    var h = Math.max(480, this.canvasEl.clientHeight || 520);
    var self = this;

    this.graph = new global.G6.Graph({
      container: this.canvasEl,
      width: w,
      height: h,
      fitView: true,
      fitViewPadding: 36,
      animate: true,
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] },
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSpacing: 12,
        linkDistance: function (edge) { return 90 + (edge.weight || 1) * 4; },
        nodeStrength: -220,
        edgeStrength: 0.35,
        collideStrength: 0.9
      },
      defaultNode: {
        type: 'circle',
        style: { cursor: 'pointer' },
        labelCfg: {
          position: 'bottom',
          offset: 6,
          style: { fontSize: 10, fill: '#94a3b8' }
        }
      },
      defaultEdge: {
        type: 'quadratic',
        style: {
          stroke: COLORS.edge,
          opacity: 0.55,
          lineAppendWidth: 6,
          endArrow: false
        }
      },
      nodeStateStyles: {
        hover: { lineWidth: 3, shadowColor: '#22d3ee', shadowBlur: 16 },
        focus: { lineWidth: 3, shadowColor: '#22d3ee', shadowBlur: 20 },
        inactive: { opacity: 0.12, fillOpacity: 0.12 }
      },
      edgeStateStyles: {
        hover: { stroke: COLORS.edgeActive, opacity: 0.95, lineWidth: 3 },
        focus: { stroke: COLORS.edgeActive, opacity: 0.9 },
        inactive: { opacity: 0.06 }
      }
    });

    this.graph.on('node:mouseenter', function (evt) {
      self.hovering = true;
      applyHoverStates(self.graph, evt.item.getID());
    });
    this.graph.on('node:mouseleave', function () {
      self.hovering = false;
      clearHoverStates(self.graph);
      applyFocusStates(self.graph, self._lastGraphData);
    });
    this.graph.on('canvas:click', function () {
      self.focusId = '__all__';
      self.selectEl.value = '__all__';
      self.refresh();
    });
    this.graph.on('node:click', function (evt) {
      self.focusId = evt.item.getID();
      self.selectEl.value = self.focusId;
      self.refresh();
    });
  };

  IssueForceBoard.prototype.refresh = function () {
    if (!this.graph) return;
    var graphData = M.buildGraphData(this.dataset, this.threshold, this.focusId);
    this._lastGraphData = graphData;

    var g6Data = {
      nodes: graphData.nodes.map(function (n) {
        var c = n.nodeType === 'film' ? COLORS.film : COLORS.topic;
        return {
          id: n.id,
          label: n.label,
          size: n.size,
          nodeType: n.nodeType,
          totalWeight: n.totalWeight,
          style: {
            fill: c.fill,
            stroke: c.stroke,
            lineWidth: 2,
            fillOpacity: 0.92
          },
          labelCfg: { style: { fill: c.label, fontSize: n.size > 30 ? 11 : 9 } }
        };
      }),
      edges: graphData.edges.map(function (e) {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          weight: e.weight,
          label: String(e.weight),
          style: {
            stroke: COLORS.edge,
            lineWidth: e.style.lineWidth,
            opacity: 0.5
          },
          labelCfg: {
            autoRotate: true,
            style: { fontSize: 9, fill: '#64748b', background: { fill: 'rgba(7,11,20,0.6)', padding: [2, 4, 2, 4], radius: 2 } }
          }
        };
      })
    };

    this.graph.changeData(g6Data);
    this.graph.layout();
    if (!this.hovering) applyFocusStates(this.graph, graphData);

    var detail = M.buildDetailPanel(this.dataset, this.focusId, this.threshold);
    if (this.detailEl) this.detailEl.innerHTML = renderDetailHtml(detail);
  };

  IssueForceBoard.prototype.resize = function () {
    if (!this.graph || !this.canvasEl) return;
    var w = this.canvasEl.clientWidth || 720;
    var h = Math.max(480, this.canvasEl.clientHeight || 520);
    this.graph.changeSize(w, h);
    this.graph.fitView(36);
  };

  IssueForceBoard.prototype.destroy = function () {
    if (this.graph) {
      this.graph.destroy();
      this.graph = null;
    }
  };

  var instances = {};

  global.IssueForceG6 = {
    render: function (containerId, rawData) {
      var el = document.getElementById(containerId);
      if (!el) return null;
      if (instances[containerId]) {
        instances[containerId].destroy();
      }
      var dataset = M.fromLegacyData(rawData);
      var board = new IssueForceBoard(el, dataset);
      instances[containerId] = board;
      return board;
    },
    resize: function (containerId) {
      if (instances[containerId]) instances[containerId].resize();
    },
    destroy: function (containerId) {
      if (instances[containerId]) {
        instances[containerId].destroy();
        delete instances[containerId];
      }
    }
  };
})(typeof window !== 'undefined' ? window : global);
