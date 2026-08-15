/* Claroni — landing page behaviour.
   Three small things: section reveals, the FAQ accordion, and the EN/CS toggle.
   No framework, no dependencies. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- section reveals (Section 9: gentle, ease-out) ------- */
  var revealables = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);   // reveal once, never re-animate on scroll back
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealables.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------- header hairline on scroll -------------------------- */
  var header = document.getElementById('siteHeader');
  var heroEl = document.querySelector('.hero');
  var ticking = false;

  // publish the real nav height so the hero video can start exactly beneath it
  function syncHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight, { passive: true });

  function syncHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncHeader);
  }, { passive: true });
  syncHeader();

  /* ---------------- FAQ accordion -------------------------------------- */
  /* One open at a time — an accordion that lets everything sprawl open is
     just a wall of text, which the anti-clutter rule rules out. */
  var triggers = document.querySelectorAll('.faq__trigger');

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var item = trigger.closest('.faq__item');
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';

      triggers.forEach(function (other) {
        other.setAttribute('aria-expanded', 'false');
        other.closest('.faq__item').classList.remove('is-open');
      });

      if (!isOpen) {
        trigger.setAttribute('aria-expanded', 'true');
        item.classList.add('is-open');
      }
    });
  });

  /* ---------------- EN / CS language toggle ---------------------------- */
  /* Czech lives in data-cs; the English original is captured on first run so
     the swap is reversible without a second copy of the markup. */
  var STORAGE_KEY = 'claroni-lang';
  var translatable = document.querySelectorAll('[data-cs]');
  var langButtons = document.querySelectorAll('.lang__btn');

  // attributes need translating too, not just text nodes
  var ATTRS = [
    { data: 'data-cs-label', target: 'aria-label', en: 'data-en-label' },
    { data: 'data-cs-placeholder', target: 'placeholder', en: 'data-en-placeholder' }
  ];
  var attrEls = document.querySelectorAll('[data-cs-label], [data-cs-placeholder]');

  translatable.forEach(function (el) {
    el.setAttribute('data-en', el.textContent.trim());
  });
  attrEls.forEach(function (el) {
    ATTRS.forEach(function (a) {
      if (el.hasAttribute(a.data)) el.setAttribute(a.en, el.getAttribute(a.target) || '');
    });
  });

  function setLang(lang) {
    var useCs = lang === 'cs';

    translatable.forEach(function (el) {
      el.textContent = useCs ? el.getAttribute('data-cs') : el.getAttribute('data-en');
    });

    attrEls.forEach(function (el) {
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a.data)) return;
        el.setAttribute(a.target, useCs ? el.getAttribute(a.data) : el.getAttribute(a.en));
      });
    });

    document.documentElement.lang = useCs ? 'cs' : 'en';

    langButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'));
    });
  });

  var stored;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { stored = null; }
  if (stored === 'cs') setLang('cs');

  /* ---------------- theme switch --------------------------------------- */
  /* Real control, real state, persisted. It toggles a `dark` class on <html>.
     The design system defines no dark palette (out of scope for v1), so
     nothing is currently bound to that class and the page will not change
     appearance. Deliberate: the control ships, the theme does not. */
  var THEME_KEY = 'claroni-theme';
  var themeSwitch = document.querySelector('.switch');

  // Pages may pin themselves to one theme (the login page is always dark). The
  // switch stays live there and still records the choice, so returning to the
  // landing page restores whatever the user picked — the pinned page just
  // doesn't repaint itself.
  var themeLocked = document.documentElement.getAttribute('data-theme-locked');

  function setTheme(dark) {
    if (!themeLocked) document.documentElement.classList.toggle('dark', dark);
    themeSwitch.setAttribute('aria-checked', dark ? 'true' : 'false');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
  }

  if (themeSwitch) {
    themeSwitch.addEventListener('click', function () {
      setTheme(themeSwitch.getAttribute('aria-checked') !== 'true');
    });

    var savedTheme;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { savedTheme = null; }
    if (savedTheme === 'dark') setTheme(true);
  }

  /* ---------------- newsletter form ------------------------------------ */
  /* TODO: wire up newsletter signup. Inert for now, matching the placeholder
     convention used by every other CTA on the page. */
  var subscribeForm = document.querySelector('.subscribe');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  /* ---------------- login form ----------------------------------------- */
  /* TODO: wire up authentication. Inert until there is a backend — nothing is
     sent anywhere, so no credentials leave the page. */
  var loginForm = document.querySelector('.login__form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) { e.preventDefault(); });
  }
})();


