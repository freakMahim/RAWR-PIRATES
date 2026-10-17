/* RAWR PIRATES — interactive behavior, no libraries required */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js-ready');

  // All details for future projects live here. Keep this array empty until Mahim has projects to show.
  // Example object: { title: 'Project name', description: 'What it does', technologies: ['HTML', 'CSS'], image: 'assets/project-preview.png', github: 'https://github.com/username/repo', demo: 'https://username.github.io/repo/' }
  const projects = [];

  // Opening sequence: no long loading screen, and no forced audio.
  const intro = $('#intro-screen');
  const sailButton = $('#set-sail');
  let introDismissed = false;
  function enterAdventure() {
    if (!intro || introDismissed) return;
    introDismissed = true;
    if (sailButton) {
      sailButton.disabled = true;
      sailButton.querySelector('span').textContent = 'WELCOME ABOARD';
    }
    intro.classList.add('is-leaving');
    window.setTimeout(() => {
      intro.hidden = true;
      $('#home')?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 950);
  }
  sailButton?.addEventListener('click', enterAdventure);

  // Two coordinated modes (Day and Night), persisted locally when browser storage is available.
  const themeSelect = $('#theme-select');
  const themes = new Set(['day', 'night']);
  function applyTheme(theme, persist = true) {
    const safeTheme = themes.has(theme) ? theme : 'day';
    document.body.dataset.theme = safeTheme;
    document.documentElement.dataset.theme = safeTheme;
    if (themeSelect) themeSelect.value = safeTheme;
    const themeToggle = $('#theme-toggle');
    const themeToggleIcon = $('#theme-toggle-icon');
    const togglingToLight = safeTheme === 'night';
    if (themeToggle) {
      const label = togglingToLight ? 'Switch to light mode' : 'Switch to night mode';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.setAttribute('title', label);
    }
    if (themeToggleIcon) themeToggleIcon.textContent = togglingToLight ? '☀' : '☾';
    const themeColor = { day: '#74d5ee', night: '#0b1728' }[safeTheme];
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', themeColor);
    if (persist) {
      try { localStorage.setItem('rawr-pirates-theme', safeTheme); } catch (_) { /* Private browsing can disable storage. */ }
    }
  }
  try {
    const savedTheme = localStorage.getItem('rawr-pirates-theme');
    if (savedTheme && themes.has(savedTheme)) applyTheme(savedTheme, false);
  } catch (_) { /* Keep the default day palette if storage is unavailable. */ }
  themeSelect?.addEventListener('change', (event) => applyTheme(event.target.value));
  $('#theme-toggle')?.addEventListener('click', () => {
    const current = document.body.dataset.theme;
    applyTheme(current === 'night' ? 'day' : 'night');
  });

  // Responsive navigation.
  const menuToggle = $('#menu-toggle');
  const primaryNav = $('#primary-nav');
  function closeMenu() {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    primaryNav.classList.remove('is-open');
  }
  menuToggle?.addEventListener('click', () => {
    const nextOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(nextOpen));
    menuToggle.setAttribute('aria-label', nextOpen ? 'Close navigation' : 'Open navigation');
    primaryNav?.classList.toggle('is-open', nextOpen);
  });
  $$('.primary-nav a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  // Treasure-map navigation: move the supplied ship to a chosen marker before opening its destination.
  const mapSurface = $('#map-surface');
  const mapShip = $('#map-ship');
  const routePath = $('#route-path');
  const routeEndpoint = $('#route-endpoint');
  const mapStatus = $('#map-status-text');
  const markers = $$('.map-marker');
  let currentShipPosition = { x: 44, y: 50 };
  let sailingTimer = 0;
  function updateRoute(from, to) {
    const startX = from.x * 10;
    const startY = from.y * 4.4;
    const endX = to.x * 10;
    const endY = to.y * 4.4;
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - Math.min(72, Math.abs(startX - endX) * .12 + 30);
    routePath?.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
    routeEndpoint?.setAttribute('cx', String(endX));
    routeEndpoint?.setAttribute('cy', String(endY));
  }
  function sailTo(marker) {
    if (!mapSurface || !mapShip || !marker) return;
    const target = {
      x: Number(marker.dataset.x),
      y: Number(marker.dataset.y),
      section: marker.dataset.target,
      label: marker.querySelector('span:last-child')?.textContent.trim() || marker.dataset.target
    };
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
    window.clearTimeout(sailingTimer);
    updateRoute(currentShipPosition, target);
    mapShip.classList.add('is-sailing');
    mapShip.style.left = `${target.x}%`;
    mapShip.style.top = `${target.y}%`;
    mapShip.style.transform = `translate(-50%, -50%) rotate(${target.x >= currentShipPosition.x ? '4deg' : '-12deg'}) scale(1.07)`;
    markers.forEach((item) => {
      const active = item === marker;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    if (mapStatus) mapStatus.textContent = `Charting a course to ${target.label.toLowerCase()}…`;
    sailingTimer = window.setTimeout(() => {
      mapShip.classList.remove('is-sailing');
      mapShip.style.transform = 'translate(-50%, -50%) rotate(-5deg)';
      currentShipPosition = { x: target.x, y: target.y };
      if (mapStatus) mapStatus.textContent = `Docked at ${target.label.toLowerCase()}. Welcome ashore, captain.`;
      const destination = document.getElementById(target.section);
      destination?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      closeMenu();
    }, prefersReducedMotion ? 0 : 850);
  }
  markers.forEach((marker) => marker.addEventListener('click', () => sailTo(marker)));
  // Draw an initial chart route without moving the ship on page load.
  updateRoute(currentShipPosition, { x: 48, y: 21 });

  // Small discovery interaction on the map.
  const treasureButton = $('#treasure-btn');
  const treasureNote = $('#treasure-note');
  treasureButton?.addEventListener('click', () => {
    if (!treasureNote) return;
    const opening = treasureNote.hidden;
    treasureNote.hidden = !opening;
    treasureButton.textContent = opening ? 'CLOSE TREASURE NOTE ↗' : 'SEARCH FOR TREASURE ↗';
    if (opening) treasureNote.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  // Copy controls work over HTTPS/localhost and have a selection-based fallback elsewhere.
  const toast = $('#toast');
  let toastTimer = 0;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2500);
  }
  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = document.createElement('textarea');
        temp.value = value;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        temp.style.pointerEvents = 'none';
        document.body.appendChild(temp);
        temp.select();
        const copied = document.execCommand('copy');
        temp.remove();
        if (!copied) throw new Error('Clipboard copy not available');
      }
      showToast(`Copied: ${value}`);
    } catch (_) {
      showToast(`Copy unavailable here — select and copy: ${value}`);
    }
  }
  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', () => copyText(button.dataset.copy || ''));
  });

  // Render real projects from the editable array above; empty state stays useful until then.
  function safeExternalLink(url) {
    if (typeof url !== 'string') return '';
    try {
      const parsed = new URL(url, window.location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) { return ''; }
  }
  function renderProjects() {
    const gallery = $('#project-gallery');
    const emptyState = $('.empty-treasure', gallery || document);
    if (!gallery || !projects.length) return;
    emptyState?.remove();
    const board = document.createElement('div');
    board.className = 'project-cards';
    projects.forEach((project, index) => {
      const card = document.createElement('article');
      card.className = 'project-card';
      const figure = document.createElement('div');
      figure.className = 'project-preview';
      if (project.image) {
        const img = document.createElement('img');
        img.src = project.image;
        img.alt = project.title ? `${project.title} project preview` : 'Project preview';
        img.loading = 'lazy';
        img.addEventListener('error', () => { img.remove(); figure.classList.add('preview-fallback'); figure.textContent = 'PREVIEW COMING SOON'; }, { once: true });
        figure.appendChild(img);
      } else {
        figure.classList.add('preview-fallback');
        figure.textContent = `TREASURE ${String(index + 1).padStart(2, '0')}`;
      }
      const body = document.createElement('div');
      body.className = 'project-card-body';
      const tag = document.createElement('p');
      tag.className = 'project-card-tag';
      tag.textContent = `DISCOVERY / ${String(index + 1).padStart(2, '0')}`;
      const title = document.createElement('h3');
      title.textContent = project.title || 'Untitled project';
      const description = document.createElement('p');
      description.textContent = project.description || 'A project added to the captain’s treasure collection.';
      const tech = document.createElement('div');
      tech.className = 'project-technologies';
      (Array.isArray(project.technologies) ? project.technologies : []).forEach((item) => {
        const chip = document.createElement('span'); chip.textContent = String(item); tech.appendChild(chip);
      });
      body.append(tag, title, description, tech);
      const actions = document.createElement('div');
      actions.className = 'project-card-actions';
      const repo = safeExternalLink(project.github);
      const demo = safeExternalLink(project.demo);
      [[repo, 'GITHUB ↗'], [demo, 'LIVE DEMO ↗']].forEach(([href, label]) => {
        if (!href) return;
        const link = document.createElement('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = label; actions.appendChild(link);
      });
      card.append(figure, body, actions);
      board.appendChild(card);
    });
    gallery.insertBefore(board, $('.treasure-side-note', gallery) || null);
  }
  renderProjects();

  // Scroll reveal: observers disconnect after elements have appeared to avoid repeated work.
  const revealNodes = $$('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealNodes.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`;
      revealObserver.observe(node);
    });
  } else {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  }

  // Lightweight scroll UI, throttled to one animation frame.
  const progressFill = $('#scroll-progress-fill');
  const siteHeader = $('#site-header');
  let scrollPending = false;
  function updateScrollUI() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollable * 100)) : 0;
    if (progressFill) progressFill.style.width = `${progress}%`;
    siteHeader?.classList.toggle('has-shadow', window.scrollY > 8);
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  // Highlight the section closest to the header and sync the primary navigation.
  if ('IntersectionObserver' in window) {
    const navSections = ['home', 'about', 'treasure-map', 'projects', 'contact'].map((id) => document.getElementById(id)).filter(Boolean);
    const navObserver = new IntersectionObserver((entries) => {
      const best = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!best) return;
      const activeId = best.target.id;
      $$('.nav-link').forEach((link) => {
        const linkTarget = link.getAttribute('href')?.slice(1);
        const isActive = linkTarget === activeId || (activeId === 'treasure-map' && linkTarget === 'treasure-map');
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0, .1, .25, .4] });
    navSections.forEach((section) => navObserver.observe(section));
  }
})();
