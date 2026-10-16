/* Smooth scrolling (Lenis) + My work sticky stacking cards (GSAP UI "sticky-scroll", plain JS) */
(function () {
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var imgs = document.querySelectorAll('img');
  for (var n = 0; n < imgs.length; n++) imgs[n].decoding = 'async';       // big screenshots decode off the main thread

  var wrap = document.getElementById('showcase');
  var cards = wrap ? [].slice.call(wrap.querySelectorAll('.scard')) : [];

  // ---- maximalist dressing for each card: ticker, giant word, tags, browser frame, chips, sticker, spinning badge
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  cards.forEach(function (card, i) {
    var title = card.querySelector('.scard-title');
    var shot = card.querySelector('.scard-img');
    var body = card.querySelector('.scard-body');
    var num = card.querySelector('.scard-idx').textContent.trim();
    var name = title.textContent.trim();
    if (i === cards.length - 1) card.classList.add('lm');
    card.appendChild(mk('div', 'scard-dim')); card.lastChild.setAttribute('aria-hidden', 'true');

    var line = (name + ' \u2726 CONCEPT WEBSITE \u2726 FREE DEMO \u2726 ').toUpperCase();
    line = line + line + line;
    var marq = mk('div', 'scard-marq'); marq.setAttribute('aria-hidden', 'true');
    marq.appendChild(mk('div', '', '<span>' + line + '</span><span>' + line + '</span>'));
    card.insertBefore(marq, card.firstChild);

    var word = mk('div', 'scard-bgword', name.split(' ')[0]); word.setAttribute('aria-hidden', 'true');
    card.insertBefore(word, marq.nextSibling);
    var count = mk('div', 'scard-count', num + ' / 0' + cards.length); count.setAttribute('aria-hidden', 'true');
    card.insertBefore(count, word.nextSibling);

    body.insertBefore(mk('ul', 'scard-tags', '<li>Clinic website</li><li>Web design</li><li>Mobile-friendly</li><li>Concept</li>'), title);

    var stage = mk('div', 'scard-stage');
    shot.parentNode.insertBefore(stage, shot);
    stage.appendChild(shot);
    stage.appendChild(mk('span', 'scard-chip c1', 'Services'));
    stage.appendChild(mk('span', 'scard-chip c2', 'Timings &amp; contact'));
    stage.appendChild(mk('span', 'scard-sticker', 'Concept<br>\u2726'));
    var spin = mk('a', 'scard-spin',
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="scc' + i + '" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs>' +
      '<text><textPath href="#scc' + i + '" textLength="280" lengthAdjust="spacing">VIEW WEBSITE \u2726 VIEW WEBSITE \u2726 </textPath></text></svg><b>\u2197</b>');
    spin.href = shot.href; spin.target = '_blank'; spin.rel = 'noopener'; spin.tabIndex = -1; spin.setAttribute('aria-hidden', 'true');
    stage.appendChild(spin);
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });                   // phone address bar showing/hiding must not re-measure and jump

  // ---- smooth scroll (desktop wheel/trackpad). Touch keeps the phone's own native momentum scrolling.
  if (window.Lenis && !calm) {
    var lenis = new Lenis({
      lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false,
      anchors: { offset: -70 }                                           // nav links glide, clear of the fixed header
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  if (!wrap || !cards.length) return;

  // ---- My work: CSS position:sticky does the pinning (compositor-driven, so it stays steady on phones).
  // A card taller than the screen scrolls to show its bottom first, then sticks.
  var probe = mk('div'); probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  function setTops() {
    var vh = probe.offsetHeight || innerHeight;                          // svh is constant, so mobile toolbars don't move it
    cards.forEach(function (c) { c.style.top = Math.min(0, vh - c.offsetHeight) + 'px'; });
  }
  setTops();
  ScrollTrigger.addEventListener('refreshInit', setTops);

  if (calm) return;                                                      // reduced motion: stacking stays, tilting and parallax go

  // ---- 3D scroll animation, built per screen size (rebuilt cleanly on rotate / resize)
  var mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 761px)', mob: '(max-width: 760px)' }, function (ctx) {
    var m = !!ctx.conditions.mob;
    var cover = m ? { s: .92, rx: 6, rz: 2.5, z: -50, y: -2 } : { s: .84, rx: 10, rz: 4, z: -100, y: -3 };
    var sc = { cover: m ? .35 : .7, inner: m ? .5 : .9 };                // scrub smoothing: a little lag = silky, not laggy

    cards.forEach(function (card, i) {
      var next = cards[i + 1];

      // 1) the card being covered: folds back into depth (tilt, shrink, sink, darken) as the next one slides over it
      if (next) {
        var trig = {
          trigger: next, start: 'top bottom',
          end: function () { return 'top ' + (parseFloat(next.style.top) || 0) + 'px'; },
          scrub: sc.cover, invalidateOnRefresh: true
        };
        gsap.fromTo(card,
          { scale: 1, rotationX: 0, rotationZ: 0, z: 0, yPercent: 0, transformPerspective: 1100, transformOrigin: '50% 40%' },
          { scale: cover.s, rotationX: cover.rx, rotationZ: (i % 2 ? -1 : 1) * cover.rz, z: cover.z, yPercent: cover.y,
            ease: 'none', force3D: true, scrollTrigger: trig });
        gsap.fromTo(card.querySelector('.scard-dim'), { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: trig });
      }

      // 2) the card's own layers: swing in at different speeds, then keep drifting while it is pinned (depth / parallax)
      var q = function (s) { return card.querySelector(s); };
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: sc.inner, invalidateOnRefresh: true }
      });
      tl.fromTo(q('.scard-idx'), { xPercent: -28, rotationY: -48, transformPerspective: 900, transformOrigin: '0% 50%' },
                                 { xPercent: 0, rotationY: 0, duration: .46, ease: 'power2.out' }, 0)
        .fromTo(q('.scard-title'), { y: m ? 40 : 70, rotationX: -32, opacity: .15, transformPerspective: 800, transformOrigin: '50% 100%' },
                                   { y: 0, rotationX: 0, opacity: 1, duration: .42, ease: 'power2.out' }, .02)
        .fromTo(card.querySelectorAll('.scard-tags li'), { scale: .6, opacity: 0, y: 14 },
                                   { scale: 1, opacity: 1, y: 0, duration: .26, stagger: .035, ease: 'power2.out' }, .08)
        .fromTo(q('.scard-stage'), { rotationY: m ? -30 : -17, rotationX: m ? 16 : 9, y: m ? 50 : 36, scale: .92, transformPerspective: 900 },
                                   { rotationY: 0, rotationX: 0, y: 0, scale: 1, duration: .5, ease: 'power2.out' }, 0)
        .fromTo(q('.scard-copy'), { y: m ? 30 : 50, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power2.out' }, .16)
        .fromTo(q('.scard-bgword'), { xPercent: 12 }, { xPercent: -10, duration: 1 }, 0);

      var k = m ? .5 : 1;                                                // floating stickers travel at different speeds
      [['.scard-chip.c1', 50, -50], ['.scard-chip.c2', 20, -60], ['.scard-sticker', 80, -80], ['.scard-spin', 120, -120]].forEach(function (p) {
        var el = q(p[0]); if (el) tl.fromTo(el, { '--py': p[1] * k + 'px' }, { '--py': p[2] * k + 'px', duration: 1 }, 0);
      });
    });
  });

  // ---- keep measurements honest when images, fonts or the layout settle
  var rt = 0;
  function later() { clearTimeout(rt); rt = setTimeout(function () { ScrollTrigger.refresh(); }, 160); }
  addEventListener('load', later);
  addEventListener('orientationchange', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  if ('ResizeObserver' in window) new ResizeObserver(later).observe(wrap);
})();
