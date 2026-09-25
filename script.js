(() => {
    'use strict';

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = Boolean(window.gsap && window.ScrollTrigger && window.SplitText);

    /* ------------------------------------------------------------------
       Clock + year
       ------------------------------------------------------------------ */
    const clockFormat = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Chicago',
    });
    const clocks = document.querySelectorAll('[data-clock]');
    const tick = () => {
        const time = clockFormat.format(new Date());
        clocks.forEach((el) => { el.textContent = time; });
    };
    tick();
    setInterval(tick, 10000);

    document.querySelectorAll('[data-year]').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });

    /* ------------------------------------------------------------------
       Intro counter (the curtain itself is pure CSS)
       ------------------------------------------------------------------ */
    const introCount = document.querySelector('[data-intro-count]');
    if (root.classList.contains('has-intro') && introCount) {
        const start = performance.now();
        const duration = 1150;
        const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            introCount.textContent = String(Math.round(eased * 100)).padStart(3, '0');
            if (progress < 1) requestAnimationFrame(step);
        };
        introCount.textContent = '000';
        requestAnimationFrame(step);
        setTimeout(() => document.querySelector('.intro')?.remove(), 2600);
    }

    /* ------------------------------------------------------------------
       Fit the big type to the page width
       ------------------------------------------------------------------ */
    const nameWrap = document.querySelector('[data-fit-name]');
    const nameRef = nameWrap.querySelector('[data-fit-ref]');
    const nameFirst = nameWrap.querySelector('.hero-line');
    const hero = document.querySelector('.hero');
    const heroBottom = document.querySelector('.hero-bottom');
    const email = document.querySelector('[data-fit-email]');
    const emailText = email.querySelector('span');

    function fitType() {
        // Size the name so "Thurman" spans the full width, but keep the whole
        // hero on one screen on wide, short displays.
        nameWrap.style.setProperty('--name-size', '100px');
        let nameSize = (100 * nameWrap.clientWidth) / nameRef.offsetWidth;
        if (window.innerWidth > 900) {
            const heroStyle = getComputedStyle(hero);
            const room = window.innerHeight
                - parseFloat(heroStyle.paddingTop)
                - parseFloat(heroStyle.paddingBottom)
                - parseFloat(heroStyle.rowGap)
                - heroBottom.offsetHeight;
            nameSize = Math.min(nameSize, room / 1.6);
        }
        nameWrap.style.setProperty('--name-size', `${nameSize}px`);

        // Put the "Currently / Previously" details beside "Tanner" if there's room.
        const firstWidth = nameFirst.offsetWidth;
        nameWrap.style.setProperty('--line1-w', `${firstWidth}px`);
        nameWrap.classList.toggle('meta-below', nameWrap.clientWidth - firstWidth < 240);

        // Size the email so it spans the full width.
        email.style.setProperty('--email-size', '100px');
        const available = email.parentElement.clientWidth - parseFloat(getComputedStyle(email.parentElement).paddingLeft) * 2;
        email.style.setProperty('--email-size', `${(100 * available) / emailText.offsetWidth}px`);
    }

    fitType();
    document.fonts?.ready.then(fitType);

    // On phones only width changes matter (the toolbar changes the height constantly).
    let fitted = { w: window.innerWidth, h: window.innerHeight };
    let fitFrame = 0;
    window.addEventListener('resize', () => {
        const sameWidth = window.innerWidth === fitted.w;
        const heightMatters = window.innerWidth > 900 && window.innerHeight !== fitted.h;
        if ((sameWidth && !heightMatters) || fitFrame) return;
        fitFrame = requestAnimationFrame(() => {
            fitFrame = 0;
            fitted = { w: window.innerWidth, h: window.innerHeight };
            fitType();
        });
    });

    /* ------------------------------------------------------------------
       Smooth scrolling
       ------------------------------------------------------------------ */
    let lenis = null;
    if (!reduceMotion && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
        if (hasGsap) {
            lenis.on('scroll', window.ScrollTrigger.update);
            window.gsap.ticker.add((time) => lenis.raf(time * 1000));
            window.gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => {
                lenis.raf(time);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }
    }

    function scrollToTarget(target) {
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.4 });
        } else if (target === 0) {
            window.scrollTo({ top: 0 });
        } else {
            target.scrollIntoView();
        }
    }

    document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach((link) => {
        link.addEventListener('click', (event) => {
            const hash = link.getAttribute('href');
            const target = hash === '#top' ? 0 : document.querySelector(hash);
            if (target === null) return;
            event.preventDefault();
            setMenu(false);
            scrollToTarget(target);
        });
    });

    /* ------------------------------------------------------------------
       Header gets out of the way while scrolling down
       ------------------------------------------------------------------ */
    const header = document.querySelector('.header');
    let lastScroll = window.scrollY;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (Math.abs(y - lastScroll) < 6) return;
        const menuOpen = document.querySelector('[data-menu]').classList.contains('is-open');
        header.classList.toggle('is-hidden', y > lastScroll && y > window.innerHeight * 0.5 && !menuOpen);
        lastScroll = y;
    }, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

    /* ------------------------------------------------------------------
       Mobile menu
       ------------------------------------------------------------------ */
    const menu = document.querySelector('[data-menu]');
    const menuToggle = document.querySelector('[data-menu-toggle]');

    function setMenu(open) {
        if (menu.classList.contains('is-open') === open) return;
        menu.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        if (lenis) open ? lenis.stop() : lenis.start();
    }

    menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            setMenu(false);
            menuToggle.focus();
        }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
        if (event.matches) setMenu(false);
    });

    /* ------------------------------------------------------------------
       Project list: expand rows + cursor-following preview
       ------------------------------------------------------------------ */
    const projects = [...document.querySelectorAll('.project')];
    const preview = document.querySelector('[data-preview]');
    let showPreview = () => {};
    let hidePreview = () => {};

    projects.forEach((project, index) => {
        const row = project.querySelector('[data-project-row]');
        const detail = project.querySelector('[data-project-detail]');
        detail.inert = true;

        row.addEventListener('click', () => {
            const open = row.getAttribute('aria-expanded') !== 'true';
            row.setAttribute('aria-expanded', String(open));
            project.classList.toggle('is-open', open);
            detail.inert = !open;
            if (open) {
                hidePreview();
                project.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
            }
            // Layout changed; let scroll-linked animations recalculate once it settles.
            if (hasGsap) setTimeout(() => window.ScrollTrigger.refresh(), 850);
        });

        row.addEventListener('pointerenter', () => {
            if (row.getAttribute('aria-expanded') !== 'true') showPreview(index);
        });
        row.addEventListener('pointerleave', () => hidePreview());
    });

    if (finePointer && preview) {
        const inner = document.createElement('div');
        inner.className = 'preview-inner';
        preview.appendChild(inner);

        const slides = projects.map((project) => {
            const slide = project.querySelector('[data-cover]').cloneNode(true);
            slide.removeAttribute('data-cover');
            slide.classList.remove('cover');
            slide.classList.add('preview-slide');
            slide.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
            slide.querySelectorAll('[role="img"]').forEach((svg) => svg.removeAttribute('role'));
            inner.appendChild(slide);
            return slide;
        });

        const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const target = { ...pos };
        let visible = false;
        let rafId = 0;
        let idleFrames = 0;

        window.addEventListener('pointermove', (event) => {
            target.x = event.clientX;
            target.y = event.clientY;
        }, { passive: true });

        const loop = () => {
            const dx = target.x - pos.x;
            pos.x += dx * 0.14;
            pos.y += (target.y - pos.y) * 0.14;
            const tilt = Math.max(-10, Math.min(10, dx * 0.06));
            preview.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${tilt}deg)`;
            idleFrames = visible ? 0 : idleFrames + 1;
            rafId = idleFrames > 60 ? 0 : requestAnimationFrame(loop);
        };

        showPreview = (index) => {
            slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
            if (!visible) {
                pos.x = target.x;
                pos.y = target.y;
            }
            visible = true;
            preview.classList.add('is-visible');
            if (!rafId) rafId = requestAnimationFrame(loop);
        };

        hidePreview = () => {
            visible = false;
            preview.classList.remove('is-visible');
        };
    }

    /* ------------------------------------------------------------------
       Featured project: a thumbnail trades places with the main shot
       ------------------------------------------------------------------ */
    document.querySelectorAll('[data-gallery]').forEach((gallery) => {
        const main = gallery.querySelector('[data-gallery-main]');
        gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
            const img = thumb.querySelector('img');
            thumb.addEventListener('click', () => {
                const { src, alt } = main;
                main.src = img.src;
                main.alt = img.alt;
                img.src = src;
                img.alt = alt;
            });
        });
    });

    /* ------------------------------------------------------------------
       Marquee speeds up with scroll velocity
       ------------------------------------------------------------------ */
    const marquee = document.querySelector('[data-marquee]');
    if (marquee && !reduceMotion) {
        marquee.appendChild(marquee.firstElementChild.cloneNode(true));
        const animation = marquee.getAnimations?.()[0];
        if (animation) {
            let rate = 1;
            let boost = 0;
            let lastY = window.scrollY;
            let direction = 1;

            window.addEventListener('scroll', () => {
                const delta = window.scrollY - lastY;
                lastY = window.scrollY;
                if (delta !== 0) direction = Math.sign(delta);
                boost = Math.min(8, boost + Math.abs(delta) * 0.04);
            }, { passive: true });

            const update = () => {
                boost *= 0.92;
                const next = direction * (1 + boost);
                rate += (next - rate) * 0.1;
                animation.playbackRate = rate;
                requestAnimationFrame(update);
            };
            requestAnimationFrame(update);
        }
    }

    /* ------------------------------------------------------------------
       Copy email
       ------------------------------------------------------------------ */
    const live = document.querySelector('[data-live]');
    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
            } catch (error) {
                window.location.href = `mailto:${button.dataset.copy}`;
                return;
            }
            button.classList.add('is-copied');
            live.textContent = 'Email address copied';
            setTimeout(() => {
                button.classList.remove('is-copied');
                live.textContent = '';
            }, 2000);
        });
    });

    /* ------------------------------------------------------------------
       Hero dot field
       ------------------------------------------------------------------ */
    const canvas = document.querySelector('[data-dots]');
    if (canvas?.getContext) {
        const ctx = canvas.getContext('2d');
        const hero = canvas.parentElement;
        const SPACING = 24;
        const BASE_R = 1;
        const MAX_R = 4.2;
        const REACH = 170;
        const INK = [15, 15, 14];
        const ACCENT = [255, 79, 31];

        let dots = [];
        let width = 0;
        let height = 0;
        let rafId = 0;
        let inView = true;
        let active = false;
        const pointer = { x: -9999, y: -9999, inside: false };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            dots = [];
            const cols = Math.floor(width / SPACING);
            const rows = Math.floor(height / SPACING);
            const offsetX = (width - (cols - 1) * SPACING) / 2;
            const offsetY = (height - (rows - 1) * SPACING) / 2;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    dots.push({ x: offsetX + c * SPACING, y: offsetY + r * SPACING, e: 0 });
                }
            }
            draw(performance.now());
        };

        const draw = (time) => {
            // With no mouse (touch, or pointer elsewhere) a slow "ghost" cursor drifts around.
            let px = pointer.x;
            let py = pointer.y;
            const ambient = !pointer.inside && !reduceMotion;
            if (ambient) {
                px = width * (0.5 + 0.38 * Math.sin(time * 0.00021));
                py = height * (0.5 + 0.32 * Math.sin(time * 0.00033 + 1.3));
            }
            const hasTarget = pointer.inside || ambient;

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = `rgba(${INK.join(',')}, 0.2)`;
            ctx.beginPath();

            const hot = [];
            active = false;
            for (const dot of dots) {
                let target = 0;
                if (hasTarget) {
                    const dist = Math.hypot(dot.x - px, dot.y - py);
                    if (dist < REACH) target = (1 - dist / REACH) ** 2;
                }
                dot.e += (target - dot.e) * (reduceMotion ? 1 : 0.12);
                if (dot.e > 0.01) {
                    hot.push(dot);
                    active = true;
                } else {
                    ctx.moveTo(dot.x + BASE_R, dot.y);
                    ctx.arc(dot.x, dot.y, BASE_R, 0, Math.PI * 2);
                }
            }
            ctx.fill();

            for (const dot of hot) {
                const e = dot.e;
                const r = BASE_R + (MAX_R - BASE_R) * e;
                const color = INK.map((v, i) => Math.round(v + (ACCENT[i] - v) * Math.min(1, e * 1.4)));
                ctx.fillStyle = `rgba(${color.join(',')}, ${0.2 + 0.8 * e})`;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const frame = (time) => {
            draw(time);
            const keepGoing = inView && !document.hidden && (active || pointer.inside || !reduceMotion);
            rafId = keepGoing ? requestAnimationFrame(frame) : 0;
        };

        const start = () => {
            if (!rafId && inView && !document.hidden && !reduceMotion) rafId = requestAnimationFrame(frame);
        };

        hero.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'touch') return;
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
            pointer.inside = true;
            if (reduceMotion) draw(0);
            else start();
        });

        hero.addEventListener('pointerleave', () => {
            pointer.inside = false;
            if (reduceMotion) draw(0);
        });

        new ResizeObserver(resize).observe(canvas);
        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            start();
        }).observe(canvas);
        document.addEventListener('visibilitychange', start);

        resize();
        start();
    }

    /* ------------------------------------------------------------------
       Scroll-driven type animation (GSAP)
       ------------------------------------------------------------------ */
    if (!hasGsap || reduceMotion) return;

    const { gsap, ScrollTrigger, SplitText } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);

    const startAnimations = () => {
        // Big section titles: letters rise out of their line.
        document.querySelectorAll('[data-split]').forEach((title) => {
            SplitText.create(title, {
                type: 'lines,chars',
                mask: 'lines',
                linesClass: 'split-line',
                autoSplit: true,
                onSplit: (self) => gsap.from(self.chars, {
                    yPercent: 110,
                    duration: 1.2,
                    ease: 'expo.out',
                    stagger: 0.025,
                    scrollTrigger: { trigger: title, start: 'top 88%' },
                }),
            });
        });

        // About statement lights up word by word as you scroll through it.
        const statement = document.querySelector('[data-words]');
        if (statement) {
            SplitText.create(statement, {
                type: 'words',
                autoSplit: true,
                onSplit: (self) => gsap.fromTo(self.words, { opacity: 0.16 }, {
                    opacity: 1,
                    ease: 'none',
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: statement,
                        start: 'top 80%',
                        end: 'bottom 45%',
                        scrub: true,
                    },
                }),
            });
        }

        // Email: letters rise in.
        SplitText.create(emailText, {
            type: 'chars',
            autoSplit: true,
            onSplit: (self) => gsap.from(self.chars, {
                yPercent: 110,
                duration: 1.1,
                ease: 'expo.out',
                stagger: 0.02,
                scrollTrigger: { trigger: email, start: 'top 92%' },
            }),
        });

        // List rows slide up as they enter.
        gsap.set('.project, .row, .project-labels', { opacity: 0, y: 40 });
        ScrollTrigger.batch('.project, .row, .project-labels', {
            start: 'top 92%',
            once: true,
            onEnter: (batch) => gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 1.1,
                ease: 'expo.out',
                stagger: 0.07,
            }),
        });

        // Hero name drifts up a little slower than the page.
        gsap.to('.hero-name-wrap', {
            yPercent: -18,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
    };

    // Split after the webfonts load so line breaks are measured correctly.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(startAnimations);
})();
