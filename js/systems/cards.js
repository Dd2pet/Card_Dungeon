const CardSystem = (() => {
  let _monsterCards = []; // { monster snapshot, caughtAt, isNew }
  let _petCards     = []; // derived from PetSystem
  let _currentTab   = 'pets';
  let _detailTarget = null;
  const _boundEls   = new WeakSet();

  // ── Record a monster card on kill — ONE card per monster name ──
  function recordMonsterCard(monster) {
    // Deduplicate by name only; keep the highest-level version
    const existing = _monsterCards.find(c => c.name === monster.name);
    if (existing) {
      if (monster.level > existing.level) {
        existing.level   = monster.level;
        existing.atk     = monster.atk;
        existing.def     = monster.def;
        existing.hp      = monster.hp;
        existing.maxHp   = monster.maxHp;
        existing.mutation= monster.mutation;
        existing.isNew   = true;
      }
      // Track kill count on card
      existing.killCount = (existing.killCount || 0) + 1;
    } else {
      _monsterCards.push({
        id:        `mc_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        name:      monster.name,
        baseName:  monster.name,
        av:        monster.av || '👹',
        level:     monster.level,
        rarity:    monster.rarity || 'common',
        rarityLabel: (MonsterRarityConfig.rarities[monster.rarity] || {}).label || 'Обычный',
        rarityColor: (MonsterRarityConfig.rarities[monster.rarity] || {}).color || '#a0a0a0',
        atk:       monster.atk,
        def:       monster.def,
        hp:        monster.hp,
        maxHp:     monster.maxHp,
        mutation:  monster.mutation || null,
        zone:      State.zone?.label || '?',
        zoneId:    State.zone?.id   || 'forest',
        killCount: 1,
        isBoss:    monster._isBoss  || false,
        caughtAt:  Date.now(),
        isNew:     true,
        type:      'monster',
      });
    }
    EventBus.emit('card:collected', monster);
  }

  // ── Build monster card HTML (no rarity, zone-based design) ──
  function buildMonsterCardHTML(card, idx) {
    const zoneCfg = GameConfig.zones.find(z => z.id === card.zoneId) || {};
    const zoneLabel = card.zone || zoneCfg.label || '?';
    const kills = card.killCount || 1;
    const killBadge = kills >= 50 ? '🏅' : kills >= 20 ? '⭐' : kills >= 5 ? '✔' : '';
    const bossBadge = card.isBoss ? `<div class="pc-boss-badge">👑</div>` : '';
    const newAnim = card.isNew ? ' pc-new-pulse' : '';
    if (card.isNew) card.isNew = false;

    // Zone-based card color scheme
    const zoneStyles = {
      forest:    { band:'linear-gradient(90deg,#1a3a0a,#2d5a16)', accent:'#4ade80', icon:'🌲' },
      swamp:     { band:'linear-gradient(90deg,#0a2a1a,#1a4a2a)', accent:'#22c55e', icon:'🌿' },
      catacombs: { band:'linear-gradient(90deg,#2a1a0a,#3a2a18)', accent:'#f59e0b', icon:'🕯️' },
      cemetery:  { band:'linear-gradient(90deg,#1a0a2a,#2a1a3a)', accent:'#a78bfa', icon:'⚰️' },
      desert:    { band:'linear-gradient(90deg,#3a2a00,#5a4010)', accent:'#fbbf24', icon:'🏜️' },
      lostcity:  { band:'linear-gradient(90deg,#1a2a3a,#2a3a4a)', accent:'#60a5fa', icon:'🏚️' },
      ravine:    { band:'linear-gradient(90deg,#0a0a1a,#1a1a2a)', accent:'#818cf8', icon:'🌑' },
      volcano:   { band:'linear-gradient(90deg,#3a0a00,#5a1a00)', accent:'#f97316', icon:'🌋' },
      tundra:    { band:'linear-gradient(90deg,#0a1a2a,#1a2a3a)', accent:'#7dd3fc', icon:'❄️' },
      abyss:     { band:'linear-gradient(90deg,#0a0000,#1a0000)', accent:'#f87171', icon:'💀' },
    };
    const zs = zoneStyles[card.zoneId] || { band:'linear-gradient(90deg,#1a1612,#2a2018)', accent:'#a0a0a0', icon:'❓' };

    return `<div class="pokemon-card pc-monster-zone${newAnim}" data-card-idx="${idx}" data-card-type="monster" style="border-color:${zs.accent}44;">
      ${bossBadge}
      <div class="pc-band" style="background:${zs.band};">
        <span style="color:${zs.accent};font-size:9px;">${zs.icon} ${zoneLabel}</span>
        <span class="pc-hp-line" style="color:${zs.accent};">×${kills}${killBadge}</span>
      </div>
      <div class="pc-art">
        <div class="pc-avatar">${card.av}</div>
        <div class="pc-lv">Ур. ${card.level}</div>
      </div>
      <div class="pc-hp-bar"><div class="pc-hp-fill" style="width:100%;background:${zs.accent};opacity:.6;"></div></div>
      <div class="pc-name-strip" style="background:rgba(0,0,0,.6);">
        <div class="pc-name" style="color:#fff;">${card.name}</div>
      </div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="pc-stat-lbl">ATK</div><div class="pc-stat-val">${card.atk}</div></div>
        <div class="pc-stat"><div class="pc-stat-lbl">DEF</div><div class="pc-stat-val">${card.def}</div></div>
        <div class="pc-stat"><div class="pc-stat-lbl">LV</div><div class="pc-stat-val">${card.level}</div></div>
      </div>
    </div>`;
  }

  // ── Build pet card HTML (with progression layer) ──
  function buildPetCardHTML(card, idx) {
    const rar     = card.rarity || 'common';
    const rarCfg  = MonsterRarityConfig.rarities[rar] || MonsterRarityConfig.rarities.common;
    const rarColor= rarCfg.color;
    const hpPct   = card.maxHp > 0 ? Math.round((card.hp / card.maxHp) * 100) : 100;
    const newAnim = card.isNew ? ' pc-new-pulse' : '';
    if (card.isNew) card.isNew = false;
    const hpBarColor = hpPct > 60 ? 'linear-gradient(90deg,#00640a,#4ade80)'
                     : hpPct > 30  ? 'linear-gradient(90deg,#7a5000,#f1c40f)'
                     :               'linear-gradient(90deg,#7b0000,#e74c3c)';
    // Mutation badge goes top-left, pet badge top-right — separated, no overlap
    const mutBadge = card.mutation ? `<div class="pc-mut-badge">${card.mutation.label}</div>` : '';

    // Progression overlays
    const petLv = card.petLevel || 1;
    const petXp = card.petXp   || 0;
    const isMax = petLv >= PetProgressionSystem.MAX_LEVEL;
    const xpNeeded = PetProgressionSystem.xpToNext(card);
    const xpPct = isMax ? 100 : (xpNeeded > 0 ? Math.round(petXp / xpNeeded * 100) : 0);
    const equippedId = PetProgressionSystem.getEquippedPetId();
    const isEquipped = card.id === equippedId;

    const equippedBanner = isEquipped
      ? `<div class="pc-equipped-banner">✦ ЭКИПИРОВАН</div>` : '';
    const lvBadge = `<div class="pc-pet-level-badge">🐾 Ур.${petLv}</div>`;

    // First bonus preview
    const bonusPreview = (() => {
      if (!card.bonusIds || !card.bonusIds.length) return '';
      const bId = card.bonusIds[0];
      const val = PetBonusRegistry.getValue(bId, rar, petLv);
      return PetBonusRegistry.formatValue(bId, val);
    })();

    return `<div class="pokemon-card pc-${rar}${newAnim}" data-card-idx="${idx}" data-card-type="pet">
      ${mutBadge}
      <div class="pc-pet-badge-fixed">🐾 ПЕТ</div>
      ${lvBadge}
      <div class="pc-band pc-band-${rar}">
        <span style="color:${rarColor};font-size:9px;">${rarCfg.label.toUpperCase()}</span>
        <span class="pc-hp-line" style="font-size:9px;color:#e0b0ff;">${bonusPreview}</span>
      </div>
      <div class="pc-art" style="padding-top:14px;">
        <div class="pc-avatar">${card.av}</div>
        <div class="pc-lv" style="color:#e0b0ff;">${petLv}/${PetProgressionSystem.MAX_LEVEL}</div>
      </div>
      <div class="pc-pet-xp-bar"><div class="pc-pet-xp-fill" style="width:${xpPct}%"></div></div>
      <div class="pc-name-strip">
        <div class="pc-name">${card.name}</div>
        <div class="pc-rarity-dot" style="background:${rarColor};box-shadow:0 0 6px ${rarColor};"></div>
      </div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="pc-stat-lbl">ATK</div><div class="pc-stat-val">${card.atk}</div></div>
        <div class="pc-stat"><div class="pc-stat-lbl">DEF</div><div class="pc-stat-val">${card.def}</div></div>
        <div class="pc-stat"><div class="pc-stat-lbl">LV</div><div class="pc-stat-val" style="color:#c84bff">${petLv}</div></div>
      </div>
      ${equippedBanner}
    </div>`;
  }

  // Legacy alias used by old code path
  function buildCardHTML(card, idx, isPet) {
    return isPet ? buildPetCardHTML(card, idx) : buildMonsterCardHTML(card, idx);
  }

  // ── Build detail overlay HTML ──
  function _buildDetailHTML(card, isPet) {
    const rar    = card.rarity || 'common';
    const rarCfg = MonsterRarityConfig.rarities[rar] || MonsterRarityConfig.rarities.common;
    const bandCls= `pc-band-${rar}`;
    const mutInfo= card.mutation ? `×${card.mutation.mult} (${card.mutation.label})` : 'Нет';
    const mutCls = card.mutation
      ? (card.mutation.mult >= 1.0 ? 'mut-positive' : 'mut-negative') : 'mut-neutral';

    if (!isPet) {
      return `
        <div class="cd-hero-band ${bandCls}" style="color:${rarCfg.color}">
          <span style="font-size:11px;font-weight:700;letter-spacing:1px;">${rarCfg.label.toUpperCase()}</span>
          <span style="font-size:11px;">👹 Монстр</span>
        </div>
        <div class="cd-art">
          <div class="cd-av">${card.av}</div>
          <div class="cd-name" style="color:${rarCfg.color}">${card.name}</div>
          <div class="cd-sub">Ур. ${card.level} · ${card.zone || card.rarity}</div>
        </div>
        <div class="cd-stats-grid">
          <div class="cd-stat-cell"><div class="cd-stat-lbl">HP</div><div class="cd-stat-val" style="color:#e74c3c">${card.hp}</div></div>
          <div class="cd-stat-cell"><div class="cd-stat-lbl">ATK</div><div class="cd-stat-val" style="color:var(--red-lt)">${card.atk}</div></div>
          <div class="cd-stat-cell"><div class="cd-stat-lbl">DEF</div><div class="cd-stat-val" style="color:var(--teal)">${card.def}</div></div>
        </div>
        <div class="cd-info-row">
          <span class="cd-tag ${mutCls}">🧬 ${mutInfo}</span>
          <span class="cd-tag" style="color:${rarCfg.color};border-color:${rarCfg.color}44;background:${rarCfg.color}11">${rarCfg.label}</span>
        </div>
        ${(() => {
          const monsterDef = GameConfig.monsters.find(m => m.name === card.name);
          if (!monsterDef || !monsterDef.drops || !monsterDef.drops.length) return '';
          const dropRows = monsterDef.drops.map(d => {
            const tpl = ItemFactory.templates[d.templateId];
            if (!tpl) return '';
            const pct = Math.round((d.chance || 0) * 100);
            const pctColor = pct >= 60 ? 'var(--green)' : pct >= 25 ? 'var(--gold-lt)' : 'var(--red-lt)';
            return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06);">
              <span style="font-size:18px;flex-shrink:0;">${tpl.ico || '📦'}</span>
              <span style="flex:1;font-size:11px;color:var(--text);">${tpl.name}</span>
              <span style="font-size:10px;font-weight:700;color:${pctColor};">${pct}%</span>
            </div>`;
          }).filter(Boolean).join('');
          if (!dropRows) return '';
          return `<div style="margin:8px 14px 4px;padding:10px 12px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:8px;">
            <div style="font-size:10px;color:var(--gold-lt);font-weight:700;letter-spacing:.5px;margin-bottom:6px;">🎁 ДОБЫЧА</div>
            ${dropRows}
          </div>`;
        })()}
        <button class="cd-close-btn" id="card-detail-close">✕ Закрыть</button>`;
    }

    // ── PET DETAIL ──
    const petLv = card.petLevel || 1;
    const petXp = card.petXp   || 0;
    const isMax  = petLv >= PetProgressionSystem.MAX_LEVEL;
    const xpNeeded = PetProgressionSystem.xpToNext(card);
    const xpPct  = isMax ? 100 : (xpNeeded > 0 ? Math.round(petXp / xpNeeded * 100) : 0);
    const equippedId = PetProgressionSystem.getEquippedPetId();
    const isEquipped = card.id === equippedId;

    // Ensure bonus ids
    if (!card.bonusIds || !card.bonusIds.length) {
      card.bonusIds = PetBonusRegistry.rollBonusIds(rar);
    }

    const bonusRows = (card.bonusIds || []).map(bId => {
      const val  = PetBonusRegistry.getValue(bId, rar, petLv);
      const nxt  = PetBonusRegistry.getNextValue(bId, rar, petLv);
      const catCls = PetBonusRegistry.getCatClass(bId);
      return `<div class="cd-pet-bonus-big">
        <div class="cd-pet-bonus-title">${PetBonusRegistry.formatLabel(bId)}</div>
        <div class="cd-pet-bonus-value ${catCls}">${PetBonusRegistry.formatValue(bId, val)}</div>
        ${!isMax ? `<div class="cd-pet-bonus-next">→ Ур.${petLv+1}: ${PetBonusRegistry.formatValue(bId, nxt)}</div>` : '<div class="cd-pet-bonus-next" style="color:var(--gold-lt)">✦ Максимальный уровень</div>'}
      </div>`;
    }).join('');

    const equipBtnCls = isEquipped ? 'cd-equip-pet-btn is-active' : 'cd-equip-pet-btn';
    const equipBtnTxt = isEquipped ? '✦ Экипирован (снять)' : '🐾 Экипировать питомца';

    return `
      <div class="cd-hero-band ${bandCls}" style="color:${rarCfg.color}">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;">${rarCfg.label.toUpperCase()}</span>
        <span style="font-size:11px;">🐾 Питомец</span>
      </div>
      <div class="cd-art">
        <div class="cd-av">${card.av}</div>
        <div class="cd-name" style="color:${rarCfg.color}">${card.name}</div>
        <div class="cd-sub">Ур. ${petLv}/${PetProgressionSystem.MAX_LEVEL} · ${rarCfg.label}</div>
      </div>
      <div class="cd-stats-grid">
        <div class="cd-stat-cell"><div class="cd-stat-lbl">HP</div><div class="cd-stat-val" style="color:#e74c3c">${card.hp}</div></div>
        <div class="cd-stat-cell"><div class="cd-stat-lbl">ATK</div><div class="cd-stat-val" style="color:var(--red-lt)">${card.atk}</div></div>
        <div class="cd-stat-cell"><div class="cd-stat-lbl">DEF</div><div class="cd-stat-val" style="color:var(--teal)">${card.def}</div></div>
      </div>
      <div class="cd-info-row">
        <span class="cd-tag ${mutCls}">🧬 ${mutInfo}</span>
        <span class="cd-tag" style="color:${rarCfg.color};border-color:${rarCfg.color}44;background:${rarCfg.color}11">${rarCfg.label}</span>
      </div>
      <div class="cd-pet-stats-section">${bonusRows}</div>
      <div class="cd-pet-xp-section">
        <div class="cd-pet-xp-label">
          <span>Опыт питомца</span>
          <span>${isMax ? '✦ МАКС' : `${petXp} / ${xpNeeded} XP`}</span>
        </div>
        <div class="cd-pet-xp-track"><div class="cd-pet-xp-bar ${isMax?'max-level':''}" style="width:${xpPct}%"></div></div>
      </div>
      <button class="${equipBtnCls}" id="cd-equip-pet-btn" data-pet-id="${card.id}">${equipBtnTxt}</button>
      <button class="cd-close-btn" id="cd-release-btn" style="color:var(--red-lt);border-color:rgba(192,57,43,.3);">🌿 Отпустить питомца</button>
      <button class="cd-close-btn" id="card-detail-close">✕ Закрыть</button>`;
  }

  // ── Render slaves sub-tab ──
  function _renderSlavesTab(container) {
    const owned  = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getOwnedSlave()  : null;
    const slaves = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getSlaves()      : [];
    const heroLv = (typeof State !== 'undefined' && State.hero?.level) || 1;

    let html = `<div class="inv-count-hdr">⛓️ Рабы</div>`;

    if (heroLv < 25) {
      html += `<div class="empty-st" style="padding-top:40px;">
        <div style="font-size:40px;margin-bottom:10px;">⛓️</div>
        <div style="color:var(--gold-lt);font-size:13px;margin-bottom:6px;">Подвал заперт</div>
        Откроется на 25 уровне персонажа<br>
        <span style="color:var(--muted);font-size:11px;">(ваш уровень: ${heroLv})</span>
      </div>`;
      container.innerHTML = html;
      return;
    }

    // Owned slave card
    if (owned) {
      const sc = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getSlaveRaceColor(owned.race) : '#a0a0a0';
      html += `<div style="background:rgba(80,40,10,.2);border:2px solid ${sc}66;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:10px;color:${sc};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">⛓ Ваш раб · В группе</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="font-size:44px;line-height:1;">${owned.av}</div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:var(--text);">${owned.name}</div>
            <div style="font-size:10px;color:var(--muted);">Ур. ${owned.level} · ${owned.genderLabel} · ${owned.raceLabel}</div>
            <div style="font-size:9px;color:${sc};margin-top:2px;">${owned.race}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:700;color:#4ade80;">✓ Активен</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px;">
          ${['atk','def','spd','maxHp','maxMp','crit'].map(s =>
            `<div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:4px;text-align:center;">
              <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${s==='maxHp'?'HP':s==='maxMp'?'MP':s==='crit'?'КР':s.toUpperCase()}</div>
              <div style="font-size:11px;font-weight:700;color:var(--text);">${s==='crit'?Math.round(owned[s]*100)+'%':owned[s]}</div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:6px;">
          <button id="slave-card-levelup" style="flex:1;background:linear-gradient(135deg,#003070,#2980b9);color:#fff;border:none;border-radius:7px;font-family:inherit;font-size:11px;font-weight:700;padding:9px;cursor:pointer;min-height:38px;">
            📈 Тренировать (${typeof SlaveSystem !== 'undefined' ? SlaveSystem.getLevelUpCost(owned) : 0}💰)
          </button>
          <button id="slave-card-release" style="flex:0 0 auto;background:#1a0a0a;color:#c0392b;border:1px solid #c0392b44;border-radius:7px;font-family:inherit;font-size:11px;padding:9px 12px;cursor:pointer;min-height:38px;">
            🔓 Отпустить
          </button>
        </div>
      </div>`;
    } else {
      html += `<div style="background:rgba(0,0,0,.3);border:1px solid var(--bord);border-radius:8px;padding:12px 14px;margin-bottom:10px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;opacity:.4;">⛓️</div>
        <div style="font-size:12px;color:var(--muted);">У вас пока нет раба.<br>Купите его в подвале магазина.</div>
      </div>`;
    }

    // Shop slaves available
    html += `<div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">В продаже · ${slaves.length}</div>`;
    if (slaves.length) {
      slaves.forEach(s => {
        const rc = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getSlaveRaceColor(s.race) : '#a0a0a0';
        html += `<div style="background:var(--card);border:1px solid ${rc}33;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
          <div style="font-size:36px;line-height:1;">${s.av}</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">${s.name}</div>
            <div style="font-size:10px;color:var(--muted);">${s.genderLabel} · ${s.raceLabel}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:700;color:var(--gold-lt);">${s.price}💰</div>
            <div style="font-size:9px;color:var(--muted);">Ур. 1</div>
          </div>
        </div>`;
      });
    } else {
      html += `<div style="color:var(--muted);font-size:12px;text-align:center;padding:8px;">Нет рабов в продаже</div>`;
    }

    html += `<div style="font-size:10px;color:var(--muted);text-align:center;margin-top:8px;line-height:1.5;">
      Управление рабом — в магазине (вкладка ⛓️ Подвал)
    </div>`;

    container.innerHTML = html;

    // Bind levelup/release for owned slave
    const lvBtn = container.querySelector('#slave-card-levelup');
    if (lvBtn && typeof SlaveSystem !== 'undefined') {
      lvBtn.addEventListener('click', () => {
        const r = SlaveSystem.levelUpSlave();
        UISystem.showToast(r.msg);
        _renderSlavesTab(container);
        CombatRenderer.gold();
      });
    }
    const relBtn = container.querySelector('#slave-card-release');
    if (relBtn && typeof SlaveSystem !== 'undefined') {
      relBtn.addEventListener('click', () => {
        SlaveSystem.releaseSlave();
        UISystem.showToast('🔓 Раб отпущен на свободу.');
        _renderSlavesTab(container);
      });
    }
  }

  // ── Render card collection tab ──
  function renderCardTab() {
    const container = document.getElementById('cards-scroll');
    if (!container) return;

    // Sync pet cards from PetSystem
    _petCards = PetSystem.getPets().map((p, i) => ({
      ...p, zone: 'Пойман', type: 'pet', _petIdx: i,
    }));

    // Bind sub-tabs
    const tabs = document.getElementById('cardcol-tabs');
    if (tabs && !_boundEls.has(tabs)) {
      _boundEls.add(tabs);
      tabs.querySelectorAll('[data-ctab]').forEach(btn => {
        btn.addEventListener('click', () => {
          _currentTab = btn.dataset.ctab;
          tabs.querySelectorAll('[data-ctab]').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          renderCardTab();
        });
      });
    }

    // ── Slaves tab ──
    if (_currentTab === 'slaves') {
      _renderSlavesTab(container);
      return;
    }

    let cards, isPetMode;
    if (_currentTab === 'monsters') {
      // Group by zone
      const allMonsters = [..._monsterCards].sort((a, b) => {
        const zoneOrder = ['forest','swamp','catacombs','cemetery','desert','lostcity','ravine','volcano','tundra','abyss'];
        const za = zoneOrder.indexOf(a.zoneId || 'forest');
        const zb = zoneOrder.indexOf(b.zoneId || 'forest');
        return za !== zb ? za - zb : (a.name || '').localeCompare(b.name || '');
      });

      const count = `<div class="inv-count-hdr">👹 Монстры · ${allMonsters.length} карточек</div>`;

      if (!allMonsters.length) {
        container.innerHTML = count + `<div class="empty-st" style="padding-top:40px">
          <div style="font-size:40px;margin-bottom:10px;">👹</div>
          Побеждай монстров чтобы собирать карточки!
        </div>`;
        return;
      }

      // Build grouped HTML
      const zoneOrder = ['forest','swamp','catacombs','cemetery','desert','lostcity','ravine','volcano','tundra','abyss'];
      const zoneLabels = {
        forest:'🌲 Лес', swamp:'🌿 Болото', catacombs:'🕯️ Катакомбы', cemetery:'⚰️ Кладбище',
        desert:'🏜️ Пустыня', lostcity:'🏚️ Забытый город', ravine:'🌑 Ущелье теней',
        volcano:'🌋 Вулкан', tundra:'❄️ Ледяная пустошь', abyss:'💀 Бездна',
      };
      let html = count;
      zoneOrder.forEach(zid => {
        const zoneCards = allMonsters.filter(c => (c.zoneId || 'forest') === zid);
        if (!zoneCards.length) return;
        html += `<div class="zone-cards-header">${zoneLabels[zid] || zid} <span style="color:var(--muted);font-size:10px;">(${zoneCards.length})</span></div>`;
        html += `<div class="card-grid">${zoneCards.map((c, i) => buildMonsterCardHTML(c, allMonsters.indexOf(c))).join('')}</div>`;
      });
      container.innerHTML = html;

      container.querySelectorAll('.pokemon-card').forEach(el => {
        el.addEventListener('click', () => {
          const idx  = parseInt(el.dataset.cardIdx);
          const card = allMonsters[idx];
          _showDetail(card, false, idx);
        });
      });
      return;
    } else {
      const _PET_RARITY_RANK = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5 };
      cards     = [..._petCards].sort((a, b) => {
        const rd = (_PET_RARITY_RANK[a.rarity] ?? 0) - (_PET_RARITY_RANK[b.rarity] ?? 0);
        return rd !== 0 ? rd : (a.name || '').localeCompare(b.name || '');
      });
      isPetMode = true;
    }

    const count2 = `<div class="inv-count-hdr">🐾 Питомцы · ${cards.length} карточек</div>`;

    if (!cards.length) {
      container.innerHTML = count2 + `<div class="empty-st" style="padding-top:40px">
        <div style="font-size:40px;margin-bottom:10px;">🐾</div>
        Поймай своего первого питомца в бою!
      </div>`;
      return;
    }

    container.innerHTML = count2 + `<div class="card-grid">${cards.map((c,i) => buildPetCardHTML(c, i)).join('')}</div>`;

    // Click → detail overlay
    container.querySelectorAll('.pokemon-card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.cardIdx);
        const card = cards[idx];
        _showDetail(card, true, idx);
      });
    });
  }

  function _showDetail(card, isPet, idx) {
    _detailTarget = { card, isPet, idx };
    const box = document.getElementById('card-detail-box');
    if (box) box.innerHTML = _buildDetailHTML(card, isPet);
    UISystem.removeClass('card-detail-ov', 'hide');

    document.getElementById('card-detail-close')?.addEventListener('click', () => {
      UISystem.addClass('card-detail-ov', 'hide');
      _detailTarget = null;
    });

    // Pet equip button
    const equipBtn = document.getElementById('cd-equip-pet-btn');
    if (equipBtn && isPet) {
      equipBtn.addEventListener('click', () => {
        const petId = equipBtn.dataset.petId;
        const equippedId = PetProgressionSystem.getEquippedPetId();
        if (equippedId === petId) {
          PetProgressionSystem.unequipPet();
          UISystem.showToast(`🐾 Питомец снят.`);
        } else {
          PetProgressionSystem.equipPet(petId);
          const pet = PetSystem.getPets().find(p => p.id === petId);
          UISystem.showToast(`🐾 ${pet?.name || 'Питомец'} экипирован!`);
        }
        // Re-render detail + card list
        if (box) box.innerHTML = _buildDetailHTML(card, isPet);
        renderCardTab();
        // Re-bind
        _showDetail(card, isPet, idx);
        UISystem.removeClass('card-detail-ov', 'hide');
        SaveSystem.autosave();
      });
    }

    // Pet release button (only in pet mode)
    const releaseBtn = document.getElementById('cd-release-btn');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', () => {
        if (_detailTarget?.isPet) {
          // Use card.id (pet id) to find the correct pet — not the sorted idx
          const petId = card.id;
          if (PetProgressionSystem.getEquippedPetId() === petId) PetProgressionSystem.unequipPet();
          PetSystem.releasePetById(petId);
          UISystem.addClass('card-detail-ov', 'hide');
          _detailTarget = null;
          renderCardTab();
        }
      });
    }
  }

  // ── Serialization ──
  function toSave()    { return { monsterCards: _monsterCards, petCards: _petCards }; }
  function fromSave(d) {
    if (!d) return;
    _monsterCards = d.monsterCards || [];
    _petCards     = d.petCards     || [];
  }

  // ── EventBus hooks ──
  EventBus.on('combat:victory', ({ monster }) => {
    if (monster) recordMonsterCard(monster);
  });
  EventBus.on('pet:rosterChanged', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('pet:equipped', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('pet:unequipped', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('pet:levelUp', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  // Slave events — refresh cards tab if on slaves sub-tab
  EventBus.on('slave:bought', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('slave:released', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('slave:spawned', () => {
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'cards') renderCardTab();
  });
  EventBus.on('game:newHero', () => {
    _monsterCards = [];
    _petCards     = [];
    if (typeof PetProgressionSystem !== 'undefined') PetProgressionSystem.fromSave(null);
  });

  return { renderCardTab, recordMonsterCard, toSave, fromSave };
})();
const CardsTabUI = (() => {
  let _injected = false;

  function ensureInjected() {
    if (_injected) return;
    _injected = true;

    // Create cards screen
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.id = 'cards-tab';
    screen.innerHTML = `
      <div class="top-bar">
        <div class="tbar-title">🃏 Карточки</div>
        <div class="gold-d">💰 <span id="cards-gold">0</span></div>
      </div>
      <div class="cardcol-tabs" id="cardcol-tabs">
        <button class="cardcol-tab on" data-ctab="pets"><span class="ct-ico">🐾</span>Питомцы</button>
        <button class="cardcol-tab" data-ctab="slaves"><span class="ct-ico">⛓️</span>Рабы</button>
        <button class="cardcol-tab" data-ctab="monsters"><span class="ct-ico">👹</span>Монстры</button>
      </div>
      <div class="scroll" id="cards-scroll"></div>
      <nav class="nav" id="nav-cards"></nav>`;
    document.body.appendChild(screen);
  }

  EventBus.on('game:started', ensureInjected);
  EventBus.on('game:loaded',  ensureInjected);

  return { ensureInjected };
})();
