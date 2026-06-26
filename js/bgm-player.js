/**
 * 背景音乐 · 光碟按钮播放/暂停
 * 主文件：assets/audio/给电影人的情书 - 蔡琴.mp3
 */
(function (global) {
  'use strict';

  var BGM_TRACK = '给电影人的情书 · 蔡琴';
  var BGM_CANDIDATES = [
    encodeURI('assets/audio/给电影人的情书 - 蔡琴.mp3'),
    'assets/audio/bgm.mp3',
    encodeURI('给电影人的情书 - 蔡琴.mp3')
  ];

  function initBgmPlayer() {
    var btn = document.getElementById('bgmPlayer');
    var audio = document.getElementById('bgmAudio');
    if (!btn || !audio) return;

    audio.volume = 0.42;
    var candidateIndex = 0;
    var resolved = false;

    function setPlaying(playing) {
      btn.classList.toggle('is-playing', playing);
      btn.classList.toggle('is-paused', !playing);
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btn.setAttribute(
        'aria-label',
        playing ? '暂停背景音乐《' + BGM_TRACK + '》' : '播放背景音乐《' + BGM_TRACK + '》'
      );
      btn.title = playing
        ? '暂停 · ' + BGM_TRACK
        : '背景音乐 · ' + BGM_TRACK + ' · 点击播放';
    }

    function markReady() {
      resolved = true;
      btn.classList.remove('is-unavailable');
    }

    function markUnavailable() {
      btn.classList.add('is-unavailable');
      btn.title = '音频加载失败，请确认 assets/audio/给电影人的情书 - 蔡琴.mp3 存在';
    }

    function ensureLoop() {
      audio.loop = true;
      audio.setAttribute('loop', '');
    }

    function loadCandidate(index) {
      candidateIndex = index;
      if (index >= BGM_CANDIDATES.length) {
        markUnavailable();
        return;
      }
      audio.src = BGM_CANDIDATES[index];
      ensureLoop();
      audio.load();
    }

    function tryNextSource() {
      if (resolved) return;
      loadCandidate(candidateIndex + 1);
    }

    function restartLoop() {
      if (audio.paused || btn.classList.contains('is-unavailable')) return;
      audio.currentTime = 0;
      var replay = audio.play();
      if (replay && replay.catch) replay.catch(function () {});
    }

    ensureLoop();
    audio.addEventListener('error', tryNextSource);
    audio.addEventListener('loadeddata', function () {
      ensureLoop();
      markReady();
    });
    audio.addEventListener('canplay', function () {
      ensureLoop();
      markReady();
    });

    audio.addEventListener('play', function () {
      ensureLoop();
      markReady();
      setPlaying(true);
    });

    audio.addEventListener('pause', function () {
      setPlaying(false);
    });

    /* 部分浏览器 loop 属性对 mp3 不生效，ended 时强制重播 */
    audio.addEventListener('ended', restartLoop);

    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-unavailable')) {
        resolved = false;
        btn.classList.remove('is-unavailable');
        loadCandidate(0);
      }
      if (audio.paused) {
        if (!audio.src) loadCandidate(0);
        ensureLoop();
        var playPromise = audio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function () {
            markUnavailable();
          });
        }
      } else {
        audio.pause();
      }
    });

    setPlaying(false);
  }

  global.SheDirectsBgm = { init: initBgmPlayer };
})(typeof window !== 'undefined' ? window : this);
