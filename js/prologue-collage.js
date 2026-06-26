/**
 * 引言 · 导演/海报拼贴真实图片加载 + 滚动强调
 */
(function (global) {
  'use strict';

  var filmsById = {};

  function filmPoster(film) {
    if (!film) return '';
    if (film.localPoster) return film.localPoster;
    if (film.poster && film.poster.indexOf('assets/') === 0) return film.poster;
    return '';
  }

  function bindImg(img) {
    if (!img || img.getAttribute('data-bound') === '1') return;
    img.setAttribute('data-bound', '1');
    img.referrerPolicy = 'no-referrer';

    var fallback = img.getAttribute('data-fallback') || img.getAttribute('src') || '';
    var remote = img.getAttribute('data-remote');
    var filmId = img.getAttribute('data-film-id');
    var primary = img.getAttribute('src') || '';

    if (filmId && filmsById[filmId]) {
      var poster = filmPoster(filmsById[filmId]);
      if (poster) primary = poster;
    }

    function useFallback() {
      if (remote && img.src !== remote) {
        img.src = remote;
        img.addEventListener('error', function onRemoteErr() {
          img.removeEventListener('error', onRemoteErr);
          if (fallback && img.src !== fallback) img.src = fallback;
        }, { once: true });
        return;
      }
      if (fallback && img.src !== fallback) {
        img.src = fallback;
      }
    }

    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      useFallback();
    }, { once: true });

    if (primary) img.src = primary;
    else if (remote) img.src = remote;
  }

  function initPrologueCollage() {
    document.querySelectorAll('.prologue-media-block img, .film-compare-card img').forEach(bindImg);

    var posterBlock = document.querySelector('.prologue-media-block--posters');
    var trigger = document.querySelector('[data-prologue-shift]');
    if (posterBlock && trigger && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          posterBlock.classList.toggle('is-emphasis', entry.isIntersecting);
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -20% 0px' });
      obs.observe(trigger);
    }
  }

  function boot() {
    initPrologueCollage();
  }

  function init() {
    if (global.SheDirectsStore && global.SheDirectsStore.ready()) {
      global.SheDirectsStore.load('hero.films').then(function (films) {
        (films || []).forEach(function (f) {
          if (f.id) filmsById[f.id] = f;
        });
        boot();
      }).catch(boot);
      return;
    }
    boot();
  }

  global.PrologueCollage = { init: init };
})(typeof window !== 'undefined' ? window : this);
