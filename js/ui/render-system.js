const RenderSystem = (() => {
  return {
    gold:             (...a) => CombatRenderer.gold(...a),
    hero:             (...a) => CombatRenderer.hero(...a),
    monster:          (...a) => CombatRenderer.monster(...a),
    statuses:         (...a) => CombatRenderer.statuses(...a),
    counterIndicator: (...a) => CombatRenderer.counterIndicator(...a),
    buttons:          (...a) => CombatRenderer.buttons(...a),
    heroTab:          (...a) => HeroTabRenderer.heroTab(...a),
    invTab:           (...a) => InventoryRenderer.invTab(...a),
    statsTab:         (...a) => StatsRenderer.statsTab(...a),
    shopTab:          (...a) => ShopRenderer.shopTab(...a),
  };
})();
const CombatRenderer = (() => {
  function gold() {
    ['g-gold', 'ht-gold', 'it-gold', 'sh-gold', 'stt-gold'].forEach(id => UISystem.setText(id, State.gold));
  }

  function hero() {
    const h = State.hero; if (!h) return;
    UISystem.setText('p-av',       State.heroClass?.ico || '🧙');
    UISystem.setText('p-name',     h.name);
    UISystem.setText('p-lvl',      `Ур. ${h.level} · `);
    UISystem.setText('p-xp-short', `${h.xp}/${h.xpNeeded} XP`);
    UISystem.setText('p-hpt',      `${h.hp}/${h.maxHp}`);
    UISystem.setText('p-mpt',      `${h.mp}/${h.maxMp}`);
    UISystem.setText('p-xpt',      `${h.xp}/${h.xpNeeded}`);
    UISystem.setText('p-atk',      State.totalAtk);
    UISystem.setText('p-def',      State.totalDef);
    UISystem.setText('p-crit',     `${Math.round(State.totalCrit * 100)}%`);
    UISystem.bar('p-hpb', UISystem.pct(h.hp, h.maxHp));
    UISystem.bar('p-mpb', UISystem.pct(h.mp, h.maxMp));
    UISystem.bar('p-xpb', UISystem.pct(h.xp, h.xpNeeded));
    gold();
  }

  function monster() {
    const m = State.monster; if (!m) return;
    UISystem.setText('m-av',   m.av);
    UISystem.setText('m-name', m.name);
    UISystem.setText('m-lvl',  `Ур. ${m.level}`);
    UISystem.setText('m-hpt',  `${Math.max(0, m.hp)}/${m.maxHp}`);
    UISystem.setText('m-atk',  m.atk);
    UISystem.setText('m-def',  m.def);
    UISystem.setText('m-spd',  m.spd);
    UISystem.bar('m-hpb', UISystem.pct(m.hp, m.maxHp));
  }

  function statuses() {
    const cs = State.combatState;
    const statusCfg = GameConfig.statuses;
    function renderStatusEl(target, statusMap) {
      const el = UISystem.$(target === 'player' ? 'p-statuses' : 'm-statuses');
      if (!el) return;
      const entries = Object.entries(statusMap);
      let html = entries.map(([id, data]) => {
        const cfg = statusCfg[id] || {};
        return `<span class="status-badge st-${id}">${cfg.icon || '?'} ${cfg.label || id} (${data.duration})</span>`;
      }).join('');
      // XP-буст индикатор
      if (target === 'player' && State.xpBoostActive) {
        const secs = State.xpBoostSecsLeft;
        const mm   = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss   = String(secs % 60).padStart(2, '0');
        html += `<span class="status-badge" style="color:#facc15;border-color:rgba(250,204,21,.4);background:rgba(250,204,21,.08);">📖 ×XP ${mm}:${ss}</span>`;
      }
      el.innerHTML = html;
    }
    renderStatusEl('player', cs.playerStatuses);
    renderStatusEl('monster', cs.monsterStatuses);
  }

  function counterIndicator() {
    const card = UISystem.$('card-p');
    const badge = card?.querySelector('.c-badge.bp');
    if (!card || !badge) return;
    const ready = State.combatState.counterReady;
    card.classList.toggle('counter-ready', ready);
    badge.textContent = ready ? '⚡контр' : 'герой';
  }

  function buttons() {
    const h = State.hero, a = State.active;
    const skl = State.heroClass;
    const cs = State.combatState;
    const bAtk = UISystem.$('b-atk');
    const bCtr = UISystem.$('b-ctr');
    const bSkl = UISystem.$('b-skl');
    const bItm = UISystem.$('b-itm');
    const bFle = UISystem.$('b-fle');
    const isStunned = !!cs.playerStatuses?.stun;
    if (bAtk) bAtk.disabled = !a || isStunned;
    if (bCtr) bCtr.disabled = !a || isStunned;
    if (bSkl) bSkl.disabled = !a || isStunned || !h || h.mp < (skl?.skillMp || 999);
    if (bItm) bItm.disabled = !a;
    if (bFle) bFle.disabled = !a;
    if (skl && UISystem.$('b-skl-lbl')) UISystem.$('b-skl-lbl').textContent = skl.skillName;
  }

  // Подписки
  EventBus.on('hero:updated',          () => hero());
  EventBus.on('monster:updated',       () => monster());
  EventBus.on('combat:statusApplied',  () => { statuses(); buttons(); });
  EventBus.on('combat:statusRemoved',  () => { statuses(); buttons(); });
  EventBus.on('combat:stateReset',     () => { statuses(); counterIndicator(); });
  EventBus.on('combat:counterChanged', () => counterIndicator());

  return { gold, hero, monster, statuses, counterIndicator, buttons };
})();
const HeroTabRenderer = (() => {
  function _buildPetSlotHTML() {
    const pet = PetProgressionSystem.getEquippedPet();
    if (!pet) {
      return `<div class="pet-equip-slot" id="pet-hero-slot">
        <div class="pes-header">
          <div class="pes-avatar" style="opacity:.3;font-size:28px;">🐾</div>
          <div class="pes-meta">
            <div class="pes-empty-label">Питомец не выбран</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px;">Карты → Питомцы → Выбрать</div>
          </div>
        </div>
        <button class="pes-btn-choose" data-action="go-pets">🐾 Выбрать питомца</button>
      </div>`;
    }

    // Ensure progression fields exist
    if (pet.petLevel === undefined) pet.petLevel = 1;
    if (pet.petXp    === undefined) pet.petXp    = 0;
    if (!pet.bonusIds) pet.bonusIds = PetBonusRegistry.rollBonusIds(pet.rarity || 'common');

    const rarCfg  = MonsterRarityConfig.rarities[pet.rarity] || MonsterRarityConfig.rarities.common;
    const isMaxLv = pet.petLevel >= PetProgressionSystem.MAX_LEVEL;
    const xpNeeded= PetProgressionSystem.xpToNext(pet);
    const xpPct   = isMaxLv ? 100 : Math.round(pet.petXp / xpNeeded * 100);
    const rarClass = `pet-${pet.rarity || 'common'}`;

    // Build bonus display (up to 3 bonuses)
    const bonusRows = (pet.bonusIds || []).map(bId => {
      const val  = PetBonusRegistry.getValue(bId, pet.rarity, pet.petLevel);
      const nxt  = PetBonusRegistry.getNextValue(bId, pet.rarity, pet.petLevel);
      const catCls = PetBonusRegistry.getCatClass(bId);
      return `<div class="pes-bonus-row">
        <div class="pes-bonus-label">${PetBonusRegistry.formatLabel(bId)}</div>
        <div class="pes-bonus-val ${catCls}">${PetBonusRegistry.formatValue(bId, val)}</div>
        ${!isMaxLv ? `<div class="pes-bonus-next">→ Ур.${pet.petLevel+1}: ${PetBonusRegistry.formatValue(bId, nxt)}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="pet-equip-slot has-pet ${rarClass}" id="pet-hero-slot">
      <div class="pes-header">
        <div class="pes-avatar">${pet.av}</div>
        <div class="pes-meta">
          <div class="pes-name">${pet.name}</div>
          <div class="pes-rarity" style="color:${rarCfg.color}">${rarCfg.label}</div>
          <div class="pes-level">Ур. ${pet.petLevel}/${PetProgressionSystem.MAX_LEVEL}</div>
        </div>
      </div>
      ${bonusRows}
      <div class="pes-xp-wrap">
        <div class="pes-xp-label">
          <span>Опыт питомца</span>
          <span>${isMaxLv ? 'МАКС УРОВЕНЬ' : `${pet.petXp}/${xpNeeded} XP`}</span>
        </div>
        <div class="pes-xp-track"><div class="pes-xp-fill ${isMaxLv ? 'max-level' : ''}" style="width:${xpPct}%"></div></div>
      </div>
      <div class="pes-actions">
        <button class="pes-btn-unequip" data-action="unequip-pet">Снять питомца</button>
        <button class="pes-btn-choose" data-action="go-pets">🐾 Сменить</button>
      </div>
    </div>`;
  }

  // ── Build slave slot HTML (shown below pet slot in hero tab) ──
  function _buildSlaveSlotHTML() {
    const slave = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getOwnedSlave() : null;
    if (!slave) {
      return `<div class="pet-equip-slot" id="slave-hero-slot">
        <div class="pes-header">
          <div class="pes-avatar" style="opacity:.3;font-size:28px;">⛓️</div>
          <div class="pes-meta">
            <div class="pes-empty-label">Раб не приобретён</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px;">Магазин → Подвал → Купить</div>
          </div>
        </div>
        <button class="pes-btn-choose" data-action="go-shop-basement">⛓️ В подвал магазина</button>
      </div>`;
    }

    const sc = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getSlaveRaceColor(slave.race) : '#a0a0a0';
    const lvCost = typeof SlaveSystem !== 'undefined' ? SlaveSystem.getLevelUpCost(slave) : 0;

    return `<div class="pet-equip-slot has-pet" id="slave-hero-slot"
        style="border-color:${sc}88;box-shadow:0 0 14px ${sc}22;">
      <div class="pes-header">
        <div class="pes-avatar" style="font-size:34px;">${slave.av}</div>
        <div class="pes-meta">
          <div class="pes-name">${slave.name}</div>
          <div class="pes-rarity" style="color:${sc};">${slave.raceLabel}</div>
          <div class="pes-level">Ур. ${slave.level} · ${slave.genderLabel}</div>
        </div>
        <div style="text-align:right;margin-left:auto;flex-shrink:0;">
          <div style="font-size:9px;color:var(--muted);">В группе</div>
          <div style="font-size:11px;font-weight:700;color:#4ade80;">✓ Активен</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:8px 0;">
        ${['atk','def','spd','maxHp','maxMp','crit'].map(s =>
          `<div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:4px;text-align:center;">
            <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${s==='maxHp'?'HP':s==='maxMp'?'MP':s==='crit'?'КР':s.toUpperCase()}</div>
            <div style="font-size:11px;font-weight:700;color:var(--text);">${s==='crit'?Math.round(slave[s]*100)+'%':slave[s]}</div>
          </div>`).join('')}
      </div>
      <div class="pes-actions">
        <button class="pes-btn-choose" data-action="slave-levelup">📈 Тренировать (${lvCost}💰)</button>
        <button class="pes-btn-choose" data-action="go-shop-basement" style="background:rgba(201,146,42,.1);">⛓️ Управление</button>
      </div>
    </div>`;
  }

  function heroTab() {
    const el = UISystem.$('hero-scroll'), h = State.hero; if (!el || !h) return;
    el.innerHTML = `
      <div class="card card-p" style="margin-bottom:12px;">
        <div class="c-head">
          <div class="c-av">${State.heroClass?.ico || '🧙'}</div>
          <div style="flex:1">
            <div class="c-name">${h.name}</div>
            <div class="c-lvl">${State.heroClass?.name || ''} · Ур. ${h.level}</div>
          </div>
        </div>
        <div class="bar-row"><div class="bar-lbl"><span>HP</span><span>${h.hp}/${h.maxHp}</span></div><div class="bar-track"><div class="bar-fill hp-bar" style="width:${UISystem.pct(h.hp, h.maxHp)}%"></div></div></div>
        <div class="bar-row"><div class="bar-lbl"><span>MP</span><span>${h.mp}/${h.maxMp}</span></div><div class="bar-track"><div class="bar-fill mp-bar" style="width:${UISystem.pct(h.mp, h.maxMp)}%"></div></div></div>
        <div class="bar-row"><div class="bar-lbl"><span>XP</span><span>${h.xp}/${h.xpNeeded}</span></div><div class="bar-track"><div class="bar-fill xp-bar" style="width:${UISystem.pct(h.xp, h.xpNeeded)}%"></div></div></div>
        <div class="stats-row">
          <div class="stat"><div class="sl">ATK</div><div class="sv">${State.totalAtk}</div></div>
          <div class="stat"><div class="sl">DEF</div><div class="sv">${State.totalDef}</div></div>
          <div class="stat"><div class="sl">SPD</div><div class="sv">${h.spd}</div></div>
          <div class="stat"><div class="sl">КРИТ</div><div class="sv">${Math.round(State.totalCrit * 100)}%</div></div>
          <div class="stat"><div class="sl">MAX HP</div><div class="sv">${State.totalMaxHp}</div></div>
          <div class="stat"><div class="sl">MAX MP</div><div class="sv">${State.totalMaxMp}</div></div>
        </div>
      </div>
      <div class="sec-title">Снаряжение</div>
      ${['weapon', 'armor', 'ring', 'amulet', 'bracelet'].map(slot => {
        const item = State.equipment[slot];
        const labels = { weapon:'⚔️ Оружие', armor:'🛡️ Броня', ring:'💍 Кольцо', amulet:'📿 Амулет', bracelet:'🔗 Браслет' };
        if (!item) return `<div class="eq-slot"><div class="eq-ico" style="opacity:.25">${labels[slot].split(' ')[0]}</div><div class="eq-info"><div class="eq-name eq-empty">${labels[slot].split(' ')[1]}</div></div></div>`;
        const rarColor = item.rarity ? (GameConfig.rarities[item.rarity]?.color || '') : '';
        const cursedStyle = item.cursed ? 'border-color:rgba(140,0,180,.6);box-shadow:0 0 10px rgba(140,0,180,.25);' : '';
        const nameStyle = rarColor ? `color:${rarColor}` : '';
        const cursedNote = item.cursed ? `<div style="font-size:10px;color:#d080ff;margin-top:2px;">💀 ПРОКЛЯТ · ${item.cursedEffect||''}</div>` : '';
        return `<div class="eq-slot" style="${cursedStyle}">
          <div class="eq-ico">${item.ico}</div>
          <div class="eq-info">
            <div class="eq-name" style="${nameStyle}">${item.name}</div>
            <div class="eq-stat">${item.desc}</div>
            ${cursedNote}
          </div>
          <button class="icard-btn" data-action="unequip" data-slot="${slot}">Снять</button>
        </div>`;
      }).join('')}
      <div class="sec-title" style="margin-top:14px;">🐾 Питомец</div>
      ${_buildPetSlotHTML()}
      <div class="sec-title" style="margin-top:14px;">⛓️ Раб</div>
      ${_buildSlaveSlotHTML()}`;
    el.querySelectorAll('[data-action="unequip"]').forEach(btn => {
      btn.addEventListener('click', () => InventorySystem.unequip(btn.dataset.slot));
    });
    // Pet slot actions
    el.querySelectorAll('[data-action="unequip-pet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        PetProgressionSystem.unequipPet();
        UISystem.showToast('🐾 Питомец снят.');
        heroTab();
      });
    });
    el.querySelectorAll('[data-action="go-pets"]').forEach(btn => {
      btn.addEventListener('click', () => {
        NavSystem.switchTab('cards');
        // Switch to pets sub-tab
        setTimeout(() => {
          const petTabBtn = document.querySelector('.cardcol-tab[data-ctab="pets"]');
          if (petTabBtn) petTabBtn.click();
        }, 80);
      });
    });
    // Slave slot: go to shop basement
    el.querySelectorAll('[data-action="go-shop-basement"]').forEach(btn => {
      btn.addEventListener('click', () => {
        NavSystem.switchTab('shop');
        setTimeout(() => {
          const basementBtn = document.querySelector('[data-shcat="basement"]');
          if (basementBtn) basementBtn.click();
        }, 80);
      });
    });
    // Slave levelup from hero tab
    el.querySelectorAll('[data-action="slave-levelup"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = SlaveSystem.levelUpSlave();
        UISystem.showToast(r.msg);
        heroTab();
        CombatRenderer.gold();
      });
    });
    CombatRenderer.gold();
  }

  // Подписки
  // Если активна вкладка заточки — не пересоздаём весь heroTab (это уничтожает enchant-section-container).
  // EnchantRenderer сам обновляется через свои собственные EventBus-listeners.
  function _shouldSkipHeroTabRerender() {
    return document.getElementById('enchant-section-container') !== null;
  }

  EventBus.on('hero:updated',      () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero' && !_shouldSkipHeroTabRerender()) heroTab(); });
  EventBus.on('equipment:changed', () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero' && !_shouldSkipHeroTabRerender()) heroTab(); });
  EventBus.on('pet:equipped',      () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') heroTab(); });
  EventBus.on('pet:unequipped',    () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') heroTab(); });
  EventBus.on('pet:levelUp',       () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') heroTab(); });
  EventBus.on('slave:bought',      () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') heroTab(); });
  EventBus.on('slave:released',    () => { if (typeof NavSystem !== 'undefined' && NavSystem.current === 'hero') heroTab(); });

  return { heroTab };
})();
