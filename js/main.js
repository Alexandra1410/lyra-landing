(function () {
  // Smooth page scrolling (Lenis): soft, inertial wheel scroll and smooth jumps to #anchors.
  // Off for people who asked the system to reduce motion — they get the normal scroll.
  var lenis = null;
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new window.Lenis({
      autoRaf: true,
      lerp: 0.09,       // lower = softer, longer glide
      wheelMultiplier: 0.9,
      anchors: { duration: 1.2 } // stops below the fixed header via scroll-margin-top in CSS
    });
    window.lyraLenis = lenis;
    if (document.documentElement.classList.contains('is-loading')) lenis.stop(); // no scrolling under the preloader
  }
  // Header stays on screen; turns into a brown bar as soon as the page is scrolled
  var header = document.querySelector('.header');
  function updateHeader() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  var burger = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');
  var closeBtn = document.querySelector('[data-menu-close]');
  var mq = window.matchMedia('(max-width: 1279px)');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('is-locked', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
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
  // Smooth scroll by one review: eased animation instead of a jump
  var scrollAnim = null;
  var scrollTarget = null;
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function scrollReviews(dir) {
    var item = track.querySelector('.review');
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var max = track.scrollWidth - track.clientWidth;
    var from = track.scrollLeft;
    var base = scrollAnim ? scrollTarget : from; // a quick second click continues from where the first one goes
    var to = Math.max(0, Math.min(max, base + dir * (item.offsetWidth + gap)));
    if (to === from) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      track.scrollLeft = to;
      return;
    }
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    scrollTarget = to;
    track.style.scrollBehavior = 'auto'; // frames are set by hand
    var start = null;
    var duration = 650;
    function step(now) {
      if (start === null) start = now;
      var k = Math.min(1, (now - start) / duration);
      track.scrollLeft = from + (to - from) * easeInOut(k);
      if (k < 1) {
        scrollAnim = requestAnimationFrame(step);
      } else {
        scrollAnim = null;
        track.style.scrollBehavior = '';
        updateArrows();
        activateVisibleReview();
      }
    }
    scrollAnim = requestAnimationFrame(step);
  }
  function updateArrows() {
    var max = track.scrollWidth - track.clientWidth - 1;
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = track.scrollLeft >= max;
  }
  // Touch screens have no hover: one review at a time is "open" (.is-active) —
  // the first on load, then the one an arrow or a swipe brings into view, or the one tapped
  var reviewItems = track.querySelectorAll('.review');
  var touchMq = window.matchMedia('(hover: none)');
  function setActiveReview(item) {
    reviewItems.forEach(function (r) { r.classList.toggle('is-active', touchMq.matches && r === item); });
  }
  function visibleReview() {
    var max = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= max - 2) return reviewItems[reviewItems.length - 1]; // at the end: the last one
    var anchor = track.getBoundingClientRect().left + (parseFloat(getComputedStyle(track).paddingLeft) || 0);
    var best = reviewItems[0];
    var bestDist = Infinity;
    reviewItems.forEach(function (r) {
      var d = Math.abs(r.getBoundingClientRect().left - anchor);
      if (d < bestDist) { bestDist = d; best = r; }
    });
    return best;
  }
  function activateVisibleReview() {
    if (touchMq.matches) setActiveReview(visibleReview());
  }
  reviewItems.forEach(function (r) {
    r.addEventListener('click', function () { if (touchMq.matches) setActiveReview(r); });
  });
  // after a finger swipe settles
  var swipeTimer = null;
  track.addEventListener('scroll', function () {
    if (scrollAnim) return; // arrow animation handles it itself
    clearTimeout(swipeTimer);
    swipeTimer = setTimeout(activateVisibleReview, 150);
  }, { passive: true });
  touchMq.addEventListener('change', function () { setActiveReview(touchMq.matches ? visibleReview() : null); });
  setActiveReview(reviewItems[0]);

  prevBtn.addEventListener('click', function () { scrollReviews(-1); });
  nextBtn.addEventListener('click', function () { scrollReviews(1); });
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  /* Motion from the Figma prototype (Smart Animate, cubic-bezier(0.7, 0, 0.42, 1)) */

  // Phone: country picker + mask. Visible field holds only the local part, e.g. (999)-999-99-99;
  // the hidden "phone" field gets the full number: +7-(999)-999-99-99
  var phoneWrap = document.querySelector('[data-phone]');
  if (phoneWrap) {
    var phone = phoneWrap.querySelector('[data-phone-mask]');
    var country = phoneWrap.querySelector('[data-phone-country]');
    var flagEl = phoneWrap.querySelector('[data-phone-flag]');
    var codeEl = phoneWrap.querySelector('[data-phone-code]');
    var full = phoneWrap.querySelector('[data-phone-full]');
    var mask, code, maxDigits, minDigits;

    var applyCountry = function () {
      var opt = country.options[country.selectedIndex];
      mask = opt.dataset.mask;
      code = opt.dataset.code;
      maxDigits = (mask.match(/9/g) || []).length;
      minDigits = Number(opt.dataset.min) || maxDigits; // a few countries have numbers of different length
      flagEl.textContent = opt.dataset.flag;
      codeEl.textContent = '+' + code; // "Другая страна": just "+", the whole number is typed in the field
      phone.placeholder = code ? 'номер телефона' : 'код страны и номер';
      phone.maxLength = mask.length;
    };

    var digitsOf = function (value, pasted) {
      var d = value.replace(/\D/g, '');
      if (pasted && d.length > maxDigits) {
        // pasted with the country code (+7…, 375…) or a Russian/Kazakh leading 8
        if (code && d.indexOf(code) === 0 && d.length - code.length <= maxDigits) d = d.slice(code.length);
        else if (code === '7' && d.length === 11 && d[0] === '8') d = d.slice(1);
      }
      return d.slice(0, maxDigits);
    };

    // fill the mask; a symbol is written only when a digit follows it, so Backspace always removes digits
    var formatPhone = function (d) {
      var out = '';
      var i = 0;
      for (var k = 0; k < mask.length && i < d.length; k++) {
        out += mask[k] === '9' ? d[i++] : mask[k];
      }
      return out;
    };

    var syncFull = function () {
      if (!phone.value) full.value = '';
      else full.value = code ? '+' + code + '-' + phone.value : '+' + phone.value;
      // complete number? (checked here instead of a pattern: some countries allow a range of lengths)
      var n = phone.value.replace(/\D/g, '').length;
      phone.setCustomValidity(n && n < minDigits ? 'short' : '');
    };

    var lastDigits = '';
    phone.addEventListener('input', function (e) {
      var caret = phone.selectionStart;
      var pasted = e.inputType === 'insertFromPaste' || e.inputType === 'insertReplacementText' || !e.inputType;
      var d = digitsOf(phone.value, pasted);
      var digitsBeforeCaret = Math.min(digitsOf(phone.value.slice(0, caret)).length, d.length);
      // Backspace right after ")" or "-" removes the digit before it, not just the symbol
      if (e.inputType === 'deleteContentBackward' && d === lastDigits && digitsBeforeCaret > 0) {
        d = d.slice(0, digitsBeforeCaret - 1) + d.slice(digitsBeforeCaret);
        digitsBeforeCaret -= 1;
      }
      if (pasted) digitsBeforeCaret = d.length;
      phone.value = formatPhone(d);
      lastDigits = d;
      var pos = 0;
      for (var seen = 0; pos < phone.value.length && seen < digitsBeforeCaret; pos++) {
        if (/\d/.test(phone.value[pos])) seen++;
      }
      phone.setSelectionRange(pos, pos);
      syncFull();
    });

    // Letters and symbols are refused before they reach the field (digits only)
    phone.addEventListener('beforeinput', function (e) {
      if ((e.inputType === 'insertText' || e.inputType === 'insertCompositionText') && e.data && !/\d/.test(e.data)) {
        e.preventDefault();
      }
    });
    phone.addEventListener('keypress', function (e) {
      if (e.key.length === 1 && /\D/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    });

    country.addEventListener('change', function () {
      applyCountry();
      var d = digitsOf(phone.value);
      phone.value = formatPhone(d);
      lastDigits = d;
      syncFull();
      phone.focus();
    });

    phone.addEventListener('invalid', function () {
      if (phone.validity.valueMissing) phone.setCustomValidity('Введите номер телефона');
      else if (phone.validity.customError) {
        phone.setCustomValidity(code
          ? 'Введите номер полностью: +' + code + '-' + mask
          : 'Введите номер полностью, вместе с кодом страны');
      }
    });

    applyCountry();
  }

  // Consent checkbox: clear message, and highlight it once a send was attempted
  var requestForm = document.getElementById('request-form');
  if (requestForm) {
    var consent = requestForm.querySelector('[name="consent_personal_data"]');
    consent.addEventListener('invalid', function () {
      consent.setCustomValidity('Чтобы отправить заявку, нужно согласие на обработку персональных данных');
      requestForm.classList.add('is-submitted');
    });
    consent.addEventListener('change', function () { consent.setCustomValidity(''); });
  }

  // Hero intro: "After delay 10ms" → 2000ms. Starts when the preloader goes away
  var hero = document.querySelector('.hero');
  function playHero() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(function () { hero.classList.add('is-in'); }, 10);
      });
    });
  }

  // Preloader: covers the page until the first screen (fonts + hero photos) has loaded,
  // so the visitor sees "loading" instead of a page that renders with freezes.
  // Images further down are lazy-loaded and don't hold it up.
  var preloader = document.querySelector('[data-preloader]');
  var preloaderShownAt = Date.now();
  var preloaderDone = false;
  // show LYRA only in the brand font, never in a fallback one
  if (preloader && document.fonts && document.fonts.load) {
    document.fonts.load('700 40px "Non Bureau"').then(function () { preloader.classList.add('is-font-ready'); });
  } else if (preloader) {
    preloader.classList.add('is-font-ready');
  }
  function hidePreloader() {
    if (preloaderDone) return;
    preloaderDone = true;
    // keep it on screen at least a moment, so it doesn't just flash
    var wait = Math.max(0, 600 - (Date.now() - preloaderShownAt));
    setTimeout(function () {
      document.documentElement.classList.remove('is-loading');
      if (lenis) lenis.start();
      if (!preloader) { playHero(); return; }
      preloader.classList.add('is-hidden');
      playHero();
      setTimeout(function () { preloader.remove(); }, 700);
    }, wait);
  }
  if (document.readyState === 'complete') hidePreloader();
  else window.addEventListener('load', hidePreloader);
  setTimeout(hidePreloader, 8000); // slow network: never keep the visitor waiting forever

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
    { src: 'images/benefits.webp', alt: 'Минималистичная гостиная с белым диваном, книжным стеллажом и панорамным окном' },
    { src: 'images/thumb-1.webp', alt: 'Лофт с высокими потолками и открытой кухней' },
    { src: 'images/thumb-2.webp', alt: 'Светлая спальня с текстильным изголовьем' },
    { src: 'images/thumb-3.webp', alt: 'Кухня с деревянными панелями и барной стойкой' },
    { src: 'images/thumb-4.webp', alt: 'Обеденная зона с подвесными светильниками' }
  ];
  var titles = [
    'Не просто дизайн,<br>а атмосферу,<br>в которой хочется<br>жить',
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

  // A click on a small photo opens that photo as the slide.
  // Thumbs show the other four slides in order, so thumb i = i-th slide that isn't current
  function slideForThumb(i) {
    return photos.map(function (_, k) { return k; }).filter(function (k) { return k !== current; })[i];
  }
  thumbs.forEach(function (thumb, i) {
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.addEventListener('click', function () { goToSlide(slideForThumb(i)); });
    thumb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToSlide(slideForThumb(i));
      }
    });
  });

  // Preload slide photos so the first switch doesn't flash —
  // only when the block gets close, so they don't slow down the first screen
  function preloadSlides() { photos.forEach(function (photo) { new Image().src = photo.src; }); }
  if ('IntersectionObserver' in window) {
    var slidesObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { preloadSlides(); slidesObserver.disconnect(); }
    }, { rootMargin: '600px 0px' });
    slidesObserver.observe(benefits);
  } else {
    preloadSlides();
  }
})();
