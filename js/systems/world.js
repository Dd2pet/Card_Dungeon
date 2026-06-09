const WorldSystem = (() => {

  // ── Risk tiers per zone — pure data ──
  const _riskTiers = {
    forest:    [
      { id:'easy',   label:'Светлый лес',   emoji:'🌿', riskClass:'risk-low',   monsterMult:0.8,  goldMult:0.8,  xpMult:0.8,  unlockLv:1  },
      { id:'normal', label:'Дремучий лес',  emoji:'🌲', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:5  },
      { id:'hard',   label:'Красный лес',   emoji:'🔴', riskClass:'risk-high',  monsterMult:1.35, goldMult:1.5,  xpMult:1.4,  unlockLv:5  },
    ],
    swamp:     [
      { id:'normal', label:'Обычно',    emoji:'🟡', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:11 },
      { id:'hard',   label:'Опасно',    emoji:'🔴', riskClass:'risk-high',  monsterMult:1.35, goldMult:1.5,  xpMult:1.4,  unlockLv:14 },
      { id:'death',  label:'СМЕРТЕЛЬНО',emoji:'💀', riskClass:'risk-death', monsterMult:1.8,  goldMult:2.2,  xpMult:2.0,  unlockLv:17 },
    ],
    catacombs: [
      { id:'normal', label:'Обычно',    emoji:'🟡', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:21 },
      { id:'hard',   label:'Опасно',    emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:24 },
      { id:'death',  label:'СМЕРТЕЛЬНО',emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:27 },
    ],
    cemetery:  [
      { id:'normal', label:'Обычно',    emoji:'🟡', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:31 },
      { id:'hard',   label:'Опасно',    emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:35 },
      { id:'death',  label:'СМЕРТЕЛЬНО',emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:38 },
    ],
    desert:    [
      { id:'normal', label:'Обычно',    emoji:'🟡', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:41 },
      { id:'hard',   label:'Опасно',    emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:45 },
      { id:'death',  label:'СМЕРТЕЛЬНО',emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:48 },
    ],
    lostcity:  [
      { id:'normal', label:'Обычно',    emoji:'🟡', riskClass:'risk-med',   monsterMult:1.0,  goldMult:1.0,  xpMult:1.0,  unlockLv:51 },
      { id:'hard',   label:'Опасно',    emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:55 },
      { id:'death',  label:'СМЕРТЕЛЬНО',emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:58 },
    ],
    ravine:    [
      { id:'hard',    label:'Опасно',      emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:61 },
      { id:'death',   label:'СМЕРТЕЛЬНО',  emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:66 },
      { id:'extreme', label:'ЗАПРЕДЕЛЬНО', emoji:'☠️', riskClass:'risk-death', monsterMult:2.8,  goldMult:3.5,  xpMult:3.0,  unlockLv:69 },
    ],
    volcano:   [
      { id:'hard',    label:'Опасно',      emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:71 },
      { id:'death',   label:'СМЕРТЕЛЬНО',  emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:76 },
      { id:'extreme', label:'ЗАПРЕДЕЛЬНО', emoji:'☠️', riskClass:'risk-death', monsterMult:2.8,  goldMult:3.5,  xpMult:3.0,  unlockLv:79 },
    ],
    tundra:    [
      { id:'hard',    label:'Опасно',      emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:81 },
      { id:'death',   label:'СМЕРТЕЛЬНО',  emoji:'💀', riskClass:'risk-death', monsterMult:2.0,  goldMult:2.5,  xpMult:2.2,  unlockLv:87 },
      { id:'extreme', label:'ЗАПРЕДЕЛЬНО', emoji:'☠️', riskClass:'risk-death', monsterMult:2.8,  goldMult:3.5,  xpMult:3.0,  unlockLv:89 },
    ],
    abyss:     [
      { id:'hard',    label:'Опасно',      emoji:'🔴', riskClass:'risk-high',  monsterMult:1.4,  goldMult:1.6,  xpMult:1.5,  unlockLv:91 },
      { id:'death',   label:'СМЕРТЕЛЬНО',  emoji:'💀', riskClass:'risk-death', monsterMult:2.2,  goldMult:2.8,  xpMult:2.5,  unlockLv:96 },
      { id:'extreme', label:'ЗАПРЕДЕЛЬНО', emoji:'☠️', riskClass:'risk-death', monsterMult:3.2,  goldMult:4.0,  xpMult:3.5,  unlockLv:99 },
    ],
  };

  let _riskIdx = 0; // current risk tier index within zone

  function getRiskTiers(zoneId) {
    return _riskTiers[zoneId] || _riskTiers.forest;
  }

  function getCurrentRisk() {
    const tiers = getRiskTiers(State.zone.id);
    return tiers[Math.min(_riskIdx, tiers.length - 1)];
  }

  function setRisk(idx) {
    _riskIdx = idx;
    EventBus.emit('world:riskChanged', getCurrentRisk());
  }

  function getAvailableZones() {
    const heroLv   = State.hero?.level || 1;
    const rankIdx  = (typeof GuildSystem !== 'undefined') ? GuildSystem.getRankIdx() : 0;
    const rankKeys = ['E','D','C','B','A','S'];
    return GameConfig.zones.map(z => {
      const tiers = getRiskTiers(z.id);
      const zoneRankIdx  = rankKeys.indexOf(z.minRank || 'E');
      const levelOk      = heroLv >= z.minLv;
      const rankOk       = rankIdx >= zoneRankIdx;
      const unlocked     = levelOk && rankOk;
      const availTiers   = tiers.filter(t => heroLv >= t.unlockLv);
      return { zone: z, unlocked, tiers, availTiers, levelOk, rankOk };
    }).filter(z => z.levelOk); // show all level-reached zones; rank-lock shows in UI
  }

  function switchZone(zoneId, riskIdx = 0) {
    const z = GameConfig.zones.find(z => z.id === zoneId);
    if (!z) return;
    const rankIdx  = (typeof GuildSystem !== 'undefined') ? GuildSystem.getRankIdx() : 0;
    const rankKeys = ['E','D','C','B','A','S'];
    const zoneRankIdx = rankKeys.indexOf(z.minRank || 'E');
    if (rankIdx < zoneRankIdx) {
      UISystem.showToast(`🔒 Нужен ранг гильдии ${z.minRank}!`);
      return;
    }
    // Завершить текущий бой перед сменой локации (если активен)
    CombatSessionManager.terminateCombat('navigation');
    State.setZone(z);
    _riskIdx = riskIdx;
    UISystem.setText('g-zone', z.label);
    UISystem.showToast(`📍 ${z.label} — ${getCurrentRisk().label}`);
    EventBus.emit('world:zoneChanged', { zone: z, risk: getCurrentRisk() });
    _renderZoneStrip();
    spawnMonster();
  }

  function _renderZoneStrip() {
    const strip = UISystem.$('zone-strip');
    if (!strip) return;
    const heroLv    = State.hero?.level || 1;
    const rankIdx   = (typeof GuildSystem !== 'undefined') ? GuildSystem.getRankIdx() : 0;
    const rankKeys  = ['E','D','C','B','A','S'];
    const rankColors = { E:'#a0a0a0',D:'#6db86d',C:'#4fa3e0',B:'#b44fe0',A:'#e0a030',S:'#ff4444' };

    // Зональные иконки биома для визуального оформления
    const zoneBg = {
      forest:   'linear-gradient(135deg,#1a3a1a,#0d200d)',
      swamp:    'linear-gradient(135deg,#1a2e1a,#0a1a10)',
      catacombs:'linear-gradient(135deg,#1a1a2e,#0d0d1a)',
      cemetery: 'linear-gradient(135deg,#2a1a2a,#150d15)',
      desert:   'linear-gradient(135deg,#3a2a0a,#1a1405)',
      lostcity: 'linear-gradient(135deg,#2a2a1a,#141408)',
      ravine:   'linear-gradient(135deg,#1a0a1a,#0d0508)',
      volcano:  'linear-gradient(135deg,#3a0a0a,#1a0505)',
      tundra:   'linear-gradient(135deg,#0a1a2a,#050d15)',
      abyss:    'linear-gradient(135deg,#0a0a0a,#050505)',
    };

    let html = '';
    GameConfig.zones.forEach(z => {
      const tiers       = getRiskTiers(z.id);
      const zoneRankIdx = rankKeys.indexOf(z.minRank || 'E');
      const levelOk     = heroLv >= z.minLv;
      const rankOk      = rankIdx >= zoneRankIdx;
      const fullyLocked = !levelOk || !rankOk;
      const isActive    = State.zone.id === z.id;

      // Активный тир в текущей зоне
      const activeTierLabel = isActive ? tiers[Math.min(_riskIdx, tiers.length - 1)] : null;

      // Строка блокировки
      let lockLine = '';
      if (!levelOk) {
        lockLine = `<span style="display:block;font-size:8px;color:#e0a030;margin-top:3px;">🔒 Ур. ${z.minLv}+</span>`;
      } else if (!rankOk) {
        const rColor = rankColors[z.minRank] || '#aaa';
        lockLine = `<span style="display:block;font-size:8px;color:${rColor};margin-top:3px;">🔒 Ранг ${z.minRank}</span>`;
      }

      // Строка тира (для активной зоны)
      const tierLine = activeTierLabel
        ? `<span style="display:block;font-size:8px;margin-top:2px;opacity:.85;" class="${activeTierLabel.riskClass}">${activeTierLabel.emoji} ${activeTierLabel.label}</span>`
        : '';

      const bg      = zoneBg[z.id] || 'linear-gradient(135deg,#1a1612,#0c0a08)';
      const opacity = fullyLocked ? '.45' : '1';
      const border  = isActive
        ? '2px solid var(--gold)'
        : fullyLocked ? '1px solid #333' : '1px solid var(--bord)';
      const shadow  = isActive ? '0 0 10px rgba(201,146,42,.35)' : 'none';

      html += `<button class="zone-swipe-card ${isActive ? 'on' : ''} ${fullyLocked ? 'locked' : ''}"
        data-zone="${z.id}"
        style="
          flex-shrink:0;
          width:auto;
          min-width:fit-content;
          height:36px;
          border:${border};
          border-radius:18px;
          background:${bg};
          opacity:${opacity};
          padding:0 10px;
          cursor:${fullyLocked ? 'default' : 'pointer'};
          display:flex;flex-direction:row;align-items:center;justify-content:center;gap:4px;
          text-align:center;
          box-shadow:${shadow};
          transition:all .15s;
          pointer-events:${fullyLocked ? 'none' : 'auto'};
          position:relative;
          font-family:inherit;
          white-space:nowrap;
        ">
        <span style="font-size:13px;line-height:1;">${z.label.split(' ')[0]}</span>
        <span style="font-size:9px;color:${isActive ? 'var(--gold-lt)' : 'var(--text)'};font-weight:${isActive ? '700' : '400'};line-height:1;">
          ${z.label.replace(/^\S+\s*/, '')}${lockLine ? ' 🔒' : ''}${tierLine ? '' : ''}
        </span>
        ${tierLine ? `<span style="font-size:8px;line-height:1;">${activeTierLabel?.emoji||''}</span>` : ''}
      </button>`;
    });

    strip.innerHTML = html;

    // Touch/click — открываем picker тиров или переходим сразу
    strip.querySelectorAll('.zone-swipe-card:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = btn.dataset.zone;
        const tiers  = getRiskTiers(zoneId);
        const heroLvLocal = State.hero?.level || 1;
        const availTiers  = tiers.map((t, i) => ({ t, i })).filter(({ t }) => heroLvLocal >= t.unlockLv);

        if (availTiers.length <= 1) {
          // Только один тир — переходим сразу
          const tIdx = availTiers.length ? availTiers[0].i : 0;
          if (State.active || State.monster) CombatSessionManager.terminateCombat('navigation');
          switchZone(zoneId, tIdx);
          return;
        }

        // Несколько тиров — показываем picker прямо в полосе
        _showTierPicker(zoneId, availTiers);
      });
    });

    // Прокручиваем к активной зоне
    const activeCard = strip.querySelector('.zone-swipe-card.on');
    if (activeCard) {
      setTimeout(() => {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 80);
    }
  }

  // Оверлей выбора тира поверх zone-strip
  function _showTierPicker(zoneId, availTiers) {
    const existing = document.getElementById('zone-tier-picker');
    if (existing) existing.remove();

    const z = GameConfig.zones.find(z => z.id === zoneId);
    const strip = UISystem.$('zone-strip');
    if (!strip || !z) return;

    const picker = document.createElement('div');
    picker.id = 'zone-tier-picker';
    picker.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;
      background:rgba(10,8,6,.97);
      border-top:1px solid var(--bord);
      padding:10px 14px 16px;
      z-index:9999;
      display:flex;flex-direction:column;gap:7px;
      animation:slideUp .18s ease;
    `;

    // Добавляем анимацию если нет
    if (!document.getElementById('tier-picker-style')) {
      const st = document.createElement('style');
      st.id = 'tier-picker-style';
      st.textContent = '@keyframes slideUp{from{transform:translateY(40px);opacity:0;}to{transform:none;opacity:1;}}';
      document.head.appendChild(st);
    }

    let inner = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
      <div style="font-size:12px;color:var(--gold-lt);font-weight:700;">${z.label} — выбор сложности</div>
      <button id="zone-tier-close" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;min-height:32px;padding:0 4px;">✕</button>
    </div>`;

    availTiers.forEach(({ t, i }) => {
      inner += `<button class="zone-tier-opt" data-zone="${zoneId}" data-risk="${i}" style="
        background:rgba(0,0,0,.4);border:1px solid var(--bord);border-radius:8px;
        padding:9px 14px;color:var(--text);font-size:12px;font-family:inherit;
        cursor:pointer;text-align:left;min-height:44px;transition:background .12s;
      ">
        <span class="${t.riskClass}">${t.emoji} ${t.label}</span>
        <span style="float:right;font-size:10px;color:var(--muted);">Ур.${t.unlockLv}+ · ×${t.monsterMult} моб · ×${t.xpMult} XP</span>
      </button>`;
    });

    picker.innerHTML = inner;
    document.body.appendChild(picker);

    picker.querySelector('#zone-tier-close').addEventListener('click', () => picker.remove());

    picker.querySelectorAll('.zone-tier-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        picker.remove();
        if (State.active || State.monster) CombatSessionManager.terminateCombat('navigation');
        switchZone(btn.dataset.zone, parseInt(btn.dataset.risk));
      });
    });

    // Закрытие по тапу вне picker
    setTimeout(() => {
      document.addEventListener('click', function _close(e) {
        if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', _close); }
      });
    }, 50);
  }

  function spawnMonster() {
    // ── Guard: не создавать врага если бой уже активен ──────────
    // Предотвращает дублирование монстров при race-condition между
    // safeTimeout(spawnMonster) и ручным вызовом после смены зоны.
    if (State.active || State.monster) {
      console.warn('[WorldSystem.spawnMonster] Попытка спавна во время активного боя — пропущено.');
      return;
    }

    const zone = State.zone;
    const risk = getCurrentRisk();

    // ── Boss spawn: 2% chance per fight ──
    const bosses = (GameConfig.zoneBosses || {})[zone.id] || [];
    if (bosses.length && Math.random() < 0.02) {
      const bTmpl = bosses[Math.floor(Math.random() * bosses.length)];
      const lv = zone.minLv + Math.floor(Math.random() * (zone.maxLv - zone.minLv + 1));
      const sc = (1 + (lv - 1) * GameConfig.progression.monsterScalePerLevel) * risk.monsterMult * 2.5;
      const boss = {
        ...bTmpl,
        level: lv,
        hp:    Math.floor(bTmpl.hp  * sc),
        maxHp: Math.floor(bTmpl.hp  * sc),
        atk:   Math.floor(bTmpl.atk * sc),
        def:   Math.floor(bTmpl.def * sc),
        _goldMult: risk.goldMult * 3,
        _xpMult:   risk.xpMult  * 3,
        _isBoss:   true,
      };
      State.resetCombatState();
      State.setMonster(boss);
      State.setActive(true);
      EventBus.emit('hero:updated', State.hero);
      RenderSystem.buttons();
      UISystem.setText('g-zone', zone.label);
      UISystem.log(`👑 ВОЖАК! ${boss.name} (Ур.${lv}) [${risk.emoji}] появился!`, 'lc');
      EventBus.emit('monster:spawned', boss);
      return;
    }

    let pool = GameConfig.monsters.filter(m => m.zone === zone.id && m.risk === risk.id); if (!pool.length) pool = GameConfig.monsters.filter(m => m.zone === zone.id);

    // ── Миграция монстров (WorldEventSystem) ───────────────────
    // Если активна миграция INTO эту зону — добавляем монстров из зоны-источника
    // ОГРАНИЧЕНИЕ: миграция разрешена только внутри одного биома (WorldEventSystem._sameBiome)
    if (typeof WorldEventSystem !== 'undefined') {
      const migrations = WorldEventSystem.getMigrationForZone(zone.id);
      migrations.forEach(layer => {
        if (layer.toZone !== zone.id) return; // только входящая миграция
        // Дополнительная защита: fromZone должна быть тем же биомом
        // (getMigrationForZone уже фильтрует, но дублируем для надёжности)
        if (layer.fromZone !== zone.id && layer.fromZone !== layer.toZone) {
          // Разные зоны — убеждаемся что они в одной биомной группе
          // Поскольку getMigrationForZone это уже гарантировал, это просто sanity-guard
          return;
        }
        const keyword = layer.keyword;
        let migrants = GameConfig.monsters.filter(m => {
          if (m.zone !== layer.fromZone && m.zone !== zone.id) return false;
          if (keyword && !m.name.toLowerCase().includes(keyword.toLowerCase())) return false;
          return true;
        });
        if (migrants.length) {
          // Добавляем мигрантов с весом пропорционально power; помечаем _isMigrant
          const copies = Math.ceil(migrants.length * 0.5);
          for (let i = 0; i < copies; i++) {
            const m = { ...migrants[Math.floor(Math.random() * migrants.length)], _isMigrant: true };
            pool.push(m);
          }
        }
      });
    }

    if (!pool.length) {
      UISystem.log(`⚠️ Нет монстров в зоне ${zone.id}!`, 'li');
      return;
    }
    const tmpl = pool[Math.floor(Math.random() * pool.length)];
    const lv = zone.minLv + Math.floor(Math.random() * (zone.maxLv - zone.minLv + 1));
    const sc = (1 + (lv - 1) * GameConfig.progression.monsterScalePerLevel) * risk.monsterMult;

    const monster = {
      ...tmpl,
      level: lv,
      hp:    Math.floor(tmpl.hp  * sc),
      maxHp: Math.floor(tmpl.hp  * sc),
      atk:   Math.floor(tmpl.atk * sc),
      def:   Math.floor(tmpl.def * sc),
      _goldMult: risk.goldMult,
      _xpMult:   risk.xpMult,
    };

    // ── Применить power-буст если монстр — мигрант ───────────
    if (typeof WorldEventSystem !== 'undefined' && monster._isMigrant) {
      const migrations = WorldEventSystem.getMigrationForZone(zone.id);
      const layer = migrations.find(l => l.toZone === zone.id);
      if (layer && layer.power > 1.0) {
        monster.hp    = Math.floor(monster.hp    * layer.power);
        monster.maxHp = monster.hp;
        monster.atk   = Math.floor(monster.atk   * layer.power);
        monster.def   = Math.floor(monster.def   * layer.power);
        monster._xpMult    = (monster._xpMult    || 1) * 1.15;
        monster._goldMult  = (monster._goldMult  || 1) * 1.10;
      }
    }

    State.resetCombatState();
    State.setMonster(monster);
    State.setActive(true);
    EventBus.emit('hero:updated', State.hero);
    RenderSystem.buttons();
    UISystem.setText('g-zone', zone.label);
    const migrantTag = monster._isMigrant ? ' [миграция]' : '';
    UISystem.log(`⚔ ${monster.name} (Ур.${lv}) [${risk.emoji}]${migrantTag} появился!`, 'lm');
    EventBus.emit('monster:spawned', monster);
  }

  // ── init zone strip on game start ──
  EventBus.on('game:started',     () => { _riskIdx = 0; _renderZoneStrip(); });
  EventBus.on('game:loaded',      () => { _riskIdx = 0; _renderZoneStrip(); });
  EventBus.on('guild:zoneUnlock', () => _renderZoneStrip());

  return { spawnMonster, switchZone, getCurrentRisk, getRiskTiers, getAvailableZones, get riskIdx() { return _riskIdx; } };
})();
const LocationDatabase = (() => {
  // Распределение редкостей по 10 основным локациям (задание: 2 обычных, 2 необычных, 2 редких, 4 эпических)
  const _locationRarity = {
    forest:    'common',
    swamp:     'uncommon',
    catacombs: 'uncommon',
    cemetery:  'uncommon',
    desert:    'rare',
    lostcity:  'rare',
    ravine:    'epic',
    volcano:   'epic',
    tundra:    'epic',
    abyss:     'epic',
  };

  // 30 игровых карт: каждая зона имеет 3 варианта (risk tiers)
  // Вариант определяется risk: easy/normal/hard/death/extreme
  // Все варианты одной зоны имеют ту же редкость монстров
  const _locationCards = [];
  const _riskToVariant = { easy: 'I', normal: 'II', hard: 'III', death: 'IV', extreme: 'V' };

  function buildLocationCards() {
    _locationCards.length = 0;
    const zoneRisks = {
      forest:    ['easy', 'normal', 'hard'],
      swamp:     ['normal', 'hard', 'death'],
      catacombs: ['normal', 'hard', 'death'],
      cemetery:  ['normal', 'hard', 'death'],
      desert:    ['normal', 'hard', 'death'],
      lostcity:  ['normal', 'hard', 'death'],
      ravine:    ['hard', 'death', 'extreme'],
      volcano:   ['hard', 'death', 'extreme'],
      tundra:    ['hard', 'death', 'extreme'],
      abyss:     ['hard', 'death', 'extreme'],
    };
    Object.entries(zoneRisks).forEach(([zoneId, risks]) => {
      const locRarity = _locationRarity[zoneId] || 'common';
      const bossRarity = RaritySystem.oneLevelAbove(locRarity);
      risks.forEach((risk, idx) => {
        _locationCards.push({
          id:          `${zoneId}_${risk}`,
          zoneId,
          variant:     idx + 1,
          variantLabel: _riskToVariant[risk] || 'I',
          risk,
          monsterRarity: locRarity,
          bossRarity,
        });
      });
    });
    return _locationCards;
  }

  // Инициализация
  buildLocationCards();

  function getLocationRarity(zoneId) { return _locationRarity[zoneId] || 'common'; }
  function getBossRarity(zoneId)     { return RaritySystem.oneLevelAbove(getLocationRarity(zoneId)); }
  function getCards()                { return [..._locationCards]; }
  function getCard(zoneId, risk)     { return _locationCards.find(c => c.zoneId === zoneId && c.risk === risk) || null; }
  function getAllRarities()           { return { ..._locationRarity }; }

  return { getLocationRarity, getBossRarity, getCards, getCard, getAllRarities, buildLocationCards };
})();
const SpawnManager = (() => {
  // Получить пул монстров для текущей зоны и риска, отфильтрованный по редкости
  function getMonsterPool(zoneId, riskId) {
    const requiredRarity = LocationDatabase.getLocationRarity(zoneId);
    const allMonsters = GameConfig.monsters;

    // Сначала пробуем точное совпадение зоны, риска и редкости
    let pool = allMonsters.filter(m => {
      const mRarity = MonsterDatabase.getRarity(m.name) || 'common';
      return m.zone === zoneId && m.risk === riskId && mRarity === requiredRarity;
    });

    // Если нет — берём по зоне и редкости (любой риск)
    if (!pool.length) {
      pool = allMonsters.filter(m => {
        const mRarity = MonsterDatabase.getRarity(m.name) || 'common';
        return m.zone === zoneId && mRarity === requiredRarity;
      });
    }

    // Крайний случай — любые монстры зоны
    if (!pool.length) {
      pool = allMonsters.filter(m => m.zone === zoneId);
    }

    return pool;
  }

  function pickMonster(zoneId, riskId) {
    const pool = getMonsterPool(zoneId, riskId);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return { getMonsterPool, pickMonster };
})();
const BossManager = (() => {
  function getBossPool(zoneId) {
    return (GameConfig.zoneBosses || {})[zoneId] || [];
  }

  function pickBoss(zoneId) {
    const pool = getBossPool(zoneId);
    if (!pool.length) return null;
    return { ...pool[Math.floor(Math.random() * pool.length)] };
  }

  function getBossRarity(zoneId) {
    return LocationDatabase.getBossRarity(zoneId);
  }

  // Применяет правильную редкость к боссу (всегда на 1 ступень выше зоны)
  function applyBossRarity(boss, zoneId) {
    const bossRarity = getBossRarity(zoneId);
    const rarCfg = MonsterRarityConfig.rarities[bossRarity] || MonsterRarityConfig.rarities.legendary;
    boss.rarity      = bossRarity;
    boss.rarityLabel = rarCfg.label;
    boss.rarityColor = rarCfg.color;
    boss._rarityApplied = true;
    return boss;
  }

  return { getBossPool, pickBoss, getBossRarity, applyBossRarity };
})();
const RaritySpawnValidator = (() => {
  let _valid = null; // null = not yet validated
  const _errors = [];

  function validate() {
    _errors.length = 0;
    const allMonsters = GameConfig.monsters;
    const monsterRarityCache = {};

    // 1. Проверка: нет монстров с несколькими редкостями
    allMonsters.forEach(m => {
      const dbRarity = MonsterDatabase.getRarity(m.name);
      if (!dbRarity) {
        // Монстр не в базе — добавляем его автоматически по зоне
        const zoneRarity = LocationDatabase.getLocationRarity(m.zone);
        MonsterDatabase.setRarity(m.name, zoneRarity);
        return;
      }
      if (monsterRarityCache[m.name] && monsterRarityCache[m.name] !== dbRarity) {
        _errors.push(`❌ [RarityValidator] Монстр "${m.name}" имеет несколько редкостей: ${monsterRarityCache[m.name]} и ${dbRarity}`);
      }
      monsterRarityCache[m.name] = dbRarity;
    });

    // 2. Проверка: монстр не в зоне с несоответствующей редкостью
    allMonsters.forEach(m => {
      const mRarity = MonsterDatabase.getRarity(m.name);
      const zoneRarity = LocationDatabase.getLocationRarity(m.zone);
      if (mRarity && mRarity !== zoneRarity) {
        // Предупреждение (не блокировка) — монстр будет отфильтрован SpawnManager
        console.warn(`[RarityValidator] Монстр "${m.name}" (${mRarity}) находится в зоне ${m.zone} (${zoneRarity}). SpawnManager отфильтрует.`);
      }
    });

    // 3. Проверка: нет легендарных обычных монстров
    allMonsters.forEach(m => {
      const mRarity = MonsterDatabase.getRarity(m.name);
      if (mRarity === 'legendary') {
        _errors.push(`❌ [RarityValidator] Обычный монстр "${m.name}" имеет легендарную редкость! Легендарными могут быть только боссы.`);
      }
    });

    // 4. Проверка: боссы всегда на одну ступень выше зоны
    const zoneBosses = GameConfig.zoneBosses || {};
    Object.entries(zoneBosses).forEach(([zoneId, bosses]) => {
      const zoneRarity = LocationDatabase.getLocationRarity(zoneId);
      const expectedBossRarity = RaritySystem.oneLevelAbove(zoneRarity);
      bosses.forEach(boss => {
        const bossRarity = BossManager.getBossRarity(zoneId);
        if (bossRarity !== expectedBossRarity) {
          _errors.push(`❌ [RarityValidator] Босс "${boss.name}" в зоне ${zoneId}: ожидается ${expectedBossRarity}, получена ${bossRarity}`);
        }
      });
    });

    // 5. Проверка целостности 30 локаций
    const cards = LocationDatabase.getCards();
    if (cards.length !== 30) {
      _errors.push(`❌ [RarityValidator] Ожидается 30 игровых карт локаций, обнаружено: ${cards.length}`);
    }

    cards.forEach(card => {
      if (!RaritySystem.isValid(card.monsterRarity)) {
        _errors.push(`❌ [RarityValidator] Карта "${card.id}": недопустимая редкость монстров "${card.monsterRarity}"`);
      }
      if (!RaritySystem.isValid(card.bossRarity)) {
        _errors.push(`❌ [RarityValidator] Карта "${card.id}": недопустимая редкость босса "${card.bossRarity}"`);
      }
      const locRarIdx = RaritySystem.indexOf(card.monsterRarity);
      const bossRarIdx = RaritySystem.indexOf(card.bossRarity);
      if (bossRarIdx !== locRarIdx + 1) {
        _errors.push(`❌ [RarityValidator] Карта "${card.id}": редкость босса (${card.bossRarity}) должна быть ровно на 1 ступень выше редкости зоны (${card.monsterRarity})`);
      }
    });

    _valid = _errors.length === 0;

    if (!_valid) {
      console.error('[RaritySpawnValidator] ОБНАРУЖЕНЫ ОШИБКИ СИСТЕМЫ РЕДКОСТЕЙ:');
      _errors.forEach(e => console.error(e));
      console.error('[RaritySpawnValidator] Спавн монстров заблокирован до устранения ошибок!');
    }

    return _valid;
  }

  function isValid()  { return _valid === true; }
  function getErrors(){ return [..._errors]; }

  return { validate, isValid, getErrors };
})();
