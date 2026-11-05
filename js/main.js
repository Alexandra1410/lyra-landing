(function () {
  var burger = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');
  var closeBtn = document.querySelector('[data-menu-close]');
  var mq = window.matchMedia('(max-width: 1024px)');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('is-locked', open);
    if (open) closeBtn.focus();
  }

  burger.addEventListener('click', function () {
    setMenu(!nav.classList.contains('is-open'));
  });

  closeBtn.addEventListener('click', function () {
    setMenu(false);
    burger.focus();
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a') && mq.matches) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      burger.focus();
    }
  });

  mq.addEventListener('change', function (e) {
    if (!e.matches) setMenu(false);
  });

  var track = document.getElementById('reviews-track');
  var prevBtn = document.querySelector('[data-reviews-prev]');
  var nextBtn = document.querySelector('[data-reviews-next]');
  function scrollReviews(dir) {
    var item = track.querySelector('.review');
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: dir * (item.offsetWidth + gap) });
  }
  function updateArrows() {
    var max = track.scrollWidth - track.clientWidth - 1;
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = track.scrollLeft >= max;
  }
  prevBtn.addEventListener('click', function () { scrollReviews(-1); });
  nextBtn.addEventListener('click', function () { scrollReviews(1); });
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  /* Motion from the Figma prototype (Smart Animate, cubic-bezier(0.7, 0, 0.42, 1)) */

  // Hero intro: "After delay 10ms" → 2000ms
  var hero = document.querySelector('.hero');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      setTimeout(function () { hero.classList.add('is-in'); }, 10);
    });
  });

  // CTA: Figma triggers it on hover and then locks the final state,
  // so it plays once — on cursor enter or when half of the section is visible
  var cta = document.querySelector('.cta');
  function playCta() {
    cta.classList.add('is-in');
    cta.removeEventListener('pointerenter', playCta);
    if (ctaObserver) ctaObserver.disconnect();
  }
  var ctaObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) playCta();
      }, { threshold: 0.5 })
    : null;
  cta.addEventListener('pointerenter', playCta);
  if (ctaObserver) ctaObserver.observe(cta);
  else playCta();

  // Benefits slider: click on a dot → variant 1–5, 300ms
  var benefits = document.querySelector('[data-benefits]');
  var photos = [
    { src: 'images/benefits.png', alt: 'Минималистичная гостиная с белым диваном, книжным стеллажом и панорамным окном' },
    { src: 'images/thumb-1.png', alt: 'Лофт с высокими потолками и открытой кухней' },
    { src: 'images/thumb-2.png', alt: 'Светлая спальня с текстильным изголовьем' },
    { src: 'images/thumb-3.png', alt: 'Кухня с деревянными панелями и барной стойкой' },
    { src: 'images/thumb-4.png', alt: 'Обеденная зона с подвесными светильниками' }
  ];
  var titles = [
    'Не просто дизайн,<br>а атмосферу,<br>в которой хочется жить',
    'Пространство,<br>отражающее<br>ваш стиль',
    'Рациональное<br>использование<br>каждого метра',
    'Долговечные<br>и экологичные<br>материалы',
    'Поддержка<br>на всех этапах<br>реализации'
  ];
  var slideMs = 300;
  var slideEasing = 'cubic-bezier(0.7, 0, 0.42, 1)';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var bigPhoto = benefits.querySelector('.benefits__photo');
  var thumbs = benefits.querySelectorAll('.benefits__thumb');
  var title = benefits.querySelector('.benefits__title');
  var dots = benefits.querySelectorAll('[data-slide]');
  var current = 0;

  // Crossfade an image to a new photo: a copy fades in on top, then replaces it
  function swapImage(img, photo) {
    if (img.getAttribute('src') === photo.src) return;
    if (reduceMotion.matches) {
      img.src = photo.src;
      img.alt = photo.alt;
      return;
    }
    var copy = img.cloneNode();
    copy.src = photo.src;
    copy.alt = '';
    copy.style.cssText = 'position:absolute;margin:0;pointer-events:none;' +
      'left:' + img.offsetLeft + 'px;top:' + img.offsetTop + 'px;' +
      'width:' + img.offsetWidth + 'px;height:' + img.offsetHeight + 'px;';
    img.after(copy);
    copy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: slideMs, easing: slideEasing })
      .finished.then(function () {
        img.src = photo.src;
        img.alt = photo.alt;
        copy.remove();
      });
  }

  function swapTitle(html) {
    if (reduceMotion.matches) {
      title.innerHTML = html;
      return;
    }
    var half = { duration: slideMs / 2, easing: slideEasing };
    title.animate([{ opacity: 1 }, { opacity: 0 }], half).finished.then(function () {
      title.innerHTML = html;
      title.animate([{ opacity: 0 }, { opacity: 1 }], half);
    });
  }

  function goToSlide(index) {
    if (index === current) return;
    current = index;
    swapImage(bigPhoto, photos[index]);
    // Thumbs show the other four photos in their original order
    var rest = photos.filter(function (_, i) { return i !== index; });
    thumbs.forEach(function (thumb, i) { swapImage(thumb, rest[i]); });
    swapTitle(titles[index]);
    dots.forEach(function (dot, i) {
      var active = i === index;
      dot.classList.toggle('pager__item--active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () { goToSlide(Number(dot.dataset.slide)); });
  });

  // Preload slide photos so the first switch doesn't flash
  photos.forEach(function (photo) { new Image().src = photo.src; });
})();
