/* Shared by every page: cookie notice + smooth scroll on pages without main.js (documents) */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth scroll on document pages (the landing page sets it up in main.js)
  if (document.body.classList.contains('legal-page') && window.Lenis && !reduceMotion) {
    new window.Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9, anchors: { duration: 1.2 } });
  }

  // ---------- Cookie notice ----------
  var KEY = 'lyra-cookie-consent';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked: show every time */ }
  if (saved) return;

  var bar = document.createElement('div');
  bar.className = 'cookie';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Уведомление о cookie');
  bar.innerHTML =
    '<p class="cookie__text">Мы используем файлы cookie, чтобы сайт работал правильно и становился удобнее. ' +
    'Подробнее — в <a href="privacy.html#cookies">политике конфиденциальности</a>.</p>' +
    '<button class="cookie__button button button--light" type="button">' +
    '<span class="u-trim">Принять</span></button>';

  function show() {
    document.body.appendChild(bar);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add('is-visible'); });
    });
  }

  bar.querySelector('.cookie__button').addEventListener('click', function () {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    bar.classList.remove('is-visible');
    setTimeout(function () { bar.remove(); }, 500);
  });

  // On the landing page wait for the preloader and the intro, then slide in
  var html = document.documentElement;
  if (html.classList.contains('is-loading')) {
    var obs = new MutationObserver(function () {
      if (!html.classList.contains('is-loading')) {
        obs.disconnect();
        setTimeout(show, 1500);
      }
    });
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
  } else {
    setTimeout(show, 600);
  }
})();
