/**
 * Pure frontend data access — no fetch, no backend.
 * Data lives in window.SHE_DIRECTS_DATA (js/site-data.js).
 */
(function (global) {
  'use strict';

  function get(path) {
    if (!path) return undefined;
    var parts = String(path).split('.');
    var cur = global.SHE_DIRECTS_DATA;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  var FETCH_PATHS = {
    'chapter03.emotionRivers': 'data/chapter03/emotion-rivers.json'
  };

  function load(path) {
    return new Promise(function (resolve, reject) {
      var data = get(path);
      if (data !== undefined) {
        resolve(data);
        return;
      }
      var url = FETCH_PATHS[path];
      if (!url || !global.location || global.location.protocol === 'file:') {
        reject(new Error('缺少内嵌数据: ' + path));
        return;
      }
      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(resolve)
        .catch(function () {
          reject(new Error('缺少内嵌数据: ' + path));
        });
    });
  }

  function loadMany(map) {
    var out = {};
    var keys = Object.keys(map);
    try {
      keys.forEach(function (k) {
        var v = get(map[k]);
        if (v === undefined) throw new Error('缺少内嵌数据: ' + map[k]);
        out[k] = v;
      });
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(out);
  }

  function ready() {
    return !!global.SHE_DIRECTS_DATA;
  }

  global.SheDirectsStore = { get: get, load: load, loadMany: loadMany, ready: ready };
})(typeof window !== 'undefined' ? window : this);
