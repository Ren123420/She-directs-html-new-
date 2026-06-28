/**
 * 背景音乐 · 打开网页自动播放（浏览器阻止则等首次交互）
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
    var autoPlayAttempted = false;

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

    function tryPlay() {
      if (!audio.src) loadCandidate(0);
      ensureLoop();
      var playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          // 浏览器阻止了自动播放，等用户交互
        });
      }
    }

    function tryAutoPlay() {
      if (autoPlayAttempted) return;
      autoPlayAttempted = true;

      // 等音频就绪后尝试自动播放
      if (resolved) {
        tryPlay();
      } else {
        audio.addEventListener('canplay', function onCanPlay() {
          audio.removeEventListener('canplay', onCanPlay);
          tryPlay();
        });
        loadCandidate(0);
      }
    }

    function onUserInteraction() {
      if (!audio.paused) return;
      tryPlay();
      // 移除监听，后续不再触发
      document.removeEventListener('click', onUserInteraction);
      document.removeEventListener('scroll', onUserInteraction);
      document.removeEventListener('keydown', onUserInteraction);
      document.removeEventListener('touchstart', onUserInteraction);
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

    audio.addEventListener('ended', restartLoop);

    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-unavailable')) {
        resolved = false;
        btn.classList.remove('is-unavailable');
        loadCandidate(0);
      }
      if (audio.paused) {
        tryPlay();
      } else {
        audio.pause();
      }
    });

    // 尝试自动播放
    loadCandidate(0);

    if (document.readyState === 'complete') {
      setTimeout(tryAutoPlay, 300);
    } else {
      window.addEventListener('load', function () {
        setTimeout(tryAutoPlay, 300);
      });
    }

    // 如果自动播放被拦截，等首次用户交互
    document.addEventListener('click', onUserInteraction);
    document.addEventListener('scroll', onUserInteraction);
    document.addEventListener('keydown', onUserInteraction);
    document.addEventListener('touchstart', onUserInteraction);

    setPlaying(false);
  }

  global.SheDirectsBgm = { init: initBgmPlayer };
})(typeof window !== 'undefined' ? window : this);
