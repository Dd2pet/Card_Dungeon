const GuildSystem = (() => {
  let _guildXp  = 0;
  let _rankIdx  = 0;  // 0=E … 5=S

  function _recalcRank() {
    const ranks = QuestConfig.ranks;
    // Find highest rank we've reached
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (_guildXp >= ranks[i].xpNeeded) {
        _rankIdx = i; return;
      }
    }
    _rankIdx = 0;
  }

  function addGuildXp(amount) {
    const prevRank = _rankIdx;
    _guildXp += amount;
    // Ранг НЕ повышается автоматически — только через GuildRankUpSystem.executeRankUp()
    // _recalcRank() намеренно не вызываем при обычном накоплении XP
    EventBus.emit('guild:xpGained', { amount, totalXp: _guildXp, rankIdx: _rankIdx });
    // Notify если XP пересёк порог — показать подсказку (но не повышать ранг)
    const next = QuestConfig.ranks[_rankIdx + 1];
    if (next && _guildXp >= next.xpNeeded && prevRank === _rankIdx) {
      UISystem.showToast(`✨ Достаточно GXP для ранга ${next.key}! Сдай трофеи вожака в Гильдии.`);
    }
    EventBus.emit('guild:updated');
  }

  // Внутренний метод: принудительно установить ранг (используется GuildRankUpSystem)
  function _forceSetRank(idx) {
    _rankIdx = idx;
    const rank = QuestConfig.ranks[_rankIdx];
    EventBus.emit('guild:rankUp', { rankIdx: _rankIdx, rank });
    EventBus.emit('guild:zoneUnlock');
    EventBus.emit('guild:updated');
  }

  function getRankIdx() { return _rankIdx; }
  function getRank()    { return QuestConfig.ranks[_rankIdx]; }
  function getGuildXp() { return _guildXp; }

  function getXpToNext() {
    const next = QuestConfig.ranks[_rankIdx + 1];
    return next ? next.xpNeeded : null;
  }

  function toSave() { return { guildXp: _guildXp, rankIdx: _rankIdx }; }
  function fromSave(d) {
    if (!d) return;
    _guildXp  = d.guildXp  || 0;
    _rankIdx  = d.rankIdx  || 0;
    _recalcRank();
  }

  return { addGuildXp, getRankIdx, getRank, getGuildXp, getXpToNext, toSave, fromSave, _forceSetRank };
})();
const GuildRankUpSystem = (() => {

  // Требования для получения каждого ранга (rankKey = целевой ранг после повышения)
  // parts: [{templateId, count, label, ico}]
  const RANK_REQUIREMENTS = Object.freeze({
    'D': {
      bossHint: '⚔️ Вожак волчьей стаи или Паучья матка (лес)',
      parts: [
        { templateId: 'wolf_fang',   count: 3, label: 'Клыки волка',    ico: '🦷' },
        { templateId: 'spider_silk', count: 2, label: 'Паучий шёлк',    ico: '🕸️' },
      ],
    },
    'C': {
      bossHint: '⚔️ Вожак гоблинов или Кабан-вожак (лес/болото)',
      parts: [
        { templateId: 'goblin_ear',  count: 5, label: 'Уши гоблинов',   ico: '👂' },
        { templateId: 'boar_tusk',   count: 3, label: 'Бивни кабана',   ico: '🗡️' },
        { templateId: 'troll_hide',  count: 2, label: 'Шкура тролля',   ico: '🟤' },
      ],
    },
    'B': {
      bossHint: '⚔️ Костяной король или Орк-вождь (катакомбы)',
      parts: [
        { templateId: 'bone_shard',  count: 8, label: 'Осколки кости',  ico: '🦴' },
        { templateId: 'orc_blood',   count: 4, label: 'Кровь орка',     ico: '🟥' },
        { templateId: 'necrotic_dust', count: 2, label: 'Некр. пыль',   ico: '💀' },
      ],
    },
    'A': {
      bossHint: '⚔️ Король мертвецов или Архивампир (кладбище)',
      parts: [
        { templateId: 'vampire_fang',  count: 5, label: 'Клыки вампира',  ico: '🦷' },
        { templateId: 'zombie_flesh',  count: 4, label: 'Плоть зомби',    ico: '🧟' },
        { templateId: 'ectoplasm',     count: 6, label: 'Эктоплазма',     ico: '👻' },
        { templateId: 'magic_dust',    count: 3, label: 'Магическая пыль',ico: '✨' },
      ],
    },
    'S': {
      bossHint: '⚔️ Огненный дракон / Теневой властелин / ДРЕВНИЙ БОГ (вулкан/пропасть/бездна)',
      parts: [
        { templateId: 'dragon_scale',    count: 5,  label: 'Чешуя дракона',    ico: '🐉' },
        { templateId: 'phoenix_ash',     count: 3,  label: 'Пепел феникса',     ico: '🔥' },
        { templateId: 'shadow_essence',  count: 4,  label: 'Эссенция тени',     ico: '🌑' },
        { templateId: 'soul_crystal',    count: 2,  label: 'Кристалл души',     ico: '💀' },
        { templateId: 'destruction_core',count: 1,  label: 'Ядро разрушения',   ico: '💥' },
      ],
    },
  });

  // Получить требования для следующего ранга (если есть)
  function getNextRankRequirement() {
    const curIdx = GuildSystem.getRankIdx();
    const ranks  = QuestConfig.ranks;
    const next   = ranks[curIdx + 1];
    if (!next) return null;  // Уже S-ранг
    return { rankKey: next.key, rankLabel: next.label, rankColor: next.color, ...RANK_REQUIREMENTS[next.key] };
  }

  // Проверить: достаточно ли XP и частей для повышения
  function canRankUp() {
    const req = getNextRankRequirement();
    if (!req) return { can: false, reason: 'Максимальный ранг достигнут' };

    const next = QuestConfig.ranks[GuildSystem.getRankIdx() + 1];
    if (GuildSystem.getGuildXp() < next.xpNeeded) {
      return { can: false, reason: `Недостаточно GXP (нужно ${next.xpNeeded})` };
    }

    // Проверить наличие частей в инвентаре
    const missing = [];
    for (const part of req.parts) {
      const inInv = State.inventory.filter(i => i.templateId === part.templateId || (i.id && i.id.startsWith(part.templateId)));
      const total = inInv.reduce((s, i) => s + (i.count || 1), 0);
      if (total < part.count) {
        missing.push({ ...part, have: total });
      }
    }

    if (missing.length > 0) {
      return { can: false, reason: 'Нет требуемых частей вожака', missing };
    }

    return { can: true, req };
  }

  // Выполнить повышение ранга: списать части, применить ранг
  function executeRankUp() {
    const check = canRankUp();
    if (!check.can) {
      UISystem.showToast(`⚠️ ${check.reason}`);
      return false;
    }

    const req = check.req;

    // Списать части из инвентаря
    for (const part of req.parts) {
      let toConsume = part.count;
      for (let i = State.inventory.length - 1; i >= 0 && toConsume > 0; i--) {
        const item = State.inventory[i];
        if (!(item.templateId === part.templateId || (item.id && item.id.startsWith(part.templateId)))) continue;
        const have = item.count || 1;
        if (have <= toConsume) {
          toConsume -= have;
          State.removeFromInventory(i);
        } else {
          item.count -= toConsume;
          toConsume = 0;
        }
      }
    }

    // Принудительно установить новый ранг через внутренний метод GuildSystem
    const newIdx = GuildSystem.getRankIdx() + 1;
    const needed = QuestConfig.ranks[newIdx].xpNeeded;
    // Убедиться что XP достаточно (на случай если gap)
    if (GuildSystem.getGuildXp() < needed) {
      // Добавить XP напрямую (обходя addGuildXp чтобы не было тоста)
      GuildSystem.addGuildXp(needed - GuildSystem.getGuildXp());
    }
    GuildSystem._forceSetRank(newIdx);

    const newRank = GuildSystem.getRank();
    UISystem.showToast(`🏆 Ранг гильдии повышен до ${newRank.key}!`);
    UISystem.log(`🏆 Повышение ранга гильдии → ${newRank.key} (части тел вожака сданы)`, 'lc');
    SaveSystem.autosave();
    EventBus.emit('guild:rankUpManual', { rankIdx: GuildSystem.getRankIdx(), rank: newRank });
    return true;
  }

  // Отрендерить UI панели повышения ранга (вставляется в GuildRenderSystem)
  function renderRankUpPanel() {
    const req = getNextRankRequirement();

    if (!req) {
      return `<div style="padding:12px;text-align:center;font-size:12px;color:var(--gold-lt);">👑 Достигнут максимальный ранг S!</div>`;
    }

    const nextRankData = QuestConfig.ranks[GuildSystem.getRankIdx() + 1];
    const gxp     = GuildSystem.getGuildXp();
    const xpOk    = gxp >= nextRankData.xpNeeded;
    const rankIcon = { E:'🔰',D:'🥉',C:'🥈',B:'🥇',A:'💎',S:'👑' }[req.rankKey] || '🔰';

    // Parts status
    let partsHtml = '';
    let allPartsOk = true;
    for (const part of req.parts) {
      const inInv = State.inventory.filter(i => i.templateId === part.templateId || (i.id && i.id.startsWith(part.templateId)));
      const have  = inInv.reduce((s, i) => s + (i.count || 1), 0);
      const ok    = have >= part.count;
      if (!ok) allPartsOk = false;
      partsHtml += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-radius:5px;background:rgba(0,0,0,.25);margin-bottom:3px;">
          <span style="font-size:12px;">${part.ico} ${part.label}</span>
          <span style="font-size:11px;font-weight:700;color:${ok ? 'var(--green)' : 'var(--red-lt)'};">${have}/${part.count} ${ok ? '✓' : '✗'}</span>
        </div>`;
    }

    const canGo = xpOk && allPartsOk;
    const btnStyle = canGo
      ? 'background:linear-gradient(135deg,var(--gold-dk),var(--gold));color:#000;font-weight:900;'
      : 'background:#1a1612;color:var(--muted);opacity:.55;pointer-events:none;';

    return `
      <div style="background:var(--card);border:2px solid ${req.rankColor};border-radius:12px;padding:12px 14px;margin:0 0 10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:22px;">${rankIcon}</span>
          <div>
            <div style="font-size:13px;font-weight:900;color:${req.rankColor};">Повышение до ранга ${req.rankKey}</div>
            <div style="font-size:10px;color:var(--muted);">${req.bossHint}</div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.8px;">Части тела вожака</div>
        ${partsHtml}
        <div style="margin-top:8px;padding:6px 8px;border-radius:5px;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:var(--muted);">✨ GXP</span>
          <span style="font-size:11px;font-weight:700;color:${xpOk ? 'var(--green)' : 'var(--red-lt)'};">${gxp}/${nextRankData.xpNeeded} ${xpOk ? '✓' : '✗'}</span>
        </div>
        <button id="guild-rankup-btn" style="width:100%;margin-top:10px;padding:12px;border-radius:8px;border:none;font-family:inherit;font-size:13px;cursor:pointer;min-height:44px;letter-spacing:.5px;${btnStyle}">
          ${canGo ? `${rankIcon} Сдать трофеи и повыситься` : '🔒 Требования не выполнены'}
        </button>
      </div>`;
  }

  // Bind click на кнопку повышения ранга
  function bindRankUpBtn() {
    const btn = document.getElementById('guild-rankup-btn');
    if (!btn || btn._grBound) return;
    btn._grBound = true;
    btn.addEventListener('click', () => {
      executeRankUp();
      // Перерисовать вкладку гильдии
      if (typeof GuildRenderSystem !== 'undefined') GuildRenderSystem.render();
    });
  }

  // EventBus: при изменении инвентаря или гильдии — перерисовать если вкладка открыта
  EventBus.on('inventory:changed', () => {
    const tab = document.querySelector('.guild-tab[data-gtab="rankup"]');
    if (tab && tab.classList.contains('on') && typeof GuildRenderSystem !== 'undefined') {
      GuildRenderSystem.render();
    }
  });

  return { getNextRankRequirement, canRankUp, executeRankUp, renderRankUpPanel, bindRankUpBtn, RANK_REQUIREMENTS };
})();
