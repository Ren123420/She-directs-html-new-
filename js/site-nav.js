/**
 * ???? · ???? + ????
 */
(function (global) {
  'use strict';

  var SECTIONS = [
    { id: 'hero', label: '??' },
    { id: 'prologue', label: '??' },
    { id: 'chapter01', label: '???' },
    { id: 'chapter02', label: '???' },
    { id: 'chapter03', label: '????' },
    { id: 'chapter04', label: '????' }
  ];

  function initSiteNav() {
    var progress = document.getElementById('readProgress');
    var navLinks = document.querySelectorAll('[data-target]');
    if (!navLinks.length) return;

    function onScroll() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (progress && docH > 0) {
        progress.style.width = Math.min(100, (scrollTop / docH) * 100) + '%';
      }

      var current = SECTIONS[0].id;
      SECTIONS.forEach(function (sec) {
        var el = document.getElementById(sec.id);
        if (!el) return;
        var rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.42) {
          current = sec.id;
        }
      });

      navLinks.forEach(function (a) {
        if (!a.closest('.top-nav-menu') && !a.closest('.story-nav')) return;
        a.classList.toggle('is-active', a.getAttribute('data-target') === current);
      });
    }

    navLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var targetId = a.getAttribute('data-target');
        if (!targetId) return;
        var target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  global.SheDirectsNav = { init: initSiteNav };
})(typeof window !== 'undefined' ? window : this);
