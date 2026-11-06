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

  // byKeyboard: move focus into / out of the menu only for keyboard users —
  // after a tap or a click the browser would otherwise draw a focus frame around the ✕
  function setMenu(open, byKeyboard) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('is-locked', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open && byKeyboard) closeBtn.focus();
  }

  // a click fired by Enter/Space has detail === 0
  burger.addEventListener('click', function (e) {
    setMenu(!nav.classList.contains('is-open'), e.detail === 0);
  });

  closeBtn.addEventListener('click', function (e) {
    setMenu(false);
    if (e.detail === 0) burger.focus();
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
    track.style.scrollSnapType = 'none'; // snapping would fight the hand-made frames
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
        track.style.scrollSnapType = '';
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
  // Two modes, chosen by what the visitor actually uses, not by what the browser claims
  // ((hover: none) is wrong on some laptops with touchpads/touchscreens and in DevTools device mode):
  // — mouse: the review at the start of the strip is open by default (.is-default) so its words
  //   are readable without hovering; hovering another one opens it instead (.is-hover) and the
  //   default closes; when the cursor leaves, the default opens again;
  // — touch (a phone has no cursor): one review is always open (.is-active) — the first on load,
  //   then the one an arrow or a swipe brings into view, or the one tapped. Opening/closing uses
  //   the same CSS transitions as the mouse hover, so the animation is identical.
  var reviewItems = track.querySelectorAll('.review');
  var touchMq = window.matchMedia('(hover: none)');
  var touchMode = touchMq.matches;
  function setActiveReview(item) {
    reviewItems.forEach(function (r) { r.classList.toggle('is-active', touchMode && r === item); });
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
  var defaultReview = reviewItems[0];
  var defaultTimer = null;
  // delay: when the cursor leaves, wait a moment — if it lands on the next review straight away,
  // the default doesn't blink open and shut in between
  function syncDefault(delay) {
    clearTimeout(defaultTimer);
    var apply = function () {
      // a review chosen with the mouse or the keyboard takes the default's place
      var hovered = track.querySelector('.review.is-hover, .review:focus-visible');
      reviewItems.forEach(function (r) {
        r.classList.toggle('is-default', !touchMode && !hovered && r === defaultReview);
      });
    };
    if (delay) defaultTimer = setTimeout(apply, delay);
    else apply();
  }
  function activateVisibleReview() {
    if (touchMode) setActiveReview(visibleReview());
    else { defaultReview = visibleReview(); syncDefault(0); }
  }
  function setTouchMode(on) {
    if (touchMode === on) return;
    touchMode = on;
    setActiveReview(on ? visibleReview() : null);
    if (!on) defaultReview = visibleReview();
    syncDefault(0);
  }
  // any real mouse movement switches to mouse mode; a finger switches back
  document.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') setTouchMode(false); }, { passive: true });
  document.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') setTouchMode(true); }, { passive: true });
  reviewItems.forEach(function (r) {
    r.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      r.classList.add('is-hover');
      syncDefault(0);
    });
    r.addEventListener('pointerleave', function () {
      r.classList.remove('is-hover');
      syncDefault(150);
    });
  });
  // keyboard: Tab onto a review opens it (CSS :focus-visible), the default steps aside meanwhile
  track.addEventListener('focusin', function () { syncDefault(0); });
  track.addEventListener('focusout', function () { syncDefault(150); });
  // safety net: the cursor left the browser window — close hovered ones, the default stays
  document.documentElement.addEventListener('pointerleave', function () {
    reviewItems.forEach(function (r) { r.classList.remove('is-hover'); });
    syncDefault(150);
  });
  // touch: tapping a review opens it (the previous one closes).
  // Pointer events, not click: iPhone sends no click for a tap on a plain photo.
  var tapStart = null;
  document.addEventListener('pointerdown', function (e) {
    tapStart = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, scroll: track.scrollLeft } : null;
  }, { passive: true });
  document.addEventListener('pointerup', function (e) {
    if (!tapStart || e.pointerType !== 'touch' || !touchMode) return;
    var moved = Math.abs(e.clientX - tapStart.x) > 10 || Math.abs(e.clientY - tapStart.y) > 10 ||
      Math.abs(track.scrollLeft - tapStart.scroll) > 10;
    tapStart = null;
    if (moved) return; // it was a swipe or a scroll, not a tap
    var r = e.target.closest('.review');
    if (r && !e.target.closest('a')) setActiveReview(r); // «Открыть проект» just follows the link
  }, { passive: true });
  document.addEventListener('pointercancel', function () { tapStart = null; }, { passive: true });
  // after a finger swipe settles, open the review that came into view
  var swipeTimer = null;
  track.addEventListener('scroll', function () {
    if (scrollAnim) return; // the arrow animation opens it itself when it ends
    clearTimeout(swipeTimer);
    swipeTimer = setTimeout(activateVisibleReview, 150);
  }, { passive: true });
  touchMq.addEventListener('change', function () { setTouchMode(touchMq.matches); });
  setActiveReview(reviewItems[0]); // phone: the first review is open from the start
  syncDefault(0);                   // mouse: the same one is open by default

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
      // message for an incomplete number, used by the form check below
      phone.dataset.incomplete = code
        ? 'Введите номер полностью: +' + code + '-' + mask.replace(/9/g, '_')
        : 'Введите номер полностью, вместе с кодом страны';
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

    applyCountry();
  }

  // Form checks: our own messages in Russian under each field instead of the browser's bubbles.
  // Without JS the native `required` checks still work (noValidate is set only here).
  function showError(input, message) {
    var box = document.getElementById(input.id + '-error');
    if (box) box.textContent = message || '';
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // rules: [{ input, check: function () { return '' or an error message } }]
  function guardForm(form, rules, onValid) {
    if (!form) return;
    form.noValidate = true;
    var tried = false;
    function run(rule) {
      var message = rule.check();
      showError(rule.input, message);
      return !message;
    }
    form.addEventListener('submit', function (e) {
      tried = true;
      form.classList.add('is-submitted');
      var firstBad = null;
      rules.forEach(function (rule) { if (!run(rule) && !firstBad) firstBad = rule.input; });
      if (firstBad) {
        e.preventDefault();
        firstBad.focus();
        return;
      }
      if (onValid) onValid(e);
    });
    // after a failed try, each field re-checks itself as the visitor fixes it
    rules.forEach(function (rule) {
      ['input', 'change'].forEach(function (type) {
        rule.input.addEventListener(type, function () {
          if (tried || rule.input.hasAttribute('aria-invalid')) run(rule);
        });
      });
    });
  }

  var requestForm = document.getElementById('request-form');
  if (requestForm) {
    var nameInput = requestForm.querySelector('#request-name');
    var phoneInput = requestForm.querySelector('#request-phone');
    var consentInput = requestForm.querySelector('#request-consent');
    var submitButton = document.querySelector('[form="request-form"][type="submit"]');
    guardForm(requestForm, [
      { input: nameInput, check: function () {
        var v = nameInput.value.trim();
        if (!v) return 'Введите имя';
        if (v.length < 2) return 'Имя слишком короткое: нужно хотя бы 2 буквы';
        return '';
      } },
      { input: phoneInput, check: function () {
        var n = phoneInput.value.replace(/\D/g, '').length;
        if (!n) return 'Введите номер телефона';
        if (phoneInput.validity.customError) return phoneInput.dataset.incomplete || 'Введите номер полностью';
        return '';
      } },
      { input: consentInput, check: function () {
        return consentInput.checked ? '' : 'Чтобы отправить заявку, нужно согласие на обработку персональных данных';
      } }
    ], function () {
      // one send per click: the button waits until the page answers
      if (submitButton) { submitButton.disabled = true; submitButton.setAttribute('aria-busy', 'true'); }
    });

    // After a successful send, go to the thank-you page (thanks.html).
    // Call window.lyraRequestSent() once sending is wired up (Telegram / e-mail / CRM).
    window.lyraRequestSent = function () {
      window.location.href = 'thanks.html';
    };
  }

  var subscribeForm = document.querySelector('.footer__subscribe');
  if (subscribeForm) {
    var emailInput = subscribeForm.querySelector('#subscribe-email');
    guardForm(subscribeForm, [
      { input: emailInput, check: function () {
        emailInput.value = emailInput.value.trim();
        if (!emailInput.value) return 'Введите email';
        if (emailInput.validity.typeMismatch) return 'Проверьте адрес: например, name@mail.ru';
        return '';
      } }
    ]);
  }

  // «смотреть проект»: a project card over the page — photo, title, facts, a few words,
  // «обсудить похожий проект» and arrows to the neighbours (also ← → keys).
  // Without JS (or without <dialog>) the link simply opens the photo file.
  var lightbox = document.querySelector('[data-lightbox]');
  if (lightbox && typeof lightbox.showModal === 'function') {
    var cases = Array.prototype.slice.call(document.querySelectorAll('.case'));
    var lb = {
      img: lightbox.querySelector('[data-lightbox-img]'),
      title: lightbox.querySelector('[data-lightbox-caption]'),
      index: lightbox.querySelector('[data-lightbox-index]'),
      total: lightbox.querySelector('[data-lightbox-total]'),
      facts: lightbox.querySelector('[data-lightbox-facts]'),
      about: lightbox.querySelector('[data-lightbox-about]')
    };
    var current = 0;
    var lbReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    lb.total.textContent = pad(cases.length);

    var fillCase = function (i) {
      current = (i + cases.length) % cases.length;
      var card = cases[current];
      var img = card.querySelector('.case__img');
      var info = card.querySelector('[data-case-info]');
      lb.img.srcset = img.srcset;
      lb.img.sizes = '(max-width: 899px) 100vw, 60vw';
      lb.img.src = img.src;
      lb.img.alt = img.alt;
      // line breaks in the caption (<br>) become spaces, so words don't stick together
      var cap = card.querySelector('.case__caption').cloneNode(true);
      cap.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
      lb.title.textContent = cap.textContent.replace(/\s+/g, ' ').trim();
      lb.index.textContent = pad(current + 1);
      lb.facts.innerHTML = info ? info.querySelector('.case__facts').innerHTML : '';
      lb.about.textContent = info ? info.querySelector('.case__about').textContent : '';
      lb.about.hidden = !info;
    };

    var showCase = function (i) {
      if (lbReduce.matches || !lightbox.open) { fillCase(i); return; }
      // a quick cross-fade between projects
      var layout = lightbox.querySelector('.lightbox__layout');
      layout.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' }).finished.then(function () {
        fillCase(i);
        lightbox.scrollTop = 0;
        layout.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
      });
    };

    var closeLightbox = function () { lightbox.close(); };

    var openCase = function (card) {
      fillCase(cases.indexOf(card));
      lightbox.showModal();
      lightbox.scrollTop = 0;
      document.documentElement.classList.add('has-lightbox');
      if (window.lyraLenis) window.lyraLenis.stop();
    };

    // the photo of a case
    document.querySelectorAll('[data-lightbox-open]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var card = link.closest('.case');
        if (!card) return;
        e.preventDefault();
        openCase(card);
      });
    });

    // «открыть проект» in a review: the card of that client's project (data-case-open = case number)
    document.querySelectorAll('[data-case-open]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var card = document.querySelector('.case--' + link.dataset.caseOpen);
        if (!card) return;
        e.preventDefault();
        openCase(card);
      });
    });

    lightbox.querySelector('[data-lightbox-prev]').addEventListener('click', function () { showCase(current - 1); });
    lightbox.querySelector('[data-lightbox-next]').addEventListener('click', function () { showCase(current + 1); });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showCase(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); showCase(current + 1); }
    });
    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
    // «обсудить похожий проект»: close the card, then the link scrolls to the request form
    lightbox.querySelector('[data-lightbox-cta]').addEventListener('click', closeLightbox);
    // a click on the empty brown area closes it (the photo and the text don't)
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    // Esc, the close button or a click outside: unlock the page; focus returns to the photo link by itself
    lightbox.addEventListener('close', function () {
      document.documentElement.classList.remove('has-lightbox');
      if (window.lyraLenis) window.lyraLenis.start();
    });
  }

  // Comment grows with the text (browsers without CSS field-sizing)
  document.querySelectorAll('[data-autogrow]').forEach(function (area) {
    if (window.CSS && CSS.supports('field-sizing', 'content')) return;
    var grow = function () {
      area.style.height = 'auto';
      area.style.height = (area.scrollHeight + area.offsetHeight - area.clientHeight) + 'px';
    };
    area.addEventListener('input', grow);
  });

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
