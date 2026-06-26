/**
 * Hero poster loader · 仅开屏五张主海报（叙事区不加海报）
 */
(function (global) {
  'use strict';

  var films = [];

  function filmById(id) {
    return films.find(function (f) { return f.id === id; });
  }

  function resolvePoster(film) {
    if (!film) return '';
    if (film.localPoster) return film.localPoster;
    if (film.poster && film.poster.indexOf('assets/') === 0) return film.poster;
    return 'assets/hero/' + (film.id || 'haodongxi') + '.svg';
  }

  function bindPosterImg(img, film) {
    if (!img || !film) return;
    img.alt = film.title || '';
    img.referrerPolicy = 'no-referrer';
    img.classList.add('hero-poster');
    img.src = resolvePoster(film);
    img.onerror = function () {
      img.onerror = null;
      img.src = film.fallback || ('assets/hero/' + (film.id || 'haodongxi') + '.svg');
    };
  }

  function bindDoubanLink(anchor, url) {
    if (!anchor || !url) return;
    anchor.href = url;
    anchor.setAttribute('data-douban-bound', '1');
  }

  function initHeroDoubanLinks() {
    document.querySelectorAll('a[data-film-id]').forEach(function (anchor) {
      var id = anchor.getAttribute('data-film-id');
      var film = filmById(id);
      if (film && film.url) bindDoubanLink(anchor, film.url);
    });
  }

  function linkCaseCard(card, url) {
    if (!card || !url || card.getAttribute('data-douban-bound') === '1') return;
    card.setAttribute('data-douban-bound', '1');
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      window.open(url, '_blank', 'noopener');
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.open(url, '_blank', 'noopener');
      }
    });
    var hint = document.createElement('span');
    hint.className = 'case-douban-hint';
    hint.textContent = '豆瓣详情 →';
    card.appendChild(hint);
  }

  function initCaseCardLinks() {
    document.querySelectorAll('.case-card[data-film-id]').forEach(function (card) {
      var id = card.getAttribute('data-film-id');
      var film = filmById(id);
      if (film && film.url) linkCaseCard(card, film.url);
    });
    document.querySelectorAll('.case-card[data-douban-id]').forEach(function (card) {
      var did = card.getAttribute('data-douban-id');
      if (did) linkCaseCard(card, 'https://movie.douban.com/subject/' + did + '/');
    });
  }

  function formatBoxOfficeYi(wan) {
    if (!wan || wan <= 0) return '票房 /';
    var yi = wan / 10000;
    if (yi >= 1) return '票房 ' + (yi >= 10 ? yi.toFixed(0) : yi.toFixed(2)) + ' 亿';
    return '票房 ' + wan.toFixed(0) + ' 万';
  }

  function initCaseCardMeta() {
    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) return;
    global.SheDirectsStore.load('chapter03.scatter').then(function (scatter) {
      var films = scatter.films || [];
      var byTitle = {};
      var byDouban = {};
      films.forEach(function (f) {
        byTitle[f.title] = f;
        if (f.doubanId) byDouban[String(f.doubanId)] = f;
      });

      document.querySelectorAll('.case-card[data-film-id]').forEach(function (card) {
        var id = card.getAttribute('data-film-id');
        var heroFilm = filmById(id);
        var film = heroFilm ? byTitle[heroFilm.title] : null;
        if (!film) return;
        var meta = card.querySelector('.case-meta');
        if (meta) {
          meta.textContent = (film.year || '') + ' · 豆瓣 ' + film.rating + ' · ' + formatBoxOfficeYi(film.boxOfficeWan);
        }
      });

      document.querySelectorAll('.case-card[data-douban-id]').forEach(function (card) {
        var did = card.getAttribute('data-douban-id');
        var film = byDouban[did];
        if (!film) return;
        var meta = card.querySelector('.case-meta');
        if (meta) {
          meta.textContent = (film.year || '') + ' · 豆瓣 ' + film.rating + ' · ' + formatBoxOfficeYi(film.boxOfficeWan);
        }
      });
    }).catch(function () {});
  }

  function initHeroCards() {
    var map = {
      chuzou: '.card-tl .hero-poster',
      taojie: '.card-tr .hero-poster',
      rela: '.card-bl .hero-poster',
      guochuntian: '.card-br .hero-poster',
      haodongxi: '.center-card .hero-poster'
    };
    Object.keys(map).forEach(function (id) {
      var film = filmById(id);
      var img = document.querySelector(map[id]);
      if (film && img) bindPosterImg(img, film);
    });
  }

  function removeInjectedPosters() {
    document.querySelectorAll(
      '.step-mini-posters, .featured-poster-grid, .chapter-poster-strip, ' +
      '#featuredGrid, #chapter01Strip, #chapter01Mosaic, #directorSpotlight, #filmWall'
    ).forEach(function (el) {
      el.remove();
    });
  }

  function boot() {
    removeInjectedPosters();
    initHeroCards();
    initHeroDoubanLinks();
    initCaseCardLinks();
  }

  function init() {
    removeInjectedPosters();

    if (!global.SheDirectsStore || !global.SheDirectsStore.ready()) {
      document.querySelectorAll('.hero-poster').forEach(function (img) {
        var id = img.getAttribute('data-id');
        if (id) img.src = 'assets/hero/' + id + '.svg';
      });
      return;
    }

    global.SheDirectsStore.loadMany({
      films: 'hero.films'
    }).then(function (results) {
      films = results.films || [];
      boot();
    }).catch(function () {
      document.querySelectorAll('.hero-poster').forEach(function (img) {
        var id = img.getAttribute('data-id');
        if (id) img.src = 'assets/hero/' + id + '.svg';
      });
    });
  }

  global.HeroPosters = { init: init, initCaseCardMeta: initCaseCardMeta };
})(typeof window !== 'undefined' ? window : this);
