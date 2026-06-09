const ProgressionRenderer = (() => {

  function _subclassHTML() {
    const h        = State.hero; if (!h) return '';
    const level    = h.level;
    const sub      = SubclassSystem.getSubclass();
    const spec     = SubclassSystem.getSpec();
    const classKey = State.heroClassKey;

    let html = `<div class="sec-title" style="margin-top:12px;">⚔️ Прогрессия</div>`;

    // ── SUBCLASS ──
    if (level < 100) {
      html += `<div class="prog-locked-note">🔒 Подкласс открывается на Ур.100 (текущий: ${level})</div>
        <div class="prog-xp-bar-wrap">
          <div class="prog-xp-fill" style="width:${Math.min(100,level)}%"></div>
        </div>`;
    } else if (sub) {
      html += `<div class="prog-card prog-active">
        <div class="prog-card-head">
          <span class="prog-ico">${sub.cfg.ico}</span>
          <div>
            <div class="prog-name">${sub.cfg.name} <span class="prog-badge">Подкласс</span></div>
            <div class="prog-desc">${sub.cfg.desc}</div>
          </div>
        </div>
      </div>`;
    } else {
      // Show subclass picker
      const options = SubclassConfig[classKey] || [];
      html += `<div class="prog-section-title">🎭 Выбери подкласс:</div>`;
      html += `<div class="prog-picker">` + options.map(opt =>
        `<button class="prog-pick-btn" data-subclass="${opt.id}">
          <span class="prog-pick-ico">${opt.ico}</span>
          <div class="prog-pick-name">${opt.name}</div>
          <div class="prog-pick-desc">${opt.desc}</div>
        </button>`
      ).join('') + `</div>`;
    }

    // ── SPECIALIZATION ──
    if (level < 200) {
      html += `<div class="prog-locked-note" style="margin-top:8px;">🔒 Специализация открывается на Ур.200 (текущий: ${level})</div>
        <div class="prog-xp-bar-wrap">
          <div class="prog-xp-fill" style="width:${Math.min(100,(level/2))}%"></div>
        </div>`;
    } else if (spec) {
      html += `<div class="prog-card prog-active" style="border-color:var(--purple);">
        <div class="prog-card-head">
          <span class="prog-ico">${spec.cfg.ico}</span>
          <div>
            <div class="prog-name">${spec.cfg.name} <span class="prog-badge" style="border-color:var(--purple);color:var(--purple);">Специализация</span></div>
            <div class="prog-desc">${spec.cfg.desc}</div>
          </div>
        </div>
      </div>`;
    } else if (sub && level >= 200) {
      // Show spec picker
      const options = SpecializationConfig[sub.subId] || [];
      html += `<div class="prog-section-title">⚡ Выбери специализацию:</div>`;
      html += `<div class="prog-picker">` + options.map(opt =>
        `<button class="prog-pick-btn prog-spec-btn" data-spec="${opt.id}">
          <span class="prog-pick-ico">${opt.ico}</span>
          <div class="prog-pick-name">${opt.name}</div>
          <div class="prog-pick-desc">${opt.desc}</div>
        </button>`
      ).join('') + `</div>`;
    }

    return html;
  }

  // ── Medal detail popup ──
  function _showMedalPopup(name, av, kills, isBoss) {
    const rarity  = getMedalRarity(kills);
    if (!rarity) return;
    const next    = getNextMedalRarity(kills);
    const r       = rarity;
    const pct     = next ? Math.round(Math.min(kills, next.threshold) / next.threshold * 100) : 100;

    // Tier titles map
    const TIER_TITLES = {
      silver:  'Серебряный охотник',
      gold:    'Золотой истребитель',
      ruby:    'Рубиновый палач',
      diamond: 'Алмазный легион',
      cosmic:  'Космический бог',
    };
    const tierTitle = TIER_TITLES[r.id] || r.label;

    // Next tier progress text
    const nextText = next
      ? `До ${next.label}: ещё ${next.threshold - kills} убийств`
      : `✦ Высший ранг достигнут`;

    // Decorative divider string using medal color
    const box = document.getElementById('medal-popup-box');
    box.innerHTML = `
      <div class="mpop-ribbon" style="background:${r.bg};border-bottom:1px solid ${r.color}33;">
        <span style="color:${r.color};">${isBoss ? '👑 БОСС' : '⚔️ МОНСТР'}</span>
        <span style="color:${r.color};">${r.label.toUpperCase()}</span>
      </div>
      <div class="mpop-medallion" style="background:linear-gradient(180deg,rgba(10,8,6,1) 0%,rgba(18,14,10,1) 100%);">

        <div class="mpop-coin" style="
            background:radial-gradient(circle at 35% 30%, ${r.color}22, ${r.color}05 60%, rgba(0,0,0,.6));
            border:3px solid ${r.color}88;
            box-shadow:0 0 28px ${r.glow}, inset 0 0 20px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.8);">
          <div style="
            position:absolute;inset:-5px;border-radius:50%;
            border:2px solid ${r.color}44;
            box-shadow:0 0 16px ${r.glow};"></div>
          <div style="
            position:absolute;inset:5px;border-radius:50%;
            border:1px solid ${r.color}22;"></div>
          <span style="
            filter:drop-shadow(0 0 12px ${r.color}) drop-shadow(0 2px 6px rgba(0,0,0,.9));
            position:relative;z-index:1;">${av}</span>
        </div>

        <div class="mpop-name" style="color:${r.color};">${name}</div>
        <div class="mpop-rarity" style="color:${r.color};">${tierTitle}</div>

        <div class="mpop-stats">
          <div class="mpop-stat">
            <div class="mpop-stat-lbl">Убийств</div>
            <div class="mpop-stat-val" style="color:${r.color};">${kills.toLocaleString()}</div>
          </div>
          <div class="mpop-stat">
            <div class="mpop-stat-lbl">Ранг</div>
            <div class="mpop-stat-val" style="color:${r.color};font-size:12px;">${r.label}</div>
          </div>
        </div>

        <div class="mpop-prog-section">
          <div class="mpop-prog-label">
            <span>Прогресс</span>
            <span style="color:${r.color};">${pct}%</span>
          </div>
          <div class="mpop-prog-track">
            <div class="mpop-prog-fill" style="width:${pct}%;background:linear-gradient(90deg,${r.color}88,${r.color});box-shadow:0 0 6px ${r.glow};"></div>
          </div>
        </div>

        <div class="mpop-next" style="color:${r.color}88;">${nextText}</div>
      </div>
      <button class="mpop-close" style="color:${r.color}88;border-color:${r.color}22;">✕ Закрыть</button>`;

    // Animate in
    const ov = document.getElementById('medal-popup-ov');
    ov.classList.add('show');

    // Close handlers
    const close = () => {
      ov.classList.remove('show');
    };
    box.querySelector('.mpop-close').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); }, { once: true });
  }

  function _renderMedalCard(name, av, kills, isBoss) {
    const rarity = getMedalRarity(kills);
    if (!rarity) return '';
    const next = getNextMedalRarity(kills);
    const r    = rarity;
    const pct  = next ? Math.round(Math.min(kills, next.threshold) / next.threshold * 100) : 100;
    const killLabel = kills >= 1000 ? `${(kills/1000).toFixed(1)}k` : kills;
    return `<div class="medal-card" style="border:${r.border};background:${r.bg};box-shadow:0 0 6px ${r.glow};" title="${name} · ${kills} убийств" data-medal-name="${name}" data-medal-av="${av}" data-medal-kills="${kills}" data-medal-boss="${isBoss?'1':'0'}">
      <div class="medal-kill-badge" style="color:${r.color};border-color:${r.color}66;">${killLabel}</div>
      <div class="medal-av">${av}</div>
      <div class="medal-card-name">${name}</div>
      <div class="medal-prog-wrap"><div class="medal-prog-fill" style="width:${pct}%;background:${r.color};"></div></div>
    </div>`;
  }

  function _pluralMedal(n) {
    return n === 1 ? 'медаль' : n < 5 ? 'медали' : 'медалей';
  }

  function _medalsHTML() {
    let html = `<div class="sec-title" style="margin-top:14px;">🏅 Медали</div>`;

    // ── Монстры ──
    const monsterCards = MONSTER_MEDALS.map(m => {
      const kills = State.kills ? (State.kills[m.monster] || 0) : 0;
      return _renderMedalCard(m.monster, m.av, kills, false);
    }).filter(Boolean);
    const monsterHidden = MONSTER_MEDALS.length - monsterCards.length;

    html += `<div class="medal-section-title">⚔️ Монстры</div>`;
    if (monsterCards.length) {
      html += `<div class="medal-grid">${monsterCards.join('')}</div>`;
    } else {
      html += `<div class="medal-empty">Убивай монстров, чтобы открыть медали</div>`;
    }
    if (monsterHidden > 0) {
      html += `<div class="medal-hidden-hint">🔒 ${monsterHidden} ${_pluralMedal(monsterHidden)} ещё не открыто</div>`;
    }

    // ── Боссы ──
    const bossCards = BOSS_MEDALS.map(b => {
      const kills = State.bossKills ? (State.bossKills[b.boss] || 0) : 0;
      return _renderMedalCard(b.boss, b.av, kills, true);
    }).filter(Boolean);
    const bossHidden = BOSS_MEDALS.length - bossCards.length;

    html += `<div class="medal-section-title" style="margin-top:10px;">👑 Боссы</div>`;
    if (bossCards.length) {
      html += `<div class="medal-grid">${bossCards.join('')}</div>`;
    } else {
      html += `<div class="medal-empty">Победи боссов, чтобы открыть медали</div>`;
    }
    if (bossHidden > 0) {
      html += `<div class="medal-hidden-hint">🔒 ${bossHidden} ${_pluralMedal(bossHidden)} ещё не открыто</div>`;
    }

    return html;
  }

  function render(containerEl) {
    if (!containerEl) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = _subclassHTML() + _medalsHTML();

    // Bind subclass pick buttons
    wrapper.querySelectorAll('[data-subclass]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ok = SubclassSystem.chooseSubclass(State.heroClassKey, btn.dataset.subclass);
        if (ok) { NavSystem.switchTab('hero'); }
      });
    });
    // Bind spec pick buttons
    wrapper.querySelectorAll('[data-spec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ok = SubclassSystem.chooseSpec(btn.dataset.spec);
        if (ok) { NavSystem.switchTab('hero'); }
      });
    });

    containerEl.appendChild(wrapper);

    // ── Long-press on medal cards → show detail popup ──
    const LONG_MS = 350;
    wrapper.querySelectorAll('.medal-card[data-medal-name]').forEach(el => {
      let _timer = null;
      const _cancel = () => { clearTimeout(_timer); _timer = null; };
      const _start  = () => {
        _cancel();
        _timer = setTimeout(() => {
          const name  = el.dataset.medalName;
          const av    = el.dataset.medalAv;
          const kills = parseInt(el.dataset.medalKills) || 0;
          const boss  = el.dataset.medalBoss === '1';
          _showMedalPopup(name, av, kills, boss);
        }, LONG_MS);
      };
      el.addEventListener('touchstart',  _start,  { passive:true });
      el.addEventListener('touchend',    _cancel, { passive:true });
      el.addEventListener('touchmove',   _cancel, { passive:true });
      el.addEventListener('mousedown',   _start);
      el.addEventListener('mouseup',     _cancel);
      el.addEventListener('mouseleave',  _cancel);
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); _cancel(); });
    });
  }

  return { render };
})();
