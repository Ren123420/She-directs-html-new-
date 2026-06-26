/**
 * 女导演议题力导向网络图 · 节点大小与图数据计算
 * 影片节点大小 = 可见边 weight 之和（排除指向「其他」的边）
 * 议题节点大小 = 可见边指向该议题的 weight 之和
 */
(function (global) {
  'use strict';

  var OTHER_TOPIC = '其他';

  function fromLegacyData(raw) {
    if (!raw || !raw.nodes) return { nodes: [], edges: [], source: '' };
    var nodes = raw.nodes.map(function (n) {
      return {
        id: n.id,
        name: n.name || n.id,
        type: n.category === 'film' ? 'film' : 'topic'
      };
    });
    var edges = (raw.links || []).map(function (l) {
      return { source: l.source, target: l.target, weight: l.value || 0 };
    });
    return { nodes: nodes, edges: edges, source: raw.source || '' };
  }

  function filterEdgesByThreshold(edges, threshold) {
    if (!threshold) return edges.slice();
    return edges.filter(function (e) { return e.weight > threshold; });
  }

  function computeWeights(edges) {
    var filmWeight = {};
    var topicWeight = {};
    edges.forEach(function (e) {
      topicWeight[e.target] = (topicWeight[e.target] || 0) + e.weight;
      if (e.target !== OTHER_TOPIC) {
        filmWeight[e.source] = (filmWeight[e.source] || 0) + e.weight;
      }
    });
    return { filmWeight: filmWeight, topicWeight: topicWeight };
  }

  function scaleSize(value, minVal, maxVal, minSize, maxSize) {
    if (!value || value <= 0) return 0;
    if (maxVal <= minVal) return (minSize + maxSize) / 2;
    var t = (Math.sqrt(value) - Math.sqrt(minVal)) / (Math.sqrt(maxVal) - Math.sqrt(minVal));
    return minSize + Math.max(0, Math.min(1, t)) * (maxSize - minSize);
  }

  function buildGraphData(dataset, threshold, focusId) {
    var nodes = dataset.nodes;
    var edges = filterEdgesByThreshold(dataset.edges, threshold);
    var weights = computeWeights(edges);
    var filmVals = Object.keys(weights.filmWeight).map(function (k) { return weights.filmWeight[k]; });
    var topicVals = Object.keys(weights.topicWeight).map(function (k) { return weights.topicWeight[k]; });
    var filmMin = filmVals.length ? Math.min.apply(null, filmVals) : 1;
    var filmMax = filmVals.length ? Math.max.apply(null, filmVals) : 1;
    var topicMin = topicVals.length ? Math.min.apply(null, topicVals) : 1;
    var topicMax = topicVals.length ? Math.max.apply(null, topicVals) : 1;

    var activeNodeIds = {};
    edges.forEach(function (e) {
      activeNodeIds[e.source] = true;
      activeNodeIds[e.target] = true;
    });

    var gNodes = nodes.filter(function (n) { return activeNodeIds[n.id]; }).map(function (n) {
      var w = n.type === 'film' ? (weights.filmWeight[n.id] || 0) : (weights.topicWeight[n.id] || 0);
      var size = n.type === 'film'
        ? scaleSize(w, filmMin, filmMax, 18, 52)
        : scaleSize(w, topicMin, topicMax, 20, 56);
      return {
        id: n.id,
        label: n.name,
        nodeType: n.type,
        totalWeight: w,
        size: Math.max(size, 14)
      };
    });

    var gEdges = edges.map(function (e, i) {
      return {
        id: 'e-' + i + '-' + e.source + '-' + e.target,
        source: e.source,
        target: e.target,
        weight: e.weight,
        style: { lineWidth: Math.max(1, Math.min(12, 0.8 + e.weight * 0.65)) }
      };
    });

    var neighborMap = {};
    gNodes.forEach(function (n) { neighborMap[n.id] = {}; });
    gEdges.forEach(function (e) {
      neighborMap[e.source][e.target] = true;
      neighborMap[e.target][e.source] = true;
    });

    var focusNeighbors = null;
    if (focusId && focusId !== '__all__' && neighborMap[focusId]) {
      focusNeighbors = Object.assign({ __self__: true }, neighborMap[focusId]);
      focusNeighbors[focusId] = true;
    }

    return {
      nodes: gNodes,
      edges: gEdges,
      focusId: focusId,
      focusNeighbors: focusNeighbors,
      stats: {
        filmCount: gNodes.filter(function (n) { return n.nodeType === 'film'; }).length,
        topicCount: gNodes.filter(function (n) { return n.nodeType === 'topic'; }).length,
        edgeCount: gEdges.length
      }
    };
  }

  function buildDetailPanel(dataset, focusId, threshold) {
    var edges = filterEdgesByThreshold(dataset.edges, threshold);
    if (!focusId || focusId === '__all__') {
      var films = dataset.nodes.filter(function (n) { return n.type === 'film'; });
      var topics = dataset.nodes.filter(function (n) { return n.type === 'topic'; });
      return {
        mode: 'global',
        title: '全部关系',
        lines: [
          '影片节点：' + films.length,
          '议题节点：' + topics.length,
          '当前可见边：' + edges.length,
          '阈值：' + (threshold ? '>' + threshold : '全部')
        ]
      };
    }

    var node = null;
    var i;
    for (i = 0; i < dataset.nodes.length; i += 1) {
      if (dataset.nodes[i].id === focusId) { node = dataset.nodes[i]; break; }
    }
    if (!node) return { mode: 'global', title: '全部关系', lines: [] };

    if (node.type === 'film') {
      var related = edges.filter(function (e) { return e.source === focusId; })
        .sort(function (a, b) { return b.weight - a.weight; });
      var total = related.reduce(function (s, e) { return s + e.weight; }, 0);
      return {
        mode: 'film',
        title: node.name,
        total: total,
        items: related.map(function (e) { return { name: e.target, weight: e.weight }; })
      };
    }

    var inv = edges.filter(function (e) { return e.target === focusId; })
      .sort(function (a, b) { return b.weight - a.weight; });
    var topicTotal = inv.reduce(function (s, e) { return s + e.weight; }, 0);
    return {
      mode: 'topic',
      title: node.name,
      total: topicTotal,
      items: inv.map(function (e) { return { name: e.source, weight: e.weight }; })
    };
  }

  function dropdownOptions(dataset) {
    var films = dataset.nodes.filter(function (n) { return n.type === 'film'; });
    var topics = dataset.nodes.filter(function (n) { return n.type === 'topic'; });
    return [{ id: '__all__', name: '全部关系', group: 'all' }]
      .concat(films.map(function (n) { return { id: n.id, name: n.name, group: 'film' }; }))
      .concat(topics.map(function (n) { return { id: n.id, name: n.name, group: 'topic' }; }));
  }

  global.IssueForceMetrics = {
    OTHER_TOPIC: OTHER_TOPIC,
    fromLegacyData: fromLegacyData,
    filterEdgesByThreshold: filterEdgesByThreshold,
    computeWeights: computeWeights,
    buildGraphData: buildGraphData,
    buildDetailPanel: buildDetailPanel,
    dropdownOptions: dropdownOptions
  };
})(typeof window !== 'undefined' ? window : global);
