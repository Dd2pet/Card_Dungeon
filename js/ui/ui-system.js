const UISystem = (() => {
  const _cache = new Map();
  const $ = (id) => {
    if (!_cache.has(id)) _cache.set(id, document.getElementById(id));
    return _cache.get(id);
  };
  const pct = (v, m) => m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0;

  return {
    $, pct,
    showToast(msg) {
      document.querySelectorAll('.toast-el').forEach(t => t.remove());
      const el = document.createElement('div');
      el.className = 'toast-el';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2300);
    },
    floatText(text, cls, targetEl) {
      const arena = document.getElementById('arena');
      if (!targetEl || !arena) return;
      const r = targetEl.getBoundingClientRect();
      const ar = arena.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = `floater ${cls}`;
      el.textContent = text;
      el.style.left = `${r.left - ar.left + r.width / 2 - 20}px`;
      el.style.top  = `${r.top  - ar.top  + 10}px`;
      arena.style.position = 'relative';
      arena.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    },
    shake(id) {
      const el = $(id); if (!el) return;
      el.classList.remove('shake', 'flash-r'); void el.offsetWidth;
      el.classList.add('shake', 'flash-r');
      setTimeout(() => el.classList.remove('shake', 'flash-r'), 400);
    },
    flashGreen(id) {
      const el = $(id); if (!el) return;
      el.classList.remove('flash-g'); void el.offsetWidth;
      el.classList.add('flash-g');
      setTimeout(() => el.classList.remove('flash-g'), 400);
    },
    flashBlue(id) {
      const el = $(id); if (!el) return;
      el.classList.remove('flash-b'); void el.offsetWidth;
      el.classList.add('flash-b');
      setTimeout(() => el.classList.remove('flash-b'), 400);
    },
    bar(id, p) { const el = $(id); if (el) el.style.width = `${p}%`; },
    log(text, type = 'li') {
      const log = $('log'); if (!log) return;
      const el = document.createElement('div');
      el.className = `le ${type}`;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      while (log.children.length > 40) log.removeChild(log.firstChild);
    },
    setScreen(id) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const el = $(id); if (el) el.classList.add('active');
    },
    setText(id, val) { const el = $(id); if (el) el.textContent = val; },
    setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; },
    addClass(id, cls) { const el = $(id); if (el) el.classList.add(cls); },
    removeClass(id, cls) { const el = $(id); if (el) el.classList.remove(cls); },
    showLevelUpBanner(level) {
      const el = $('levelup-banner');
      if (!el) return;
      el.textContent = `🎉 УРОВЕНЬ ${level}!`;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2200);
    },
  };
})();