/* =====================================================================
   Theme-swapped autoplay videos.
   Any <video data-video-light data-video-dark> that is NOT the scroll-driven
   hero: loads the source matching the active theme, keeps looping, and swaps
   sources when the theme changes without restarting the loop.
   ===================================================================== */
(function () {
  'use strict';

  var videos = document.querySelectorAll(
    'video[data-video-light][data-video-dark]:not(.hero__video)'
  );
  if (!videos.length) return;

  function applySources() {
    var dark = document.documentElement.classList.contains('dark');

    Array.prototype.forEach.call(videos, function (video) {
      var next = video.getAttribute(dark ? 'data-video-dark' : 'data-video-light');
      if (video.getAttribute('src') === next) return;

      var resumeAt = video.currentTime;
      video.setAttribute('src', next);
      video.load();

      video.addEventListener('loadedmetadata', function () {
        // pick the loop back up where the other source left off
        if (resumeAt && resumeAt < video.duration) video.currentTime = resumeAt;
        var played = video.play();
        // autoplay can still be refused (battery saver, strict settings);
        // a paused first frame is an acceptable fallback for decoration
        if (played && played.catch) played.catch(function () {});
      }, { once: true });
    });
  }

  applySources();
  new MutationObserver(applySources)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();


/* =====================================================================
   Scroll-driven hero video.
   currentTime is bound to how far the hero has been scrolled through, so
   scrolling down scrubs forward and scrolling up scrubs back. Nothing is
   ever played — this is seeking, which is why reverse costs no extra work.
   The source follows the active site theme.
   ===================================================================== */
(function () {
  'use strict';

  var video = document.querySelector('.hero__video');
  var hero = document.querySelector('.hero');
  if (!video || !hero) return;

  // Theme-specific sources. These must never be crossed over: light theme keeps
  // the light-mode file, dark keeps the dark-mode file.
  var SOURCES = { light: 'videos/hero-light.mp4', dark: 'videos/hero-dark.mp4' };
  // Lower chase rate = heavier smoothing. Trades a little responsiveness for a
  // silkier scrub, which is the tradeoff that was asked for.
  var EASE = 0.075;                // chase rate, calibrated at 60fps
  var EPSILON = 0.0008;
  var SEEK_THRESHOLD = 0.004;      // ~1/8 frame; below this a seek is wasted work

  var target = 0, current = 0, rafId = null, lastFrame = 0;

  function isDark() { return document.documentElement.classList.contains('dark'); }

  /* ---- source, swapped on theme change without losing scroll position ---- */
  function applySource() {
    var next = SOURCES[isDark() ? 'dark' : 'light'];
    if (video.getAttribute('src') === next) return;

    var keep = current;
    video.setAttribute('src', next);
    video.load();
    video.addEventListener('loadedmetadata', function () {
      video.pause();
      if (video.duration) video.currentTime = keep * video.duration;
    }, { once: true });
  }

  applySource();
  // decoupled from the theme button on purpose: this also catches the
  // pre-paint class applied in <head> for returning dark-mode visitors
  new MutationObserver(applySource)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---- a scroll-scrubbed video is motion; honour the OS preference ---- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.addEventListener('loadedmetadata', function () { video.currentTime = 0; }, { once: true });
    return;
  }

  /* ---- scroll → progress ---- */
  function measure() {
    var rect = hero.getBoundingClientRect();
    var top = window.scrollY + rect.top;
    // the pinned stage occupies one viewport, so the scrubbable distance is
    // whatever height is left over — that is exactly how far the sticky
    // element stays put before the hero scrolls away
    var span = hero.offsetHeight - window.innerHeight;
    if (span <= 0) { target = 0; return; }
    var p = (window.scrollY - top) / span;
    target = p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function tick(now) {
    // Frame-rate independent lerp. A flat `current += delta * EASE` moves twice
    // as fast on a 120Hz display as on 60Hz, which is felt as inconsistent
    // catch-up; compounding it over elapsed time makes the feel identical
    // everywhere and stops long frames from producing a visible jump.
    var dt = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
    lastFrame = now;
    if (dt > 0.05) dt = 0.05;                       // tab was backgrounded
    var k = 1 - Math.pow(1 - EASE, dt * 60);

    current += (target - current) * k;
    if (Math.abs(target - current) < EPSILON) current = target;

    // Never queue a seek while one is outstanding — that is what turns a scrub
    // choppy, because each pending seek delays the next decode.
    if (video.readyState >= 1 && video.duration && !video.seeking) {
      var t = current * video.duration;
      if (Math.abs(video.currentTime - t) > SEEK_THRESHOLD) video.currentTime = t;
    }

    if (current === target) { rafId = null; lastFrame = 0; }
    else rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    measure();
    if (rafId === null) { lastFrame = 0; rafId = requestAnimationFrame(tick); }
  }

  /* iOS will not buffer a video that is never played. A scroll-scrubbed video
     is never played by definition, so on iPad the element stays blank and
     readyState never reaches the point where seeking does anything — while
     autoplaying videos elsewhere on the site work fine. Priming it with a
     muted play and an immediate pause forces the decode. It is muted and
     playsinline, so nothing is audible and no motion is visible. */
  function prime() {
    var started = video.play();
    if (started && started.then) started.then(function () { video.pause(); }).catch(function () {});
    else video.pause();
  }

  video.addEventListener('loadedmetadata', function () {
    prime();
    measure();
    onScroll();
  });

  // Safari can refuse the first attempt before any interaction; retry once the
  // user touches the page, which is a gesture iOS always accepts.
  ['touchstart', 'pointerdown'].forEach(function (evt) {
    window.addEventListener(evt, function once() {
      window.removeEventListener(evt, once);
      if (video.readyState < 2) prime();
    }, { passive: true });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  measure();
  current = target;
})();


/* =====================================================================
   Cursor follower — vanilla port of framer-motion's SpringMouseFollow.
   Same constants as the React original (mass 0.1 / damping 10 /
   stiffness 131). Damping ratio works out to 1.38, i.e. overdamped, so it
   trails smoothly and never overshoots — which is what keeps it inside the
   design system's "no bouncy or elastic easing" rule.
   ===================================================================== */
(function () {
  'use strict';

  // A pointer-chasing shape is pointless on touch and unwelcome for anyone
  // who has asked the OS for less motion.
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MASS = 0.1, STIFFNESS = 131, DAMPING = 10;
  var MAX_STEP = 1 / 120;        // substep so the physics stay stable if frames drop
  var REST_POS = 0.01, REST_VEL = 0.01;

  var layer = document.createElement('div');
  layer.className = 'cursor-layer';
  layer.setAttribute('aria-hidden', 'true');

  var dot = document.createElement('div');
  dot.className = 'cursor-follow';
  layer.appendChild(dot);
  document.body.appendChild(layer);

  function spring(initial) {
    return { value: initial, target: initial, velocity: 0 };
  }

  var sx = spring(0), sy = spring(0), sOpacity = spring(0), sScale = spring(0);
  var springs = [sx, sy, sOpacity, sScale];

  function advance(s, dt) {
    var accel = (-STIFFNESS * (s.value - s.target) - DAMPING * s.velocity) / MASS;
    s.velocity += accel * dt;
    s.value += s.velocity * dt;
  }

  function settled(s) {
    return Math.abs(s.value - s.target) < REST_POS && Math.abs(s.velocity) < REST_VEL;
  }

  var running = false, lastTime = 0, primed = false;

  function frame(now) {
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;                 // tab was backgrounded; don't explode

    while (dt > 0) {
      var step = dt > MAX_STEP ? MAX_STEP : dt;
      for (var i = 0; i < springs.length; i++) advance(springs[i], step);
      dt -= step;
    }

    dot.style.transform =
      'translate3d(' + sx.value.toFixed(2) + 'px,' + sy.value.toFixed(2) + 'px,0)' +
      ' scale(' + sScale.value.toFixed(3) + ')';
    dot.style.opacity = sOpacity.value.toFixed(3);

    // idle out once everything has come to rest, rather than burning a
    // rAF loop for the whole session
    if (springs.every(settled)) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', function (e) {
    sx.target = e.clientX;
    sy.target = e.clientY;

    if (!primed) {                          // first sighting: appear in place,
      primed = true;                        // don't fly in from the corner
      sx.value = e.clientX;
      sy.value = e.clientY;
    }

    sOpacity.target = 0.5;                  // paired with multiply blend in the CSS
    sScale.target = 1;
    start();
  }, { passive: true });

  document.addEventListener('pointerleave', function () {
    sOpacity.target = 0;
    sScale.target = 0;
    start();
  });

  window.addEventListener('blur', function () {
    sOpacity.target = 0;
    sScale.target = 0;
    start();
  });
})();
