/* lumio — shared behaviour */

(function () {
  'use strict';

  /* ---------- Scroll-position save/restore for homepage ---------- */
  const isHome = /homepage\.html$/.test(location.pathname) || location.pathname === '/';
  if (isHome) {
    const saved = sessionStorage.getItem('lumio-home-scroll');
    if (saved) {
      requestAnimationFrame(() => { window.scrollTo(0, parseInt(saved, 10)); });
      sessionStorage.removeItem('lumio-home-scroll');
    }
  } else {
    // on sub-pages, intercept lumio-brand links back to homepage and save current position
    document.querySelectorAll('a[href="homepage.html"]').forEach((a) => {
      a.addEventListener('click', () => {
        const ref = document.referrer;
        const refPath = ref ? new URL(ref).pathname : '';
        if (refPath && /homepage\.html$/.test(refPath)) {
          // coming back to homepage — position will be restored from sessionStorage
        }
      });
    });
  }
  // on homepage, save scroll whenever leaving
  if (isHome) {
    window.addEventListener('pagehide', () => {
      sessionStorage.setItem('lumio-home-scroll', window.scrollY);
    });
    // also save on any link click away from the page
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a && !a.href.includes('homepage.html') && !a.href.startsWith('#') && !a.target) {
        sessionStorage.setItem('lumio-home-scroll', window.scrollY);
      }
    });
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.classList.remove('menu-open');
      })
    );
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Hero photo stack (Finder-style, constant loop) ---------- */
  const photoStack = document.querySelector('.photo-stack');
  if (photoStack) {
    const cards = Array.from(photoStack.querySelectorAll('.stack-photo'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      cards.forEach((c) => c.classList.add('is-in'));
    } else if (cards.length) {
      const STEP = 1000; // a photo lands every 1s
      // order runs bottom -> top of the pile
      const order = cards.slice();
      const restack = () => order.forEach((c, i) => (c.style.zIndex = i + 1));
      restack();

      // one-time build: photos drop in one by one
      order.forEach((c, i) => setTimeout(() => c.classList.add('is-in'), i * STEP));

      // then loop forever: the bottom photo lifts and lands back on top
      setTimeout(() => {
        setInterval(() => {
          const card = order.shift(); // current bottom
          order.push(card);           // becomes the new top
          restack();
          card.classList.remove('is-in');
          void card.offsetWidth;      // commit the raised state, then drop it in
          card.classList.add('is-in');
        }, STEP);
      }, order.length * STEP);
    }
  }

  /* ---------- Gallery rail (continuous marquee + manual nav) ---------- */
  const rail = document.getElementById('gallery-rail');
  if (rail) {
    const reduceRail = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = rail.children.length;
    // duplicate the set so the scroll can loop seamlessly
    Array.from(rail.children).forEach((node) => rail.appendChild(node.cloneNode(true)));

    let loopWidth = 0;
    const measure = () => {
      loopWidth = rail.children[count].offsetLeft - rail.children[0].offsetLeft;
    };
    measure();
    window.addEventListener('resize', measure);

    const SPEED = 1.1;    // px per frame — steady drift
    const RESUME = 3000;  // resume drifting 3s after the last interaction
    let auto = !reduceRail;
    const tick = () => {
      if (auto) {
        rail.scrollLeft += SPEED;
        if (rail.scrollLeft >= loopWidth) rail.scrollLeft -= loopWidth;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // pause only on a real click/tap (pointerdown never fires on hover),
    // then resume after a short idle
    let resumeTimer;
    const pause = () => {
      if (reduceRail) return;
      auto = false;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { auto = true; }, RESUME);
    };
    rail.addEventListener('pointerdown', pause);

    const stepBy = () => rail.children[1].offsetLeft - rail.children[0].offsetLeft;
    const prev = document.querySelector('[data-gallery-prev]');
    const next = document.querySelector('[data-gallery-next]');
    prev && prev.addEventListener('click', () => { pause(); rail.scrollBy({ left: -stepBy(), behavior: 'smooth' }); });
    next && next.addEventListener('click', () => { pause(); rail.scrollBy({ left: stepBy(), behavior: 'smooth' }); });
  }

  /* ---------- Animated counters ----------
     <span class="count" data-target="200" data-suffix="+" data-decimals="0"> */
  const counters = document.querySelectorAll('.count');
  const runCounter = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1200;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
      const val = (target * eased).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            runCounter(e.target);
            cio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- Accordions ---------- */
  document.querySelectorAll('.accordion').forEach((acc) => {
    acc.querySelectorAll('.acc-item').forEach((item) => {
      const trigger = item.querySelector('.acc-trigger');
      const panel = item.querySelector('.acc-panel');
      if (!trigger || !panel) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        if (acc.dataset.single === 'true') {
          acc.querySelectorAll('.acc-item.open').forEach((o) => {
            o.classList.remove('open');
            o.querySelector('.acc-panel').style.maxHeight = '0px';
          });
        }
        if (isOpen) {
          item.classList.remove('open');
          panel.style.maxHeight = '0px';
        } else {
          item.classList.add('open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  });

  /* ---------- Account carousel (in practice) ---------- */
  const track = document.querySelector('.hscroll');
  if (track) {
    const cards = Array.from(track.querySelectorAll('.account-card'));
    const dotsWrap = document.querySelector('.carousel-dots');
    const prev = document.querySelector('[data-carousel-prev]');
    const next = document.querySelector('[data-carousel-next]');
    let active = 0;

    const dots = cards.map((_, i) => {
      const d = document.createElement('button');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Go to account ' + (i + 1));
      d.addEventListener('click', () => scrollToCard(i));
      dotsWrap && dotsWrap.appendChild(d);
      return d;
    });

    const scrollToCard = (i) => {
      const card = cards[Math.max(0, Math.min(cards.length - 1, i))];
      track.scrollTo({
        left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2,
        behavior: 'smooth',
      });
    };

    const setActive = (i) => {
      if (i === active) return;
      active = i;
      dots.forEach((d, j) => d.classList.toggle('active', j === i));
      cards.forEach((c, j) => c.classList.toggle('is-active', j === i));
      // trigger metric counters within active card (staggered)
      const cardCounters = cards[i].querySelectorAll('.count');
      cardCounters.forEach((c, k) => setTimeout(() => runCounter(c), k * 150));
    };

    // run first card's counters when carousel scrolls into view
    if ('IntersectionObserver' in window) {
      const fio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              cards[0].querySelectorAll('.count').forEach((c, k) => setTimeout(() => runCounter(c), k * 150));
              fio.unobserve(track);
            }
          });
        },
        { threshold: 0.3 }
      );
      fio.observe(track);
    }

    let scrollTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((c, i) => {
          const center = c.offsetLeft + c.clientWidth / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        setActive(best);
      }, 80);
    }, { passive: true });

    prev && prev.addEventListener('click', () => scrollToCard(active - 1));
    next && next.addEventListener('click', () => scrollToCard(active + 1));

    // tap a non-active (peeking) card to bring it to centre
    cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === active);
      card.addEventListener('click', () => {
        if (i === active) return; // active card stays interactive (text selection etc.)
        if (window.getSelection && String(window.getSelection()).length) return; // don't hijack a drag-select
        scrollToCard(i);
      });
    });
  }

  /* ---------- Stage stepper (activation) ---------- */
  const stagePanel = document.querySelector('[data-stages]');
  if (stagePanel) {
    const tabs = stagePanel.querySelectorAll('.stage-tab');
    const bodies = stagePanel.querySelectorAll('[data-stage-body]');
    const imgs = document.querySelectorAll('[data-stage-img]');
    const prevBtn = stagePanel.querySelector('[data-stage-prev]');
    const nextBtn = stagePanel.querySelector('[data-stage-next]');
    const navDots = Array.from(stagePanel.querySelectorAll('.stage-dot'));
    const counterEl = document.getElementById('stage-cur');
    const total = bodies.length;
    let idx = 0;

    const setStage = (i) => {
      idx = ((i % total) + total) % total;
      tabs.forEach((t, j) => t.classList.toggle('active', j === idx));
      bodies.forEach((b, j) => (b.style.display = j === idx ? 'block' : 'none'));
      imgs.forEach((im, j) => im.classList.toggle('active', j === idx));
      navDots.forEach((d, j) => d.classList.toggle('active', j === idx));
      if (counterEl) counterEl.textContent = String(idx + 1).padStart(2, '0');
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === total - 1;
    };

    tabs.forEach((t, j) => t.addEventListener('click', () => setStage(j)));
    navDots.forEach((d, j) => d.addEventListener('click', () => setStage(j)));
    prevBtn && prevBtn.addEventListener('click', () => setStage(idx - 1));
    nextBtn && nextBtn.addEventListener('click', () => setStage(idx + 1));

    // swipe support on stage panel
    let stx = 0;
    stagePanel.addEventListener('touchstart', (e) => { stx = e.touches[0].clientX; }, { passive: true });
    stagePanel.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - stx;
      if (Math.abs(dx) > 44) setStage(idx + (dx < 0 ? 1 : -1));
    });

    setStage(0);
  }

  /* ---------- Mini image carousels ---------- */
  document.querySelectorAll('.mini-col').forEach((col) => {
    const trackEl = col.querySelector('.mini-track');
    const slides = col.querySelectorAll('.mini-track img');
    const dotsWrap = col.querySelector('.mini-dots');
    const prevBtn = col.querySelector('[data-mini-prev]');
    const nextBtn = col.querySelector('[data-mini-next]');
    if (!trackEl || !slides.length || !dotsWrap) return;
    let i = 0;
    const dots = Array.from(slides).map((_, j) => {
      const d = document.createElement('button');
      d.className = 'dot' + (j === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Image ' + (j + 1));
      d.addEventListener('click', () => go(j));
      dotsWrap.appendChild(d);
      return d;
    });
    dotsWrap.classList.add('carousel-dots');
    const go = (j) => {
      i = (j + slides.length) % slides.length;
      trackEl.style.transform = 'translateX(-' + i * 100 + '%)';
      dots.forEach((d, k) => d.classList.toggle('active', k === i));
    };
    let auto = setInterval(() => go(i + 1), 4600);
    const restartAuto = () => { clearInterval(auto); auto = setInterval(() => go(i + 1), 4600); };
    col.addEventListener('pointerenter', () => clearInterval(auto));
    col.addEventListener('pointerleave', restartAuto);
    prevBtn && prevBtn.addEventListener('click', () => { go(i - 1); restartAuto(); });
    nextBtn && nextBtn.addEventListener('click', () => { go(i + 1); restartAuto(); });
    slides.forEach((img) => img.addEventListener('click', () => { go(i + 1); restartAuto(); }));
    let tx = 0;
    trackEl.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    trackEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); restartAuto(); }
    });
  });

  /* ---------- Form behaviours (become a partner) ---------- */
  const form = document.querySelector('#partner-form');
  if (form) {
    // multi-select chips
    const allChips = Array.from(form.querySelectorAll('.chip'));
    const deselectAll = () => allChips.forEach((c) => {
      c.classList.remove('selected');
      if (c.dataset.expands) form.querySelector(c.dataset.expands)?.classList.remove('show');
    });
    allChips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        if (chip.dataset.solo) {
          // "All of the above" or "Other" — deselect everything else first
          deselectAll();
          chip.classList.add('selected');
          if (chip.dataset.expands) form.querySelector(chip.dataset.expands)?.classList.add('show');
        } else {
          // Regular chip — deselect any solo chips, then toggle this one
          allChips.filter((c) => c.dataset.solo).forEach((c) => {
            c.classList.remove('selected');
            if (c.dataset.expands) form.querySelector(c.dataset.expands)?.classList.remove('show');
          });
          chip.classList.toggle('selected');
        }
      });
    });
    // segmented single-select
    form.querySelectorAll('.seg-group').forEach((group) => {
      group.querySelectorAll('.seg').forEach((seg) => {
        seg.addEventListener('click', (e) => {
          e.preventDefault();
          group.querySelectorAll('.seg').forEach((s) => s.classList.remove('selected'));
          seg.classList.add('selected');
        });
      });
    });
    // agency type "Other" expand
    const agencySelect = form.querySelector('#agency-type');
    if (agencySelect) {
      agencySelect.addEventListener('change', () => {
        const expand = form.querySelector('#agency-type-other');
        expand && expand.classList.toggle('show', agencySelect.value === 'Other');
      });
    }
    // submit -> confetti + success state
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      fireConfetti();
      const fields = form.querySelector('.form-fields');
      const success = form.querySelector('.form-success');
      if (fields && success) {
        fields.style.display = 'none';
        success.classList.add('show');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /* ---------- Confetti ---------- */
  function fireConfetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#F25B2A', '#E3D5F7', '#A98BE3', '#F2B63C', '#F0BBD8', '#211E1A'];
    const N = 160;
    const parts = Array.from({ length: N }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 240,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: -(6 + Math.random() * 13),
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const draw = (now) => {
      const elapsed = now - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.25;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.992;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2800);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3000) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(draw);
  }
})();
